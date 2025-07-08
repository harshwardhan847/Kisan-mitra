// getGovernmentSchemes.ts
import { useLanguage } from "../app/context/LanguageContext";
import { GoogleGenAI, Type } from "@google/genai";

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
  language: string = "hi-IN"
): Promise<GovernmentSchemesResult> {
  const geminiApiKey: string = import.meta.env.VITE_GENERATIVE_API_KEY;
  // --- Gemini AI Analysis to generate summary/trends ---
  let aiResult: { summary?: string; schemes?: any[] } = {};
  let aiSummary =
    "No specific market insights could be generated for the provided data range/date.";

  // SHORT, CONVERSATIONAL PROMPT
  const prompt = `You are an expert agricultural advisor for the Indian government.

You will use this information to explain relevant government schemes in simple terms, list eligibility requirements, and provide direct links to application portals.

Provide the response in ${language}.

Query: ${query} 
${location ? `in this location ${location}` : ""}
`;
  try {
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash", // Using a faster model for text generation
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        // tools: [{ googleSearch: {} }],

        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
            },
            schemes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                  },
                  summary: {
                    type: Type.STRING,
                  },
                  eligibility: {
                    type: Type.STRING,
                  },
                  applicationLink: {
                    type: Type.STRING,
                  },
                },
                propertyOrdering: ["summary", "schemes"],
              },
            },
          },
        },
      },

      // generationConfig is not supported, so only language in prompt
    });

    // Correctly access the generated text from the response
    console.log(result.data);
    console.log(result.text);
    aiResult = result.text as {}; // Use .text() for the actual string content
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
