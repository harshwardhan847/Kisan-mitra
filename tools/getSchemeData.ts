/**
 * Simulates fetching information about government agricultural schemes.
 * In a real application, this would query a database or scrape government websites.
 * @param {string} topic - The topic of the scheme (e.g., "drip irrigation").
 * @returns {object} Mock scheme information.
 */
function getSchemeData(topic: string) {
  const data: Record<string, {}> = {
    "drip irrigation": {
      name: "Pradhan Mantri Krishi Sinchai Yojana (PMKSY) - Per Drop More Crop",
      description:
        "A central scheme to promote water use efficiency in agriculture through micro-irrigation (drip and sprinkler systems).",
      eligibility:
        "Farmers with agricultural land, individual or collective. Specific landholding criteria may apply by state.",
      benefits:
        "Subsidies up to 50-60% for micro-irrigation system installation, varying by state and farmer category.",
      applicationLink:
        "https://pmksy.gov.in/ (Mock Link - Replace with actual)",
    },
    "crop insurance": {
      name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
      description:
        "Provides comprehensive risk cover against failure of crops, protecting farmers from production losses.",
      eligibility:
        "All farmers, including sharecroppers and tenant farmers, growing notified crops in notified areas.",
      benefits:
        "Low premium rates (1.5-5% of sum insured) for farmers, with the balance paid by government. Covers yield losses due to non-preventable risks.",
      applicationLink:
        "https://pmfby.gov.in/ (Mock Link - Replace with actual)",
    },
    "farm loans": {
      name: "Kisan Credit Card (KCC) Scheme",
      description:
        "Provides farmers with timely and adequate credit support from the banking system for their cultivation needs.",
      eligibility:
        "Farmers (individual/joint borrowers) who are owner cultivators, tenant farmers, oral lessees, or sharecroppers.",
      benefits:
        "Short-term credit for crop production, post-harvest expenses, marketing loans, and working capital for allied activities. Interest subvention available.",
      applicationLink:
        "https://www.nabard.org/ (Mock Link - Replace with actual)",
    },
    // Add more schemes as needed
  };
  return (
    data[topic.toLowerCase()] || {
      name: "No specific scheme found for this topic.",
      description:
        "Please try a more specific query or visit the Ministry of Agriculture website for more information.",
      eligibility: "N/A",
      applicationLink: "N/A",
    }
  );
}
