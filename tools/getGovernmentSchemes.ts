// getGovernmentSchemes.ts
import { getAIParsedResponse } from "~/utils/ai_parsing";
import { useLanguage } from "../app/context/LanguageContext";
import { GoogleGenAI, Type } from "@google/genai";
import type { MarketDataResult } from "./getMarketData";
import type { PreviousChats } from "~/types/tool_types";

export const getGovernmentSchemesFunctionDeclaration = {
  name: "get_government_schemes",
  description:
    "Fetch relevant government schemes for Indian farmers based on a query and location. Respond in the selected language, using local terms. Return scheme name (local + English), summary, category, and application link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Scheme or benefit query, e.g. 'drip irrigation subsidy'",
      },
      location: {
        type: Type.STRING,
        description: "State, district, or region",
      },
    },
    required: ["query", "location"],
  },
};

export interface GovernmentScheme {
  name: string; // Local + English
  summary: string;
  eligibility: string;
  applicationLink: string;
}

export interface GovernmentSchemesResult {
  summary: string;
  schemes: GovernmentScheme[];
}

// Stub: Replace with real data source or API integration
export async function getGovernmentSchemes(
  query: string,
  location: string,
  language: string = "hi-IN",
  previousChats?: PreviousChats // NEW: pass previous chat data for context
): Promise<GovernmentSchemesResult> {
  const geminiApiKey: string = import.meta.env.VITE_GENERATIVE_API_KEY;
  // --- Gemini AI Analysis to generate summary/trends ---
  let aiResult: { summary?: string; schemes?: any[] } = {};
  let aiSummary =
    "No specific market insights could be generated for the provided data range/date.";

  const chatContext =
    previousChats && previousChats.length > 0
      ? previousChats
          .map((c, i) => `Previous Query #${i + 1}:\n${c?.toString()}`)
          .join("\n\n")
      : "";
  // SHORT, CONVERSATIONAL PROMPT
  const prompt = `${chatContext ? chatContext + "\n\n" : ""}
You are Kisan Mitra, a multilingual AI assistant and expert agricultural advisor for the Indian government.

Today’s Date: ${new Date().toLocaleDateString("en-IN")}
Local Time: ${new Date().toLocaleTimeString("en-IN")} IST

Your task is to find and return only the most relevant **Indian government agricultural schemes** (Central or State-level) based on the following user query:

Query: ${query}
${location ? `Location: ${location}` : ""}

You must:
- Identify appropriate subsidy, loan, insurance, or support schemes.
- Summarize each scheme in simple, understandable language.
- Include eligibility conditions and a direct link to apply (or official info page).
- Prioritize Indian government sources like PMKSY, PMFBY, KCC, NABARD, Agri Department portals, etc.

Respond only in ${language}. Use local agricultural terminology.

🎯 Output must be a **valid JSON** object with this structure:
{
  "summary": "Short overall summary of what was found or suggested",
  "schemes": [
    {
      "name": "Full scheme name in ${language}",
      "summary": "Short description of what it provides",
      "eligibility": "Eligibility criteria or who it applies to",
      "applicationLink": "Direct official link to apply or view details, this should only contain the application link/url to the website. No extra text."
    },
    ...
  ]
}

Do not include any explanation, introduction, or formatting outside of the JSON response.

Respond strictly in valid JSON only.
`;

  try {
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash", // Using a faster model for text generation
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [
          {
            googleSearch: {},
            //  urlContext: {}
          },
        ],
      },

      // generationConfig is not supported, so only language in prompt
    });

    // Correctly access the generated text from the response

    aiResult = getAIParsedResponse(result?.text || "") ?? "{}";

    if (aiResult?.summary) {
      aiSummary = aiResult?.summary ?? "";
    }

    if (!aiSummary.trim()) {
      aiSummary =
        "The AI could not generate specific market insights based on the provided data.";
    }
    console.log("Generated AI Summary (Markdown):", aiSummary);
  } catch (geminiError) {
    console.error("Error generating insights with Gemini:", geminiError);
    aiSummary = `Error analyzing data with AI: Failed to connect to AI service or generate content. Details: ${
      geminiError instanceof Error ? geminiError.message : String(geminiError)
    }`;
  }

  return {
    summary: aiSummary,
    schemes: aiResult?.schemes ?? [],
  };
}
