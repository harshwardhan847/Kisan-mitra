import { Type } from "@google/genai";
import { useLanguage } from "../app/context/LanguageContext";

export interface MarketShareResult {
  chartType: string;
  chartData: any;
  summary: string;
  error?: string;
}

export async function getMarketShare(
  commodityName: string,
  state: string,
  date: string
): Promise<MarketShareResult> {
  let languageCode = "hi-IN";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    languageCode = useLanguage().currentLanguage;
  } catch {}

  // Simulate API fetch for market share (replace with real API logic)
  const markets = ["A", "B", "C", "D"];
  const chartData = markets.map((market) => ({
    market,
    share: Math.floor(Math.random() * 30 + 10),
  }));
  // Prepare chart data for recharts (pie chart)
  const chartType = "pie";
  // chartData is already in recharts pie format: [{ market, share }]
  const summary = `Market share of ${commodityName} across markets in ${state} on ${date}.`;
  return {
    chartType,
    chartData,
    summary,
  };
}

export const marketShareFunctionDeclaration = {
  name: "get_market_share",
  description:
    "Get market share of a commodity across markets in a state for a given date. Returns pie chart data and summary.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      commodityName: {
        type: Type.STRING,
        description: "Commodity to analyze.",
      },
      state: {
        type: Type.STRING,
        description: "State to analyze.",
      },
      date: {
        type: Type.STRING,
        description: "Date (DD/MM/YYYY).",
      },
    },
    required: ["commodityName", "state", "date"],
  },
};
