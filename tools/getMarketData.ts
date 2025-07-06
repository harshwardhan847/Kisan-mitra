import { Type } from "@google/genai";

/**
 * Fetches real-time market data for a given commodity from the Mandi price API.
 * @param {string} commodityName - The name of the commodity (e.g., "Cabbage", "Potato").
 * @param {string} [state] - Optional: Filters the result by State.
 * @param {string} [district] - Optional: Filters the result by District.
 * @param {string} [market] - Optional: Filters the result by Market.
 * @returns {Promise<object>} Market data or an error message.
 */
export async function getMarketData(
  commodityName: string,
  state?: string,
  district?: string,
  market?: string
) {
  const API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"; // Replace with your actual API key
  const BASE_URL =
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

  let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=1`; // Limit to 1 record for simplicity, assuming a representative price

  // Add filters if provided
  if (state) {
    url += `&filters[state.keyword]=${encodeURIComponent(state)}`;
  }
  if (district) {
    url += `&filters[district]=${encodeURIComponent(district)}`;
  }
  if (market) {
    url += `&filters[market]=${encodeURIComponent(market)}`;
  }
  url += `&filters[commodity]=${encodeURIComponent(commodityName)}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(data);

    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      const formatPrice = (price: string) =>
        `${Number(price)?.toFixed(2)} INR/Quintal`; // Prices are likely per Quintal (100 kg) in Mandi data

      return {
        commodityName: record.commodity,
        state: record.state,
        district: record.district,
        market: record.market,
        arrival_date: record.arrival_date,
        min_price: formatPrice(record.min_price),
        max_price: formatPrice(record.max_price),
        modal_price: formatPrice(record.modal_price),
        trends:
          "Data fetched from live API. Trends not directly provided by API, but can be inferred by historical data.",
      };
    } else {
      return {
        commodityName: commodityName,
        state: state || "N/A",
        district: district || "N/A",
        market: market || "N/A",
        arrival_date: "N/A",
        min_price: "N/A",
        max_price: "N/A",
        modal_price: "N/A",
        trends:
          "Market data not available for this commodity with the given filters. Please try another.",
      };
    }
  } catch (error) {
    console.error("Error fetching market data:", error);
    return {
      commodityName: commodityName,
      state: state || "N/A",
      district: district || "N/A",
      market: market || "N/A",
      arrival_date: "N/A",
      min_price: "N/A",
      max_price: "N/A",
      modal_price: "N/A",
      trends: `Error fetching market data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export const marketDataFunctionDeclaration = {
  name: "get_market_data", // Changed to match the new function name
  description:
    "Retrieves the current price of a specific commodity from various markets in India.",
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
    },
    required: ["commodityName"],
  },
};
// Example usage:
// async function exampleUsage() {
//   const potatoPrice = await getMarketData(
//     "Potato",
//     "Haryana",
//     "Gurgaon",
//     "Gurgaon"
//   );
//   console.log("Potato Price in Gurgaon:", potatoPrice);

//   const onionPrice = await getMarketData(
//     "Onion",
//     "Tripura",
//     "North Tripura",
//     "Dasda"
//   );
//   console.log("Onion Price in Dasda:", onionPrice);

//   const unknownCrop = await getMarketData("Avocado");
//   console.log("Avocado Price:", unknownCrop);
// }

// exampleUsage();
