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
  previousChats?: MarketDataResult[] // NEW: pass previous chat data for context
): Promise<{ records: MandiRecord[]; summary: string; error?: string }> {
  // Use language from context
  let languageCode = "hi-IN";
  try {
    // Only works in React context
    // eslint-disable-next-line react-hooks/rules-of-hooks
    languageCode = useLanguage().currentLanguage;
  } catch {}
  const MANDI_API_KEY =
    "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";
  const HISTORICAL_URL =
    "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24";
  const TODAY_URL =
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
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
    const prompt = `You are an expert agricultural market analyst. Respond in this language: ${languageCode}.
\n${
      chatContext ? chatContext + "\n\n" : ""
    }Compare modal price trends for ${commodityName} across the following Indian states during ${displayRange}.
\n${dataStr}\n\nProvide a concise comparative market insight (max 200 words, markdown):\n- Price trends and differences between states\n- Best time/region to sell/buy\n- Any regional anomalies or patterns\n- Table or bullet points if useful`;
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
  return { records: allRecords, summary };
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
