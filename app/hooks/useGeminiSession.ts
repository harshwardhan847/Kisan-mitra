import { useState, useRef, useEffect, useCallback } from "react";
import {
  Behavior,
  FunctionResponseScheduling,
  GoogleGenAI,
  Modality,
} from "@google/genai";
import { decode, decodeAudioData } from "~/utils/audio";
import {
  formatDateToDDMMYYYY,
  getMarketData,
  marketDataFunctionDeclaration,
} from "tools/getMarketData";
import { useLanguage } from "../context/LanguageContext";
import {
  compareStateMarketData,
  compareStateMarketDataFunctionDeclaration,
} from "tools/compareMandiPrices";
import {
  getGovernmentSchemes,
  getGovernmentSchemesFunctionDeclaration,
} from "tools/getGovernmentSchemes";
import {
  diagnoseCropDisease,
  diagnoseCropDiseaseFunctionDeclaration,
  type CropDiseaseDiagnosis,
} from "tools/diagnoseCropDisease";
import type { ToolResponse } from "~/components/DashboardView";
import type { PreviousChats } from "~/types/tool_types";

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
  onMarketDataReceived: (data: ToolResponse) => void;
  previousChats: PreviousChats;
  setLoading?: (loading: { active: boolean; toolName?: string }) => void;
  onRequestImageForDiagnosis?: (cb: (image: string) => void) => void; // <-- AGENT-DRIVEN
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
  onRequestImageForDiagnosis, // <-- AGENT-DRIVEN
  previousChats,
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
    // const model = "gemini-2.5-flash-preview-native-audio-dialog";

    const systemInstructions = `You are **Kisan Mitra**, a multilingual AI agent built to assist Indian farmers across all states in their native or preferred languages.
    currently talk me with ${currentLanguage} language

🗓️ Today’s Date: {{current_date}}  
🕒 Local Time: {{current_time}} IST  
*Use this date context to resolve relative expressions like “today,” “yesterday,” “last week,” etc.*

Your mission is to:
1. Guide farmers with accurate market price data and selling suggestions.
2. Recommend suitable government schemes like subsidies, insurance, or loan offers.
3. Diagnose crop diseases from diagnose_crop_disease tool and suggest cures (image will be taken after tool call).

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
4. \`diagnose_crop_disease(no parameter's required. image will be taken after tool call)\`
You can use multiple tool at once or get response from one tool if required by another tool and then use the tool result for another tool. you can keep using the required tool until required output is generated
Don't wait for user confirmation for calling Tool. Call tool automatically without asking for confirmation.
If user Ask's to know where he should sell it's crop. Then deeply analyze the market data of last 10 days (if user don't specify) of his district and nearby districts. You can search for nearby States as well for more reliable prediction and suggestions.
Always give a final action for the Farmer. Like a Fixed State or district to sell the crop. Don't say like this is best but check once.
If there is a problem with the farmer's image immediately call the diagnose_crop_disease tool without needed any conversation and say farmer to upload an image on the opened modal.
🔁 Interaction Guidelines:
- Today's date is :- ${formatDateToDDMMYYYY(new Date())}
- Resolve time-relative phrases using today's date (e.g., “yesterday” = {{current_date - 1 day}})
- Break complex responses into steps or bullet points.
- End with a clear suggestion or next action.

You are not a chatbot — you are a dependable, trusted digital assistant for a farmer’s livelihood.
keep the conversation short and to the point like a real chat.
Don't say more than 3 lines until very necessary.
Give all the results in ${currentLanguage} language.
no matter what the previous language of conversation was now you have to talk in ${currentLanguage}
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
            const thoughtSignature = message.serverContent?.thoughtSignature;
            // set grounding metadata

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
              const functionResponses: any[] = [];

              await Promise.all(
                toolCall.functionCalls.map(async (fc: any) => {
                  let toolResult: any;
                  console.log("Tool Name", fc.name, fc.id);
                  switch (fc.name) {
                    case "get_market_data":
                      if (
                        fc.args &&
                        typeof fc.args.commodityName === "string"
                      ) {
                        toolResult = await getMarketData(
                          fc.args.commodityName,
                          fc.args.state,
                          fc.args.district,
                          fc.args.market,
                          fc.args.arrivalDate,
                          fc.args.startDate,
                          fc.args.endDate,
                          previousChats,
                          currentLanguage
                        );
                        onMarketDataReceived(toolResult);
                      } else {
                        toolResult = {
                          error:
                            "Missing or invalid 'commodityName' argument for get_market_data.",
                        };
                        onMarketDataReceived(toolResult);
                      }
                      break;
                    case "compare_state_market_data":
                      if (
                        fc.args &&
                        typeof fc.args.commodityName === "string" &&
                        (Array.isArray(fc.args.states) ||
                          Array.isArray(fc.args.district))
                      ) {
                        const regions =
                          Array.isArray(fc.args.states) &&
                          fc.args.states.length > 0
                            ? fc.args.states
                            : fc.args.district;
                        toolResult = await compareStateMarketData(
                          fc.args.commodityName,
                          regions,
                          fc.args.arrivalDate,
                          fc.args.startDate,
                          fc.args.endDate,
                          previousChats,
                          currentLanguage
                        );
                        onMarketDataReceived(toolResult);
                      } else {
                        toolResult = {
                          error:
                            "Missing or invalid arguments for compare_state_market_data. Must provide commodityName and at least one of states or district.",
                        };
                        onMarketDataReceived(toolResult);
                      }
                      break;
                    case "get_government_schemes":
                      if (
                        fc.args &&
                        typeof fc.args.query === "string" &&
                        typeof fc.args.location === "string"
                      ) {
                        toolResult = await getGovernmentSchemes(
                          fc.args.query,
                          fc.args.location,
                          currentLanguage,
                          previousChats
                        );
                      } else {
                        toolResult = {
                          error:
                            "Missing or invalid arguments for get_government_schemes. Must provide query and location.",
                        };
                      }
                      onMarketDataReceived(toolResult);
                      break;
                    case "diagnose_crop_disease":
                      if (onRequestImageForDiagnosis) {
                        // Defer execution to UI for image capture
                        await new Promise<void>((resolve) => {
                          onRequestImageForDiagnosis(async (image: string) => {
                            if (!image) return;
                            try {
                              const toolResult = await diagnoseCropDisease(
                                image,
                                currentLanguage,
                                previousChats
                              );
                              onMarketDataReceived(toolResult);
                              functionResponses.push({
                                id: fc.id,
                                name: fc.name,
                                response: {
                                  result: toolResult,
                                  scheduling:
                                    FunctionResponseScheduling.INTERRUPT, // allow Gemini to continue thinking
                                },
                              });
                            } catch (err) {
                              functionResponses.push({
                                id: fc.id,
                                name: fc.name,
                                response: {
                                  result: { error: "Image diagnosis failed." },
                                  scheduling:
                                    FunctionResponseScheduling.INTERRUPT,
                                },
                              });
                            }
                            resolve(); // resume tool call chain
                          });
                        });
                        break; // move to next tool call
                      } else if (fc.args && typeof fc.args.image === "string") {
                        if (!fc.args.image) return;
                        const toolResult = await diagnoseCropDisease(
                          fc.args.image,
                          currentLanguage,
                          previousChats
                        );
                        onMarketDataReceived(toolResult);
                        functionResponses.push({
                          id: fc.id,
                          name: fc.name,
                          response: {
                            result: toolResult,
                            scheduling: FunctionResponseScheduling.INTERRUPT,
                          },
                        });
                      } else {
                        const toolResult = {
                          error:
                            "Missing or invalid arguments for diagnose_crop_disease. Must provide image.",
                        };
                        onMarketDataReceived(toolResult);
                        functionResponses.push({
                          id: fc.id,
                          name: fc.name,
                          response: {
                            result: toolResult,
                            scheduling: FunctionResponseScheduling.INTERRUPT,
                          },
                        });
                      }
                      break;
                    default:
                      toolResult = { error: `Unknown tool: ${fc.name}` };
                      onMarketDataReceived(toolResult);
                  }
                  functionResponses.push({
                    id: fc.id,
                    name: fc.name,
                    response: {
                      result: toolResult,
                      scheduling: FunctionResponseScheduling.INTERRUPT,
                    },
                  });
                })
              );

              if (setLoading) setLoading({ active: false });
              await sessionRef.current?.sendToolResponse({
                functionResponses: functionResponses,
                thoughtSignature,
              });
              return; // Stop processing further if a tool call was handled
            }

            // --- AI IMAGE REQUEST DETECTION LOGIC ---
            // If the AI is asking for an image for diagnosis, trigger the modal immediately

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
                {
                  ...marketDataFunctionDeclaration,
                  behavior: Behavior.NON_BLOCKING,
                },
                compareStateMarketDataFunctionDeclaration,
                getGovernmentSchemesFunctionDeclaration,
                diagnoseCropDiseaseFunctionDeclaration,
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
