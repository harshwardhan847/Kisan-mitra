import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";

import type { Blob } from "@google/genai";
import {
  getMarketData,
  marketDataFunctionDeclaration,
} from "tools/getMarketData";

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
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isRecordingRef = useRef(false);

  const [inputNode, setInputNode] = useState<GainNode | null>(null);
  const [outputNode, setOutputNode] = useState<GainNode | null>(null);

  const updateStatus = useCallback((msg: string) => {
    setStatus(msg);
  }, []);

  const updateError = useCallback((msg: string) => {
    setError(msg);
  }, []);

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

    return () => {
      inputAudioContextRef.current?.close();
      outputAudioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!inputNode || !outputNode) return;

    clientRef.current = new GoogleGenAI({
      apiKey: "AIzaSyDCqasCwuuhtwiV20TpD0AgzqaYV4elT-U",
    });

    const initSession = async () => {
      const model = "gemini-live-2.5-flash-preview";

      try {
        const session = await clientRef.current?.live.connect({
          model: model,
          callbacks: {
            onopen: () => {
              updateStatus("Opened");
            },
            onmessage: async (message: any) => {
              // Make onmessage async
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
                setSearchResults([]);
              }

              if (toolCall) {
                const functionResponses = [];
                for (const fc of toolCall.functionCalls) {
                  console.log(
                    `Model called tool: ${fc.name} with args:`,
                    fc.args
                  );
                  let toolResult: any;

                  if (fc.name === "get_market_data") {
                    if (fc.args && typeof fc.args.commodityName === "string") {
                      // AWAIT the asynchronous function call here
                      toolResult = await getMarketData(
                        fc.args.commodityName,
                        fc.args.state,
                        fc.args.district,
                        fc.args.market
                      );
                    } else {
                      toolResult = {
                        error:
                          "Missing or invalid 'commodityName' argument for get_market_data.",
                      };
                    }
                  } else {
                    toolResult = { error: `Unknown tool: ${fc.name}` };
                  }

                  functionResponses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: toolResult },
                  });
                }
                console.debug("Sending tool response...\n", functionResponses);
                sessionRef.current?.sendToolResponse({
                  functionResponses: functionResponses,
                });
                return;
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

    return () => {
      sessionRef.current?.close();
    };
  }, [inputNode, outputNode, updateStatus, updateError]);

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
      sourceNode.connect(inputNode);

      const bufferSize = 256;
      const scriptProcessorNode =
        inputAudioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorNodeRef.current = scriptProcessorNode;

      isRecordingRef.current = true;
      setIsRecording(true);

      scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
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
      stopRecording();
    }
  };

  const stopRecording = () => {
    if (
      !isRecording &&
      !mediaStreamRef.current &&
      !inputAudioContextRef.current
    )
      return;

    updateStatus("Stopping recording...");

    isRecordingRef.current = false;
    setIsRecording(false);

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

  const reset = () => {
    sessionRef.current?.close();

    if (clientRef.current) {
      const initSessionAgain = async () => {
        const model = "gemini-live-2.5-flash-preview"; // Use the correct model name
        try {
          const newSession = await clientRef.current?.live.connect({
            model: model,
            callbacks: {
              onopen: () => updateStatus("Opened (re-initialized)"),
              onmessage: async (message: any) => {
                // Make onmessage async here too
                const modelTurn = message.serverContent?.modelTurn;
                const interrupted = message.serverContent?.interrupted;
                const toolCall = message.toolCall; // Capture toolCall here as well

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

                // Add tool call handling for reset as well
                if (toolCall) {
                  const functionResponses = [];
                  for (const fc of toolCall.functionCalls) {
                    console.log(
                      `Model called tool (re-init): ${fc.name} with args:`,
                      fc.args
                    );
                    let toolResult: any;

                    if (fc.name === "get_market_data") {
                      if (
                        fc.args &&
                        typeof fc.args.commodityName === "string"
                      ) {
                        toolResult = await getMarketData(
                          // AWAIT here
                          fc.args.commodityName,
                          fc.args.state,
                          fc.args.district,
                          fc.args.market
                        );
                      } else {
                        toolResult = {
                          error:
                            "Missing or invalid 'commodityName' argument for get_market_data (re-init).",
                        };
                      }
                    } else {
                      toolResult = {
                        error: `Unknown tool (re-init): ${fc.name}`,
                      };
                    }
                    functionResponses.push({
                      id: fc.id,
                      name: fc.name,
                      response: { result: toolResult },
                    });
                  }
                  sessionRef.current?.sendToolResponse({
                    functionResponses: functionResponses,
                  });
                  return;
                }
                // End tool call handling for reset

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
              tools: [
                {
                  googleSearch: {},
                  functionDeclarations: [marketDataFunctionDeclaration], // Ensure tools are re-declared on reset
                },
              ],
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
