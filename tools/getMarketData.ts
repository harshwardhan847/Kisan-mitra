// tools/getMarketData.ts
import { Type, GoogleGenAI } from "@google/genai"; // Corrected import
import { useLanguage } from "../app/context/LanguageContext";
import type { PreviousChats } from "~/types/tool_types";

// Helper to format a Date object into DD/MM/YYYY
export function formatDateToDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// IMPORTANT CHANGE:
// This interface MUST accurately reflect the exact key names returned by the Mandi API (PascalCase).
// I've renamed it to `MandiRecord` to be more explicit about its origin.
export interface MandiRecord {
  State: string; // Matches API key
  District: string; // Matches API key
  Market: string; // Matches API key
  Commodity: string; // Matches API key
  Variety: string; // Matches API key
  Grade: string; // Matches API key
  Arrival_Date: string; // Matches API key
  Min_Price: string; // Matches API key
  Max_Price: string; // Matches API key
  Modal_Price: string; // Matches API key
  Commodity_Code: string; // Matches API key - Note: This field is not consistently present in both APIs, but kept for existing structure.
  // The 'error' field does NOT belong in this interface.
  // This interface describes a *successful* data record from the API.
  // Overall function errors are handled by MarketDataResult.error.
}

// Interface for the overall return type of getMarketData function
export interface MarketDataResult {
  records: MandiRecord[]; // Array of fetched records (now using MandiRecord)
  summary: string; // The AI-generated summary/trends based on the records
  error?: string; // This is where the overall function error should be (already present)
  chartType?: string; // e.g. 'bar', 'line', 'grouped-bar', etc.
  chartData?: any; // Data structure for recharts
}

export async function getMarketData(
  commodityName: string,
  state?: string,
  district?: string,
  market?: string,
  arrivalDate?: string, // For single-day query (DD/MM/YYYY)
  startDate?: string, // For range query start (DD/MM/YYYY)
  endDate?: string, // For range query end (DD/MM/YYYY)
  previousChats?: PreviousChats, // NEW: pass previous chat data for context
  languageCode: string = "hi-IN"
): Promise<MarketDataResult> {
  // Use language from context

  const MANDI_API_KEY = import.meta.env.VITE_MANDI_API_KEY;
  const HISTORICAL_BASE_URL = import.meta.env.VITE_HISTORICAL_MANDI_API_URL;
  const TODAY_BASE_URL = import.meta.env.VITE_TODAY_MANDI_API_URL;

  const geminiApiKey: string = import.meta.env.VITE_GENERATIVE_API_KEY;

  console.log("Called: MarketDataTool");

  let datesToFetch: Date[] = [];
  let displayDateRange: string; // Used in the Gemini prompt to indicate the analyzed period

  const today = new Date();
  const todayFormatted = formatDateToDDMMYYYY(today);

  // --- Date Parsing Logic ---
  let isTodayOnly = false;
  if (startDate && endDate) {
    // Case 1: Date range query (startDate and endDate provided)
    const startParts = startDate.split("/").map(Number);
    const endParts = endDate.split("/").map(Number);

    // Date constructor: new Date(year, monthIndex, day) - Month is 0-indexed
    const start = new Date(startParts[2], startParts[1] - 1, startParts[0]);
    const end = new Date(endParts[2], endParts[1] - 1, endParts[0]);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return {
        records: [],
        summary: "",
        error:
          "Invalid date range provided. Please use DD/MM/YYYY format and ensure start date is not after end date.",
      };
    }

    let current = new Date(start);
    while (current <= end) {
      datesToFetch.push(new Date(current));
      current.setDate(current.getDate() + 1); // Move to the next day
    }
    displayDateRange = `${formatDateToDDMMYYYY(
      start
    )} to ${formatDateToDDMMYYYY(end)}`;
    isTodayOnly = false;
  } else {
    // Case 2: Single-day query (arrivalDate provided) or default to today
    let singleDate: Date;

    console.log(arrivalDate);
    if (arrivalDate) {
      const dateParts = arrivalDate.split("/").map(Number);
      singleDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    } else {
      singleDate = new Date(); // Default to today's date if no date is specified
    }

    if (isNaN(singleDate.getTime())) {
      return {
        records: [],
        summary: "",
        error: "Invalid single date provided. Please use DD/MM/YYYY format.",
      };
    }
    datesToFetch.push(singleDate);
    displayDateRange = formatDateToDDMMYYYY(singleDate); // For single-day summary
    isTodayOnly =
      formatDateToDDMMYYYY(singleDate) === formatDateToDDMMYYYY(today);
  }

  const fetchedRecords: MandiRecord[] = []; // Use MandiRecord here

  console.log("Dates to fetch", datesToFetch);
  // --- Fetching Data for Each Date in the Range ---
  for (const date of datesToFetch) {
    const formattedDate = formatDateToDDMMYYYY(date);
    let url: string;
    let isTodayApi = false;

    // Determine which API to use based on the date
    if (formattedDate === todayFormatted) {
      url = `${TODAY_BASE_URL}?api-key=${MANDI_API_KEY}&format=json&limit=3`; // Use limit=10 per day as in your example
      isTodayApi = true;
    } else {
      url = `${HISTORICAL_BASE_URL}?api-key=${MANDI_API_KEY}&format=json&limit=3`; // Use limit=10 per day as in your example
    }

    if (state) {
      url += `&filters[${isTodayApi ? "state" : "State"}]=${encodeURIComponent(
        state
      )}`;
    }
    if (district) {
      url += `&filters[${
        isTodayApi ? "district" : "District"
      }]=${encodeURIComponent(district)}`;
    }
    if (market) {
      url += `&filters[${
        isTodayApi ? "market" : "Market"
      }]=${encodeURIComponent(market)}`;
    }
    if (commodityName) {
      url += `&filters[${
        isTodayApi ? "commodity" : "Commodity"
      }]=${encodeURIComponent(commodityName)}`;
    }

    // Only add arrival date filter for the historical API
    if (!isTodayApi) {
      url += `&filters[Arrival_Date]=${encodeURIComponent(formattedDate)}`;
    }

    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        console.warn(
          `Mandi API fetch failed for ${formattedDate}: ${response.statusText}`
        );
        continue; // Continue to the next date even if one fetch fails
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        if (isTodayApi) {
          // Map the today's API response to MandiRecord structure
          const mappedRecords: MandiRecord[] = data.records.map(
            (record: any) => ({
              State: record.state,
              District: record.district,
              Market: record.market,
              Commodity: record.commodity,
              Variety: record.variety,
              Grade: record.grade,
              Arrival_Date: record.arrival_date,
              Min_Price: record.min_price,
              Max_Price: record.max_price,
              Modal_Price: record.modal_price,
              Commodity_Code: "", // The new API doesn't have this, so leave as empty string
            })
          );
          fetchedRecords.push(...mappedRecords);
        } else {
          // Direct push for historical API as properties already match
          fetchedRecords.push(...data.records);
        }
      }
    } catch (error) {
      console.error(`Error fetching data for ${formattedDate}:`, error);
      continue; // Continue to the next date
    }
  }

  // --- Gemini AI Analysis to generate summary/trends ---
  let aiSummary =
    "No specific market insights could be generated for the provided data range/date.";

  // --- Chart Data Generation for Recharts ---
  let chartType: string | undefined = undefined;
  let chartData: any = undefined;
  if (fetchedRecords.length > 0) {
    // If single market or single day, show price over time (line chart)
    const uniqueMarkets = Array.from(
      new Set(fetchedRecords.map((r) => r.Market))
    );
    const uniqueDates = Array.from(
      new Set(fetchedRecords.map((r) => r.Arrival_Date))
    );
    if (uniqueMarkets.length === 1 && uniqueDates.length > 1) {
      chartType = "line";
      chartData = fetchedRecords.map((r) => ({
        date: r.Arrival_Date,
        modal: parseFloat(r.Modal_Price),
        min: parseFloat(r.Min_Price),
        max: parseFloat(r.Max_Price),
      }));
    } else if (uniqueMarkets.length > 1 && uniqueDates.length === 1) {
      // Compare markets for a single day (bar chart)
      chartType = "bar";
      chartData = fetchedRecords.map((r) => ({
        market: r.Market,
        modal: parseFloat(r.Modal_Price),
        min: parseFloat(r.Min_Price),
        max: parseFloat(r.Max_Price),
      }));
    } else if (uniqueMarkets.length > 1 && uniqueDates.length > 1) {
      // Grouped bar: market vs date
      chartType = "grouped-bar";
      chartData = uniqueDates.map((date) => {
        const entry: any = { date };
        uniqueMarkets.forEach((market) => {
          const rec = fetchedRecords.find(
            (r) => r.Market === market && r.Arrival_Date === date
          );
          entry[market] = rec ? parseFloat(rec.Modal_Price) : null;
        });
        return entry;
      });
    } else {
      // Fallback: single record, show as bar
      chartType = "bar";
      chartData = fetchedRecords.map((r) => ({
        market: r.Market,
        modal: parseFloat(r.Modal_Price),
        min: parseFloat(r.Min_Price),
        max: parseFloat(r.Max_Price),
      }));
    }
  }

  // If only today's price is requested, skip AI summary and return data directly
  if (isTodayOnly) {
    return {
      records: fetchedRecords,
      summary: "",
      chartType,
      chartData,
    };
  }

  if (fetchedRecords.length > 0) {
    // Prepare data for Gemini to summarize
    // Ensure these fields match the MandiRecord interface (and thus the API response keys).
    const dataForGemini = fetchedRecords.map((record) => ({
      Commodity: record.Commodity,
      State: record.State,
      District: record.District,
      Market: record.Market,
      Arrival_Date: record.Arrival_Date,
      Min_Price: record.Min_Price,
      Max_Price: record.Max_Price,
      Modal_Price: record.Modal_Price,
    }));

    // Stringify data for the prompt
    const dataString = JSON.stringify(dataForGemini, null, 2);

    const chatContext =
      previousChats && previousChats.length > 0
        ? previousChats
            .map((c, i) => `Previous Query #${i + 1}:\n${c?.toString()}`)
            .join("\n\n")
        : "";
    // SHORT, CONVERSATIONAL PROMPT
    const prompt = `You are an expert agricultural market analyst..
$${
      chatContext ? chatContext + "\n\n" : ""
    }Here is mandi price data for ${commodityName} (${displayDateRange}):\n${dataString}\n\nReply with a short, direct, conversational summary (max 3 sentences). Focus on the main trend, a tip for farmers, and a tip for buyers. If data is too little, say so. Use markdown, but keep it concise and to the point like a real chat.  Response must be in this language: ${languageCode}`;
    try {
      const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash", // Using a faster model for text generation
        contents: [{ parts: [{ text: prompt }] }],

        // generationConfig is not supported, so only language in prompt
      });

      // Correctly access the generated text from the response
      aiSummary = result.text ?? ""; // Use .text() for the actual string content

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
  } else {
    aiSummary = `No market data available for ${commodityName} in ${
      state || "any state"
    } ${district || "any district"} ${
      market || "any market"
    } for the period ${displayDateRange}. Please check your filters or try another date/range.`;
  }

  // --- Return the results ---
  return {
    records: fetchedRecords,
    summary: aiSummary,
    chartType,
    chartData,
  };
}

// Function declaration for the LLM to understand and use the tool
export const marketDataFunctionDeclaration = {
  name: "get_market_data",
  description:
    "Retrieves agricultural commodity price data from Indian Mandi markets. Can fetch data for a specific date or a range of dates to identify trends. Defaults to today's date if no date is specified. Provide `startDate` and `endDate` for a range, or `arrivalDate` for a single day. All the parameters must be in english",
  parameters: {
    type: Type.OBJECT,
    properties: {
      commodityName: {
        type: Type.STRING,
        description:
          "The name of the commodity (e.g., 'Cabbage', 'Potato', 'Onion'). This is a required field.",
      },
      state: {
        type: Type.STRING,
        description:
          "Optional: The name of the state to filter the market data (e.g., 'Haryana', 'Tripura').",
      },
      district: {
        type: Type.STRING,
        description:
          "Optional: The name of the district to filter the market data (e.g., 'Gurgaon', 'Gomati').",
      },
      market: {
        type: Type.STRING,
        description:
          "Optional: The name of the market to filter the market data (e.g., 'Gurgaon', 'Garjee').",
      },
      arrivalDate: {
        type: Type.STRING,
        description:
          "Optional: A specific arrival date for the commodity in **DD/MM/YYYY** format (e.g., '06/07/2025'). This parameter should NOT be used if `startDate` and `endDate` are provided. The model can infer this from relative terms like 'today', 'yesterday', 'tomorrow', 'last Monday', 'two days ago', or a specific date like 'July 1st'. don't send these directly:-'today', 'yesterday', 'tomorrow', 'last Monday', 'two days ago', or a specific date like 'July 1st'. these must be converted to a specific date.",
      },
      startDate: {
        type: Type.STRING,
        description:
          "Optional: The start date for a date range query in **DD/MM/YYYY** format (e.g., '01/07/2025'). This parameter must be used in conjunction with `endDate` for a date range, and NOT with `arrivalDate`.",
      },
      endDate: {
        type: Type.STRING,
        description:
          "Optional: The end date for a date range query in **DD/MM/YYYY** format (e.g., '07/07/2025'). This parameter must be used in conjunction with `startDate` for a date range, and NOT with `arrivalDate`.",
      },
    },
    required: ["commodityName"],
  },
};
