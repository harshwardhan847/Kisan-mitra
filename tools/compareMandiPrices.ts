// tools/compareStateMarketData.ts
import { GoogleGenAI, Type } from "@google/genai";
import {
  formatDateToDDMMYYYY,
  type MandiRecord,
  type MarketDataResult,
} from "./getMarketData";

export async function compareStateMarketData(
  commodityName: string,
  states: string[],
  arrivalDate?: string,
  startDate?: string,
  endDate?: string
): Promise<Record<string, MarketDataResult>> {
  const result: Record<string, MarketDataResult> = {};
  const MANDI_API_KEY =
    "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";
  const HISTORICAL_URL =
    "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24";
  const TODAY_URL =
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
  const today = new Date();
  const todayFormatted = formatDateToDDMMYYYY(today);

  const getRecordsForState = async (
    state: string
  ): Promise<MarketDataResult> => {
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

    const records: MandiRecord[] = [];

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

        records.push(...mapped);
      } catch (err) {
        console.error(
          `Error fetching for state ${state} on ${formattedDate}`,
          err
        );
      }
    }

    let summary = `No records found for ${state} during ${displayRange}.`;
    if (records.length > 0) {
      const dataStr = JSON.stringify(
        records.map((r) => ({
          State: r.State,
          Market: r.Market,
          Arrival_Date: r.Arrival_Date,
          Modal_Price: r.Modal_Price,
        })),
        null,
        2
      );

      const prompt = `Analyze modal price trends for ${commodityName} in ${state} during ${displayRange}.

${dataStr}

Provide a concise 100-word market insight using markdown:
- Price trends
- Best time to sell/buy
- Any regional anomalies or patterns`;

      try {
        const genAI = new GoogleGenAI({
          apiKey: "AIzaSyCC-OMVsUmkpw8qa6WaWlnVVKzwn7HLmdo",
        });
        const output = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ parts: [{ text: prompt }] }],
        });
        summary = output.text ?? summary;
      } catch (err) {
        console.warn(`Gemini failed for ${state}`, err);
      }
    }

    return { records, summary };
  };

  for (const state of states) {
    result[state] = await getRecordsForState(state);
  }

  return result;
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
