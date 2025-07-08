import { Type } from "@google/genai";
import { useLanguage } from "../app/context/LanguageContext";
import { formatDateToDDMMYYYY } from "./getMarketData";

export interface CropComparisonResult {
  chartType: string;
  chartData: any;
  summary: string;
  error?: string;
}

export async function getCropComparison(
  cropNames: string[],
  state?: string,
  district?: string,
  market?: string,
  startDate?: string,
  endDate?: string,
  languageCode: string = "hi-IN"
): Promise<CropComparisonResult> {
  // Simulate API fetch for each crop (replace with real API logic)
  const cropsData = await Promise.all(
    cropNames.map(async (crop) => {
      // ...fetch logic for each crop...
      // For demo, generate random data
      const data = Array.from({ length: 7 }, (_, i) => ({
        date: formatDateToDDMMYYYY(new Date(Date.now() - i * 86400000)),
        modal: Math.floor(Math.random() * 2000 + 1000),
        crop,
      })).reverse();
      return data;
    })
  );

  // Prepare chart data for recharts (multi-line chart)
  const chartType = "multi-line";
  const chartData: any[] = [];
  for (let i = 0; i < cropsData[0].length; i++) {
    const entry: any = { date: cropsData[0][i].date };
    cropNames.forEach((crop, idx) => {
      entry[crop] = cropsData[idx][i].modal;
    });
    chartData.push(entry);
  }

  // Generate a short summary
  const summary = `Comparison of modal prices for ${cropNames.join(
    ", "
  )} over the selected period.`;

  return {
    chartType,
    chartData,
    summary,
  };
}

export const cropComparisonFunctionDeclaration = {
  name: "get_crop_comparison",
  description:
    "Compare modal prices of multiple crops over a date range for a given location. Returns chart data and summary.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      cropNames: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "List of crop names to compare (e.g., ['Onion', 'Potato']).",
      },
      state: {
        type: Type.STRING,
        description: "Optional: State to filter.",
      },
      district: {
        type: Type.STRING,
        description: "Optional: District to filter.",
      },
      market: {
        type: Type.STRING,
        description: "Optional: Market to filter.",
      },
      startDate: {
        type: Type.STRING,
        description: "Start date (DD/MM/YYYY).",
      },
      endDate: {
        type: Type.STRING,
        description: "End date (DD/MM/YYYY).",
      },
    },
    required: ["cropNames", "startDate", "endDate"],
  },
};
