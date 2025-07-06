// diagnoseCropDisease.ts
import { useLanguage } from "../app/context/LanguageContext";
import { Type } from "@google/genai";

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
}

// Stub: Replace with real image analysis or ML model
export async function diagnoseCropDisease(
  image: string,
  language?: string
): Promise<CropDiseaseDiagnosis> {
  // Use language from context if not provided
  let lang = language;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    if (!lang) lang = useLanguage().currentLanguage;
  } catch {}
  // Example stubbed data
  if (image.includes("leaf_spot")) {
    return {
      diseaseName:
        lang === "hi" ? "पत्ती धब्बा (Leaf Spot)" : "Leaf Spot (Cercospora)",
      cause: lang === "hi" ? "फफूंद (Fungal)" : "Fungal (Cercospora)",
      treatment: [
        lang === "hi"
          ? "1. प्रभावित पत्तियाँ हटा दें।\n2. नीम का छिड़काव करें।\n3. आवश्यकता हो तो सुरक्षित फफूंदनाशी का प्रयोग करें।"
          : "1. Remove affected leaves.\n2. Spray neem extract.\n3. Use safe fungicide if needed.",
      ],
      warnings: [
        lang === "hi"
          ? "छिड़काव करते समय दस्ताने पहनें।"
          : "Wear gloves when spraying.",
      ],
      language: lang || "en",
    };
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
}
