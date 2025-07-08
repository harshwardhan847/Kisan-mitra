// tools/compareStateMarketData.ts
import { GoogleGenAI, Type } from "@google/genai";
import {
  formatDateToDDMMYYYY,
  type MandiRecord,
  type MarketDataResult,
} from "./getMarketData";
import { useLanguage } from "../app/context/LanguageContext";

export async function compareStateMarketData(
  commodityName: string,
  states: string[],
  arrivalDate?: string,
  startDate?: string,
  endDate?: string,
  previousChats?: MarketDataResult[], // NEW: pass previous chat data for context
  languageCode: string = "hi-IN"
): Promise<{
  records: MandiRecord[];
  summary: string;
  error?: string;
  chartType?: string;
  chartData?: any;
}> {
  const MANDI_API_KEY = import.meta.env.VITE_MANDI_API_KEY;
  const HISTORICAL_URL = import.meta.env.VITE_HISTORICAL_MANDI_API_URL;
  const TODAY_URL = import.meta.env.VITE_TODAY_MANDI_API_URL;
  const today = new Date();
  const todayFormatted = formatDateToDDMMYYYY(today);

  // Build all date queries for all states
  let dates: Date[] = [];
  let displayRange = "";
  if (startDate && endDate) {
    const start = new Date(startDate.split("/").reverse().join("-"));
    const end = new Date(endDate.split("/").reverse().join("-"));
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    displayRange = `${startDate} to ${endDate}`;
  } else {
    const singleDate = arrivalDate
      ? new Date(arrivalDate.split("/").reverse().join("-"))
      : today;
    dates.push(singleDate);
    displayRange = formatDateToDDMMYYYY(singleDate);
  }

  // Fetch all records for all states and all dates
  const allRecords: MandiRecord[] = [];
  for (const state of states) {
    for (const date of dates) {
      const formattedDate = formatDateToDDMMYYYY(date);
      const isToday = formattedDate === todayFormatted;
      let url = `${
        isToday ? TODAY_URL : HISTORICAL_URL
      }?api-key=${MANDI_API_KEY}&format=json&limit=10&filters[${
        isToday ? "state" : "State"
      }]=${encodeURIComponent(state)}&filters[${
        isToday ? "commodity" : "Commodity"
      }]=${encodeURIComponent(commodityName)}`;
      if (!isToday) url += `&filters[Arrival_Date]=${formattedDate}`;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const mapped = data.records.map(
          (r: any): MandiRecord =>
            isToday
              ? {
                  State: r.state,
                  District: r.district,
                  Market: r.market,
                  Commodity: r.commodity,
                  Variety: r.variety,
                  Grade: r.grade,
                  Arrival_Date: r.arrival_date,
                  Min_Price: r.min_price,
                  Max_Price: r.max_price,
                  Modal_Price: r.modal_price,
                  Commodity_Code: "",
                }
              : r
        );
        allRecords.push(...mapped);
      } catch (err) {
        console.error(
          `Error fetching for state ${state} on ${formattedDate}`,
          err
        );
      }
    }
  }

  // --- Chart Data Generation for Recharts ---
  let chartType: string | undefined = undefined;
  let chartData: any = undefined;
  if (allRecords.length > 0) {
    const uniqueStates = Array.from(new Set(allRecords.map((r) => r.State)));
    const uniqueDates = Array.from(
      new Set(allRecords.map((r) => r.Arrival_Date))
    );
    if (uniqueStates.length > 1 && uniqueDates.length === 1) {
      // Bar chart: compare states for a single day
      chartType = "bar";
      chartData = allRecords.map((r) => ({
        state: r.State,
        modal: parseFloat(r.Modal_Price),
        min: parseFloat(r.Min_Price),
        max: parseFloat(r.Max_Price),
      }));
    } else if (uniqueStates.length > 1 && uniqueDates.length > 1) {
      // Grouped bar: state vs date
      chartType = "grouped-bar";
      chartData = uniqueDates.map((date) => {
        const entry: any = { date };
        uniqueStates.forEach((state) => {
          const rec = allRecords.find(
            (r) => r.State === state && r.Arrival_Date === date
          );
          entry[state] = rec ? parseFloat(rec.Modal_Price) : null;
        });
        return entry;
      });
    } else if (uniqueStates.length === 1 && uniqueDates.length > 1) {
      // Line chart: price trend for a single state
      chartType = "line";
      chartData = allRecords.map((r) => ({
        date: r.Arrival_Date,
        modal: parseFloat(r.Modal_Price),
        min: parseFloat(r.Min_Price),
        max: parseFloat(r.Max_Price),
      }));
    } else {
      // Fallback: single record, show as bar
      chartType = "bar";
      chartData = allRecords.map((r) => ({
        state: r.State,
        modal: parseFloat(r.Modal_Price),
        min: parseFloat(r.Min_Price),
        max: parseFloat(r.Max_Price),
      }));
    }
  }

  // Compose a single Gemini prompt for all states
  let summary = `No records found for the selected states during ${displayRange}.`;
  if (allRecords.length > 0) {
    const dataStr = JSON.stringify(
      allRecords.map((r) => ({
        State: r.State,
        Market: r.Market,
        Arrival_Date: r.Arrival_Date,
        Modal_Price: r.Modal_Price,
      })),
      null,
      2
    );
    let chatContext = "";
    if (previousChats && previousChats.length > 0) {
      chatContext = previousChats
        .map((c, i) => `Previous Query #${i + 1}:\n${c.summary}`)
        .join("\n\n");
    }
    // SHORT, CONVERSATIONAL PROMPT
    const prompt = `You are an expert agricultural market analyst. Respond in this language: ${languageCode}.
$${
      chatContext ? chatContext + "\n\n" : ""
    }Here is mandi price data for ${commodityName} across states (${displayRange}):\n${dataStr}\n\nReply with a short, direct, conversational summary (max 3 sentences). Focus on the main trend, a tip for farmers, and a tip for buyers. If data is too little, say so. Use markdown, but keep it concise and to the point like a real chat.`;
    try {
      const genAI = new GoogleGenAI({
        apiKey: "AIzaSyCC-OMVsUmkpw8qa6WaWlnVVKzwn7HLmdo",
      });
      const output = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        // generationConfig is not supported, so only language in prompt
      });
      summary = output.text ?? summary;
    } catch (err) {
      console.warn(`Gemini failed for compareStateMarketData`, err);
    }
  }
  if (allRecords.length > 0) {
    return { records: allRecords, summary, chartType, chartData };
  }
  return { records: allRecords, summary, chartType, chartData };
}

export const compareStateMarketDataFunctionDeclaration = {
  name: "compare_state_market_data",
  description:
    "Compare modal prices of a commodity across multiple Indian states or districts for a given date or date range. Returns insights per region.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      commodityName: {
        type: Type.STRING,
        description: "Name of the commodity to compare (e.g., 'Onion').",
      },
      states: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "List of Indian states to compare (e.g., ['Haryana', 'Punjab']).",
      },
      district: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "List of Indian districts to compare (e.g., ['Gurugram', 'Rewari']).",
      },
      arrivalDate: {
        type: Type.STRING,
        description:
          "Optional: Single day query in DD/MM/YYYY. Cannot be used with startDate/endDate.",
      },
      startDate: {
        type: Type.STRING,
        description: "Optional: Start of date range (DD/MM/YYYY).",
      },
      endDate: {
        type: Type.STRING,
        description: "Optional: End of date range (DD/MM/YYYY).",
      },
    },
    required: ["commodityName"],
    oneOf: [{ required: ["states"] }, { required: ["district"] }],
  },
};
