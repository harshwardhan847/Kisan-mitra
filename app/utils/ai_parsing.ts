const extractJSON = (message: string) => {
  const regex = /```json\n([\s\S]*?)\n```/; // Match everything between ```json and ```
  const match = message.match(regex);

  if (match && match[1]) {
    try {
      // Parse the extracted JSON string
      return JSON.parse(match[1]);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  }
  return null; // Return null if no match or error in parsing
};
export const getAIParsedResponse = (text: string) => {
  const parsedJSON = extractJSON(text);
  if (!parsedJSON) return { report: text };

  return parsedJSON;
};

export function extractUrlsFromText(text: string): string[] {
  const urlRegex =
    /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s"')]+)?/g;

  const matches = text.match(urlRegex) || [];

  const normalized = matches.map((url) =>
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `http://${url}`
  );

  return normalized;
}
