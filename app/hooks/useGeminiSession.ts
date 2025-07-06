import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "~/utils/audio";
import {
  formatDateToDDMMYYYY,
  getMarketData,
  marketDataFunctionDeclaration,
  type MarketDataResult,
} from "tools/getMarketData";
import { useLanguage } from "../context/LanguageContext";
import {
  compareStateMarketData,
  compareStateMarketDataFunctionDeclaration,
} from "tools/compareMandiPrices";

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
  setLoading?: (loading: { active: boolean; toolName?: string }) => void;
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
  setLoading,
}: UseGeminiSessionProps): GeminiSessionHook => {
  const { currentLanguage } = useLanguage();
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

    const systemInstructions = `You are **Kisan Mitra**, a multilingual AI agent built to assist Indian farmers across all states in their native or preferred languages.

🗓️ Today’s Date: {{current_date}}  
🕒 Local Time: {{current_time}} IST  
*Use this date context to resolve relative expressions like “today,” “yesterday,” “last week,” etc.*

Your mission is to:
1. Guide farmers with accurate market price data and selling suggestions.
2. Recommend suitable government schemes like subsidies, insurance, or loan offers.
3. Diagnose crop diseases from uploaded images and suggest cures.

💬 Language Guidelines:
- Always reply in the language **explicitly selected by the user**, or infer from the input language.
- Use **regionally familiar agricultural terms**, idioms, and names of crops/tools.
- Use **simple, practical, and respectful** tone for all explanations.
- If technical terms don’t have a translation, **include both native term and English in brackets**.

🌍 Cultural & Regional Guidelines:
- Take into account Indian regional diversity, seasons, crop cycles, and practices (e.g., Kharif/Rabi).
- Be mindful of **local measurement units** (e.g., quintal, acre, bigha).
- Prioritize **official data** from Indian ministries, state portals, and **APMC** mandis.

🎯 Functional Tools (Use as Needed):
1. \`get_market_data(commodityName: string, state?: string, district?: string, market?: string, arrivalDate?: string, startDate?: string, endDate?: string)\`
2. \`compare_state_market_data(commodityName: string, states?: string[], district?: string[], arrivalDate?: string, startDate?: string, endDate?: string)\`
3. \`get_government_schemes(query: str, location: str)\`  
4. \`diagnose_crop_disease(image: binary | URL)\`


🔁 Interaction Guidelines:
- Today's date is :- ${formatDateToDDMMYYYY(new Date())}
- Resolve time-relative phrases using today's date (e.g., “yesterday” = {{current_date - 1 day}})
- Break complex responses into steps or bullet points.
- End with a clear suggestion or next action.

You are not a chatbot — you are a dependable, trusted digital assistant for a farmer’s livelihood.
keep the conversation concise and to the point like a real chat.

`;

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
              if (setLoading)
                setLoading({
                  active: true,
                  toolName: toolCall.functionCalls?.[0]?.name || "Tool",
                });
              const functionResponses = [];
              for (const fc of toolCall.functionCalls) {
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
                    onMarketDataReceived(toolResult);
                  } else {
                    toolResult = {
                      error:
                        "Missing or invalid 'commodityName' argument for get_market_data.",
                    };
                    onMarketDataReceived(toolResult);
                  }
                } else if (fc.name === "compare_state_market_data") {
                  if (
                    fc.args &&
                    typeof fc.args.commodityName === "string" &&
                    (Array.isArray(fc.args.states) ||
                      Array.isArray(fc.args.district))
                  ) {
                    const regions =
                      Array.isArray(fc.args.states) && fc.args.states.length > 0
                        ? fc.args.states
                        : fc.args.district;
                    toolResult = await compareStateMarketData(
                      fc.args.commodityName,
                      regions,
                      fc.args.arrivalDate,
                      fc.args.startDate,
                      fc.args.endDate
                    );
                    onMarketDataReceived(toolResult);
                  } else {
                    toolResult = {
                      error:
                        "Missing or invalid arguments for compare_state_market_data. Must provide commodityName and at least one of states or district.",
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
              if (setLoading) setLoading({ active: false });
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
            languageCode: currentLanguage, // Use language from context
          },
          tools: [
            {
              googleSearch: {},
              functionDeclarations: [
                marketDataFunctionDeclaration,
                compareStateMarketDataFunctionDeclaration,
              ],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemInstructions }],
          },
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
    currentLanguage, // Add as dependency
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
