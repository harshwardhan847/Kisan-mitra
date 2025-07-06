import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai"; // Session and LiveServerMessage are types, not directly imported as values

import type { Blob } from "@google/genai";
import {
  getMarketData,
  marketDataFunctionDeclaration,
} from "tools/getMarketData";
// Define the interface for search results
interface SearchResult {
  uri: string;
  title: string;
}

function encode(bytes: any) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: any) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: "audio/pcm;rate=16000",
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate
  );

  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }
  // Extract interleaved channels
  if (numChannels === 0) {
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter(
        (_, index) => index % numChannels === i
      );
      buffer.copyToChannel(channel, i);
    }
  }

  return buffer;
}

const LiveAudio: React.FC = () => {
  // State variables for UI updates
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Refs for mutable objects that don't trigger re-renders
  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any | null>(null); // Using 'any' for session due to complex type
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  // NEW: Ref to track recording state for onaudioprocess callback
  const isRecordingRef = useRef(false);

  // State for nodes passed to the visualizer (these need to be reactive)
  const [inputNode, setInputNode] = useState<GainNode | null>(null);
  const [outputNode, setOutputNode] = useState<GainNode | null>(null);

  // Memoized callback for updating status
  const updateStatus = useCallback((msg: string) => {
    setStatus(msg);
  }, []);

  // Memoized callback for updating error
  const updateError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  // Initialize audio contexts and gain nodes
  useEffect(() => {
    inputAudioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)({ sampleRate: 24000 });

    const inputGain = inputAudioContextRef.current.createGain();
    const outputGain = outputAudioContextRef.current.createGain();
    setInputNode(inputGain);
    setOutputNode(outputGain);

    outputGain.connect(outputAudioContextRef.current.destination);

    nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

    // Cleanup function for audio contexts
    return () => {
      inputAudioContextRef.current?.close();
      outputAudioContextRef.current?.close();
    };
  }, []); // Run once on mount

  // Initialize Gemini client and session
  useEffect(() => {
    if (!inputNode || !outputNode) return; // Wait for audio nodes to be initialized

    clientRef.current = new GoogleGenAI({
      apiKey: "AIzaSyDCqasCwuuhtwiV20TpD0AgzqaYV4elT-U", // Use REACT_APP_ prefix for client-side env vars
    });

    const initSession = async () => {
      // const model = "gemini-2.5-flash-preview-native-audio-dialog";
      const model = "gemini-live-2.5-flash-preview";

      try {
        const session = await clientRef.current?.live.connect({
          model: model,
          callbacks: {
            onopen: () => {
              updateStatus("Opened");
            },
            onmessage: async (message: any) => {
              // Use 'any' for LiveServerMessage for simplicity here
              const modelTurn = message.serverContent?.modelTurn;
              const interrupted = message.serverContent?.interrupted;
              const toolCall = message.toolCall;
              if (
                message.serverContent?.groundingMetadata?.groundingChunks
                  ?.length
              ) {
                setSearchResults(
                  message.serverContent.groundingMetadata.groundingChunks
                    .map((chunk: any) => chunk.web)
                    .filter(
                      (web: any): web is SearchResult =>
                        !!(web?.uri && web.title)
                    )
                );
              } else {
                setSearchResults([]); // Clear search results if none provided
              }

              if (toolCall) {
                const functionResponses = [];
                for (const fc of toolCall.functionCalls) {
                  console.log(
                    `Model called tool: ${fc.name} with args:`,
                    fc.args
                  );
                  let toolResult: any;

                  // Execute the appropriate tool function based on fc.name
                  if (fc.name === "get_price_details") {
                    if (fc.args && typeof fc.args.product_name === "string") {
                      toolResult = getMarketData(fc.args.product_name);
                    } else {
                      toolResult = {
                        error:
                          "Missing or invalid 'cropName' argument for get_price_details.",
                      };
                    }
                  } else {
                    toolResult = { error: `Unknown tool: ${fc.name}` };
                  }

                  functionResponses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: toolResult }, // Send the result back
                  });
                }
                console.debug("Sending tool response...\n", functionResponses);
                sessionRef.current?.sendToolResponse({
                  functionResponses: functionResponses,
                });
                return; // Important: Don't process audio/text if it was a tool call
              }
              // --- End Tool Call Handling ---

              const audio = modelTurn?.parts[0]?.inlineData;

              if (audio && outputAudioContextRef.current) {
                nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  outputAudioContextRef.current.currentTime
                );

                try {
                  const audioBuffer = await decodeAudioData(
                    decode(audio.data),
                    outputAudioContextRef.current,
                    24000,
                    1
                  );
                  const source =
                    outputAudioContextRef.current.createBufferSource();
                  source.buffer = audioBuffer;
                  if (outputNode) {
                    source.connect(outputNode); // Connect to the reactive outputNode
                  }
                  source.addEventListener("ended", () => {
                    sourcesRef.current.delete(source);
                  });

                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current =
                    nextStartTimeRef.current + audioBuffer.duration;
                  sourcesRef.current.add(source);
                } catch (audioDecodeError: any) {
                  console.error(
                    "Error decoding or playing audio:",
                    audioDecodeError
                  );
                  updateError(
                    `Audio playback error: ${audioDecodeError.message}`
                  );
                }
              }

              if (interrupted) {
                for (const source of sourcesRef.current.values()) {
                  source.stop();
                  sourcesRef.current.delete(source);
                }
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e: ErrorEvent) => {
              updateError(e.message);
            },
            onclose: (e: CloseEvent) => {
              console.log(e);
              updateStatus("Close:" + e.reason);
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } },
              // languageCode: 'en-GB' // Uncomment if you need a specific language
            },
            tools: [
              {
                googleSearch: {},
                functionDeclarations: [marketDataFunctionDeclaration],
              },
            ],
          },
        });
        sessionRef.current = session;
      } catch (e: any) {
        console.error(e);
        updateError(`Session connection error: ${e.message}`);
      }
    };

    initSession();

    // Cleanup function for the session
    return () => {
      sessionRef.current?.close();
    };
  }, [inputNode, outputNode, updateStatus, updateError]); // Re-run if input/output nodes change

  // Start Recording
  const startRecording = async () => {
    if (isRecording || !inputAudioContextRef.current || !inputNode) {
      return;
    }

    inputAudioContextRef.current.resume();
    updateStatus("Requesting microphone access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      mediaStreamRef.current = stream;

      updateStatus("Microphone access granted. Starting capture...");

      const sourceNode =
        inputAudioContextRef.current.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;
      sourceNode.connect(inputNode); // Connect to the reactive inputNode

      const bufferSize = 256;
      const scriptProcessorNode =
        inputAudioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorNodeRef.current = scriptProcessorNode;

      // Set ref BEFORE updating state, so onaudioprocess sees the correct value immediately
      isRecordingRef.current = true;
      setIsRecording(true);

      scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        // Use the ref here to get the most current recording status
        if (!isRecordingRef.current) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        sessionRef.current?.sendRealtimeInput({ media: createBlob(pcmData) });
      };

      sourceNode.connect(scriptProcessorNode);
      scriptProcessorNode.connect(inputAudioContextRef.current.destination);

      updateStatus("🔴 Recording... Capturing PCM chunks.");
    } catch (err: any) {
      console.error("Error starting recording:", err);
      updateStatus(`Error: ${err.message}`);
      stopRecording(); // Attempt to stop if error occurs
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (
      !isRecording &&
      !mediaStreamRef.current &&
      !inputAudioContextRef.current
    )
      return;

    updateStatus("Stopping recording...");

    // Set ref BEFORE updating state
    isRecordingRef.current = false;
    setIsRecording(false); // Update state

    if (
      scriptProcessorNodeRef.current &&
      sourceNodeRef.current &&
      inputAudioContextRef.current
    ) {
      scriptProcessorNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    scriptProcessorNodeRef.current = null;
    sourceNodeRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    updateStatus("Recording stopped. Click Start to begin again.");
  };

  // Reset Session
  const reset = () => {
    sessionRef.current?.close();
    // Re-initialize session by triggering useEffect (or re-calling initSession if it were exposed)
    // For simplicity, we'll re-connect the client which will re-init the session.
    // In a real app, you might want a more controlled re-init.
    if (clientRef.current) {
      // Re-initialize the session directly
      const initSessionAgain = async () => {
        const model = "gemini-2.5-flash-preview-native-audio-dialog";
        try {
          const newSession = await clientRef.current?.live.connect({
            model: model,
            callbacks: {
              onopen: () => updateStatus("Opened (re-initialized)"),
              onmessage: async (message: any) => {
                const modelTurn = message.serverContent?.modelTurn;
                const interrupted = message.serverContent?.interrupted;

                if (
                  message.serverContent?.groundingMetadata?.groundingChunks
                    ?.length
                ) {
                  setSearchResults(
                    message.serverContent.groundingMetadata.groundingChunks
                      .map((chunk: any) => chunk.web)
                      .filter(
                        (web: any): web is SearchResult =>
                          !!(web?.uri && web.title)
                      )
                  );
                } else {
                  setSearchResults([]);
                }

                const audio = modelTurn?.parts[0]?.inlineData;
                if (audio && outputAudioContextRef.current) {
                  nextStartTimeRef.current = Math.max(
                    nextStartTimeRef.current,
                    outputAudioContextRef.current.currentTime
                  );
                  try {
                    const audioBuffer = await decodeAudioData(
                      decode(audio.data),
                      outputAudioContextRef.current,
                      24000,
                      1
                    );
                    const source =
                      outputAudioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    if (outputNode) {
                      source.connect(outputNode);
                    }
                    source.addEventListener("ended", () => {
                      sourcesRef.current.delete(source);
                    });
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current =
                      nextStartTimeRef.current + audioBuffer.duration;
                    sourcesRef.current.add(source);
                  } catch (audioDecodeError: any) {
                    console.error(
                      "Error decoding or playing audio (re-init):",
                      audioDecodeError
                    );
                    updateError(
                      `Audio playback error (re-init): ${audioDecodeError.message}`
                    );
                  }
                }
                if (interrupted) {
                  for (const source of sourcesRef.current.values()) {
                    source.stop();
                    sourcesRef.current.delete(source);
                  }
                  nextStartTimeRef.current = 0;
                }
              },
              onerror: (e: ErrorEvent) => updateError(e.message),
              onclose: (e: CloseEvent) =>
                updateStatus("Close (re-init):" + e.reason),
            },
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } },
              },
              tools: [{ googleSearch: {} }],
            },
          });
          sessionRef.current = newSession;
        } catch (e: any) {
          console.error("Error re-initializing session:", e);
          updateError(`Session re-init error: ${e.message}`);
        }
      };
      initSessionAgain();
    }

    setSearchResults([]);
    updateStatus("Session cleared and re-initialized.");
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* Search Results Display */}
      {searchResults.length > 0 && (
        <div
          id="search-results"
          className="absolute top-5 left-5 z-10 bg-gray-800 bg-opacity-70 p-4 rounded-xl max-w-sm border border-gray-700 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-2 text-blue-300">Sources</h3>
          <ul className="list-none p-0 m-0">
            {searchResults.map((result, index) => (
              <li key={index} className="mb-2 last:mb-0">
                <a
                  href={result.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline text-sm block"
                >
                  {result.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center gap-4 z-10">
        <div className="flex space-x-4">
          <button
            id="resetButton"
            onClick={reset}
            disabled={isRecording}
            aria-label="Reset Session"
            className="p-4 rounded-full bg-gray-700 text-white shadow-lg hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#ffffff"
            >
              <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>
          <button
            id="startButton"
            onClick={startRecording}
            disabled={isRecording}
            aria-label="Start Recording"
            className="p-4 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#ffffff"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="50" />
            </svg>
          </button>
          <button
            id="stopButton"
            onClick={stopRecording}
            disabled={!isRecording}
            aria-label="Stop Recording"
            className="p-4 rounded-full bg-gray-300 text-gray-800 shadow-lg hover:bg-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#000000"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="0" y="0" width="100" height="100" rx="15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div
        id="status"
        className="absolute bottom-5 left-0 right-0 z-10 text-center text-lg font-medium text-blue-300"
      >
        {error ? `Error: ${error}` : status}
      </div>

      {/* 3D Visualizer Component */}
      {inputNode && outputNode && (
        <div>Visualizing</div>
        // <gdm-live-audio-visuals-3d
        //   .inputNode=${inputNode}
        //   .outputNode=${outputNode}
        // ></gdm-live-audio-visuals-3d>
      )}
    </div>
  );
};

export default LiveAudio;
