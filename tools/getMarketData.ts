import { Type } from "@google/genai";

/**
 * Simulates fetching real-time market data for a given crop.
 * In a real application, this would call an external market API.
 * @param {string} cropName - The name of the crop (e.g., "tomatoes").
 * @returns {object} Mock market data.
 */
export function getMarketData(cropName: string) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  const formatPrice = (price: number) => `${price.toFixed(2)} INR/kg`;

  const data = [
    {
      cropName: "tomatoes",
      today: formatPrice(25 + Math.random() * 5),
      yesterday: formatPrice(20 + Math.random() * 5),
      twoDaysAgo: formatPrice(22 + Math.random() * 5),
      trends:
        "Slightly increasing price trend over the last two days. Good time to consider selling.",
    },
    {
      cropName: "potatoes",
      today: formatPrice(18 + Math.random() * 3),
      yesterday: formatPrice(19 + Math.random() * 3),
      twoDaysAgo: formatPrice(20 + Math.random() * 3),
      trends: "Stable price with a slight downward trend. Monitor closely.",
    },
    {
      cropName: "onions",
      today: formatPrice(30 + Math.random() * 7),
      yesterday: formatPrice(28 + Math.random() * 7),
      twoDaysAgo: formatPrice(25 + Math.random() * 7),
      trends: "Strong upward trend. Prices are rising rapidly.",
    },
    // Add more crops as needed
  ];
  const matched = data.find(
    (item) =>
      item.cropName.toLowerCase() === cropName.toLowerCase() ||
      item.cropName.toLowerCase().includes(cropName.toLowerCase())
  );
  return (
    matched || {
      today: "N/A",
      yesterday: "N/A",
      twoDaysAgo: "N/A",
      trends: "Market data not available for this crop. Please try another.",
    }
  );
}

export const marketDataFunctionDeclaration = {
  name: "get_price_details",
  description: "Retrieves the current price of a specific product.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      product_name: {
        type: Type.STRING,
        description:
          "The exact name or identifier of the product for which to retrieve the price. This is a required field.",
      },
      currency: {
        type: Type.STRING,
        description:
          "The desired currency for the price (e.g., 'USD', 'EUR', 'INR'). Defaults to USD if not specified.",
        enum: ["USD", "EUR", "INR"],
      },
    },
    required: ["product_name"], // Crucial: Mark required parameters
  },
};
