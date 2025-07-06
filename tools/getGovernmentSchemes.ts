// getGovernmentSchemes.ts
import { useLanguage } from "../app/context/LanguageContext";
import { Type } from "@google/genai";

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
  category: string;
  link: string;
}

export interface GovernmentSchemesResult {
  summary: string;
  schemes: GovernmentScheme[];
  language: string;
}

// Stub: Replace with real data source or API integration
export async function getGovernmentSchemes(
  query: string,
  location: string,
  language?: string
): Promise<GovernmentSchemesResult> {
  // Use language from context if not provided
  let lang = language;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    if (!lang) lang = useLanguage().currentLanguage;
  } catch {}
  // Example stubbed data
  if (query.toLowerCase().includes("drip irrigation")) {
    return {
      summary:
        lang === "hi"
          ? "ड्रिप सिंचाई के लिए सब्सिडी योजनाएँ उपलब्ध हैं।"
          : "Subsidy schemes for drip irrigation are available.",
      schemes: [
        {
          name:
            lang === "hi"
              ? "प्रधानमंत्री कृषि सिंचाई योजना (PMKSY)"
              : "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
          summary:
            lang === "hi"
              ? "योग्यता: सभी किसान | लाभ: ड्रिप/स्प्रिंकलर पर सब्सिडी | श्रेणी: सब्सिडी"
              : "Eligibility: All farmers | Benefit: Subsidy on drip/sprinkler | Category: Subsidy",
          category: lang === "hi" ? "सब्सिडी" : "Subsidy",
          link: "https://pmksy.gov.in/",
        },
      ],
      language: lang || "en",
    };
  }
  return {
    summary:
      lang === "hi"
        ? "क्षमा करें, कोई उपयुक्त सरकारी योजना नहीं मिली। कृपया नजदीकी कृषि विज्ञान केंद्र (KVK) या CSC से संपर्क करें।"
        : "Sorry, no relevant government scheme found. Please contact your nearest Krishi Vigyan Kendra (KVK) or CSC for help.",
    schemes: [],
    language: lang || "en",
  };
}
