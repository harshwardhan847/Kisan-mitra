import { Type } from "@google/genai";
import { useLanguage } from "../app/context/LanguageContext";
import { formatDateToDDMMYYYY } from "./getMarketData";

export interface DistrictComparisonResult {
  chartType: string;
  chartData: any;
  summary: string;
  error?: string;
}

export async function getDistrictComparison(
  commodityName: string,
  districts: string[],
  state?: string,
  startDate?: string,
  endDate?: string
): Promise<DistrictComparisonResult> {
  let languageCode = "hi-IN";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    languageCode = useLanguage().currentLanguage;
  } catch {}

  // Simulate API fetch for each district (replace with real API logic)
  const districtsData = await Promise.all(
    districts.map(async (district) => {
      // ...fetch logic for each district...
      // For demo, generate random data
      const data = Array.from({ length: 7 }, (_, i) => ({
        date: formatDateToDDMMYYYY(new Date(Date.now() - i * 86400000)),
        modal: Math.floor(Math.random() * 2000 + 1000),
        district,
      })).reverse();
      return data;
    })
  );

  // Prepare chart data for recharts (multi-line chart)
  const chartType = "multi-line";
  const chartData: any[] = [];
  for (let i = 0; i < districtsData[0].length; i++) {
    const entry: any = { date: districtsData[0][i].date };
    districts.forEach((district, idx) => {
      entry[district] = districtsData[idx][i].modal;
    });
    chartData.push(entry);
  }

  // Generate a short summary
  const summary = `Comparison of modal prices for ${commodityName} across districts (${districts.join(
    ", "
  )}) over the selected period.`;

  return {
    chartType,
    chartData,
    summary,
  };
}

export const districtComparisonFunctionDeclaration = {
  name: "get_district_comparison",
  description:
    "Compare modal prices of a commodity across multiple districts over a date range. Returns chart data and summary.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      commodityName: {
        type: Type.STRING,
        description: "Commodity to compare.",
      },
      districts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of districts to compare.",
      },
      state: {
        type: Type.STRING,
        description: "Optional: State to filter.",
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
    required: ["commodityName", "districts", "startDate", "endDate"],
  },
};
