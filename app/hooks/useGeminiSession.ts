import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "~/utils/audio";
import {
  getMarketData,
  marketDataFunctionDeclaration,
  type MarketDataResult,
} from "tools/getMarketData";

// Define the interface for search results, moved here as it's directly used.
interface SearchResult {
  uri: string;
  title: string;
}

interface UseGeminiSessionProps {
  apiKey: string;
  outputAudioContext: AudioContext | null;
  outputNode: GainNode | null;
  nextStartTimeRef: React.MutableRefObject<number>;
  updateStatus: (msg: string) => void;
  updateError: (msg: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  onMarketDataReceived: (data: MarketDataResult) => void;
}

interface GeminiSessionHook {
  session: any | null;
  resetSession: () => void;
  searchResults: SearchResult[];
}

export const useGeminiSession = ({
  apiKey,
  outputAudioContext,
  outputNode,
  nextStartTimeRef,
  updateStatus,
  updateError,
  setSearchResults,
  onMarketDataReceived,
}: UseGeminiSessionProps): GeminiSessionHook => {
  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const [currentSearchResults, setCurrentSearchResults] = useState<
    SearchResult[]
  >([]);

  const initSession = useCallback(async () => {
    if (!outputAudioContext || !outputNode) {
      // Don't initialize session until audio contexts/nodes are ready
      return;
    }

    clientRef.current = new GoogleGenAI({ apiKey });
    const model = "gemini-live-2.5-flash-preview";

    try {
      const session = await clientRef.current?.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            updateStatus("Opened");
          },
          onmessage: async (message: any) => {
            const modelTurn = message.serverContent?.modelTurn;
            const interrupted = message.serverContent?.interrupted;
            const toolCall = message.toolCall;

            // Handle search results (grounding metadata)
            if (
              message.serverContent?.groundingMetadata?.groundingChunks?.length
            ) {
              setCurrentSearchResults(
                message.serverContent.groundingMetadata.groundingChunks
                  .map((chunk: any) => chunk.web)
                  .filter(
                    (web: any): web is SearchResult => !!(web?.uri && web.title)
                  )
              );
            } else {
              setCurrentSearchResults([]);
            }

            // Handle tool calls
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
                    toolResult = await getMarketData(
                      fc.args.commodityName,
                      fc.args.state,
                      fc.args.district,
                      fc.args.market,
                      fc.args.arrivalDate,
                      fc.args.startDate,
                      fc.args.endDate
                    );
                    console.log("getMarketData Tool Result:", toolResult);
                    onMarketDataReceived(toolResult);
                  } else {
                    toolResult = {
                      error:
                        "Missing or invalid 'commodityName' argument for get_market_data.",
                    };
                    onMarketDataReceived(toolResult);
                  }
                } else {
                  toolResult = { error: `Unknown tool: ${fc.name}` };
                  onMarketDataReceived(toolResult);
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
              return; // Stop processing further if a tool call was handled
            }

            // Handle audio playback
            const audio = modelTurn?.parts[0]?.inlineData;
            if (audio && outputAudioContext) {
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContext.currentTime
              );

              try {
                const audioBuffer = await decodeAudioData(
                  decode(audio.data),
                  outputAudioContext,
                  24000,
                  1
                );
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);

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

            // Handle interruption
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
  }, [
    apiKey,
    outputAudioContext,
    outputNode,
    nextStartTimeRef,
    updateStatus,
    updateError,
    onMarketDataReceived,
  ]);

  useEffect(() => {
    initSession(); // Initialize session on mount or when dependencies change

    return () => {
      sessionRef.current?.close(); // Cleanup session on unmount
    };
  }, [initSession]);

  const resetSession = useCallback(() => {
    sessionRef.current?.close(); // Close current session
    setCurrentSearchResults([]); // Clear search results
    updateStatus("Session cleared and re-initializing...");
    initSession(); // Re-initialize a new session
  }, [initSession, updateStatus]);

  // Expose currentSearchResults via the hook's return value
  useEffect(() => {
    setSearchResults(currentSearchResults);
  }, [currentSearchResults, setSearchResults]);

  return {
    session: sessionRef.current,
    resetSession,
    searchResults: currentSearchResults,
  };
};
