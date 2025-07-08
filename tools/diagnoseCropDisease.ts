// diagnoseCropDisease.ts
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from "../app/context/LanguageContext";
import { Type } from "@google/genai";
import type { PreviousChats } from "~/types/tool_types";

const GEMINI_PROMPT = `You are a multilingual crop disease diagnosis and treatment assistant.\n\nGiven an image of a diseased plant, return the following:\n1. Disease name (common and scientific)\n2. Cause: fungal, bacterial, pest, deficiency, etc.\n3. Immediate next step for the farmer\n4. Organic remedies (e.g., neem spray)\n5. Inorganic solutions (e.g., safe fungicide/pesticide)\n\n🗣 Respond in the user’s chosen Indian language. Use agricultural examples from India (e.g., \"red rot in sugarcane\").\n\n📋 Output Format:\n- Disease name\n- Cause and spread\n- Step-by-step treatment (organic first, then inorganic)\n- Warnings (e.g., wear gloves when spraying)\n\nAlways prioritize **safety** and encourage farmers to consult nearby agricultural officers if needed.`;

export const diagnoseCropDiseaseFunctionDeclaration = {
  name: "diagnose_crop_disease",
  description:
    "Diagnose crop disease from an image and provide step-by-step treatment in the selected language. Return disease name, cause, organic/inorganic remedies, and safety warnings.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      image: {
        type: Type.STRING,
        description: "Image URL or binary data of the diseased plant",
      },
    },
    required: ["image"],
  },
};

export interface CropDiseaseDiagnosis {
  diseaseName: string;
  cause: string;
  treatment: string[]; // Steps
  warnings: string[];
  language: string;
  markdown?: string; // Add markdown field for UI rendering
}

// Pure tool function: expects image as parameter, returns diagnosis
export async function diagnoseCropDisease(
  image: string,
  language?: string,
  previousChats?: PreviousChats
): Promise<CropDiseaseDiagnosis> {
  let lang = language;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    if (!lang) lang = useLanguage().currentLanguage;
  } catch {}

  try {
    const apiKey = import.meta.env.VITE_GENERATIVE_API_KEY;
    const client = new GoogleGenAI({ apiKey });
    const imageBase64 = image.replace(
      /^data:image\/(png|jpeg|jpg);base64,/,
      ""
    );
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/png",
      },
    };
    const chatContext =
      previousChats && previousChats.length > 0
        ? previousChats
            .map((c, i) => `Previous Query #${i + 1}:\n${c?.toString()}`)
            .join("\n\n")
        : "";

    const promptPart = {
      text:
        (chatContext ? chatContext + "\n\n" : "") +
        GEMINI_PROMPT +
        `\nLanguage: ${lang}\n\nReturn ONLY a valid JSON object with the following fields: diseaseName, cause, treatment (array of steps), warnings (array), language. Do not include any explanation or extra text.`,
    };
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        diseaseName: { type: Type.STRING },
        cause: { type: Type.STRING },
        treatment: { type: Type.ARRAY, items: { type: Type.STRING } },
        warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        language: { type: Type.STRING },
      },
      propertyOrdering: [
        "diseaseName",
        "cause",
        "treatment",
        "warnings",
        "language",
      ],
    };
    const contents = [imagePart, promptPart];
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    let parsed: CropDiseaseDiagnosis | undefined;
    try {
      parsed =
        typeof result.text === "string" ? JSON.parse(result.text) : result.text;
    } catch (e) {
      parsed = undefined;
    }
    if (parsed && parsed.diseaseName) {
      return parsed;
    }
    return {
      diseaseName: lang === "hi" ? "अज्ञात रोग" : "Unknown Disease",
      cause: lang === "hi" ? "पहचान नहीं हो सकी।" : "Could not identify.",
      treatment: [
        lang === "hi"
          ? "कृपया नजदीकी कृषि अधिकारी से संपर्क करें।"
          : "Please consult your nearest agricultural officer.",
      ],
      warnings: [],
      language: lang || "en",
    };
  } catch (e) {
    return {
      diseaseName: lang === "hi" ? "अज्ञात रोग" : "Unknown Disease",
      cause: lang === "hi" ? "पहचान नहीं हो सकी।" : "Could not identify.",
      treatment: [
        lang === "hi"
          ? "कृपया नजदीकी कृषि अधिकारी से संपर्क करें।"
          : "Please consult your nearest agricultural officer.",
      ],
      warnings: [],
      language: lang || "en",
    } as any;
  }
}
