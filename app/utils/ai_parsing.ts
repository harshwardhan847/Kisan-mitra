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
