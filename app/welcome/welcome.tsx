import React, { useState, useCallback } from "react";
import { useAudioContexts } from "~/hooks/useAudioContexts";
import { useLanguage, LANGUAGE_OPTIONS } from "../context/LanguageContext";
import { useGeminiSession } from "~/hooks/useGeminiSession";
import { useAudioRecording } from "~/hooks/useAudioRecording";
import PriceDetailsModal from "~/../components/PriceDetailsModal";
import type { MarketDataResult } from "tools/getMarketData";
import DashboardView from "../components/DashboardView";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
interface SearchResult {
  uri: string;
  title: string;
}

const LiveAudio: React.FC = () => {
  // State for UI display
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]); // State to display search results

  const [loading, setLoading] = useState<{
    active: boolean;
    toolName?: string;
  }>({ active: false });
  const [livePrompt, setLivePrompt] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Memoized callbacks for status and error updates
  const updateStatus = useCallback((msg: string) => setStatus(msg), []);
  const updateError = useCallback((msg: string) => setError(msg), []);

  // Listen for AI or tool result updates and show as live prompter
  // We'll update setLivePrompt in the onMarketDataReceived and in GeminiSession's onmessage
  const handleMarketDataReceived = useCallback(
    (data: MarketDataResult | Record<string, MarketDataResult>) => {
      // If it's a compare_state_market_data result (object of MarketDataResult), join summaries
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        Object.values(data)[0]?.summary
      ) {
        setLivePrompt(
          Object.entries(data)
            .map(
              ([region, res]) =>
                `**${region}**: ${(res as any).summary || "No summary"}`
            )
            .join("\n\n")
        );
      } else if (
        data &&
        typeof data === "object" &&
        (data as MarketDataResult).summary
      ) {
        setLivePrompt((data as MarketDataResult).summary);
      } else {
        setLivePrompt("");
      }
      setDashboardData(data);
      // Remove modal logic from here, dashboard handles display
    },
    []
  );

  // Custom hook for AudioContexts and GainNodes
  const {
    inputAudioContext,
    outputAudioContext,
    inputNode,
    outputNode,
    nextStartTime,
  } = useAudioContexts();

  // Custom hook for Gemini Session management
  const {
    session,
    resetSession,
    searchResults: geminiSearchResults, // Rename to avoid conflict with local state
  } = useGeminiSession({
    apiKey: "AIzaSyCC-OMVsUmkpw8qa6WaWlnVVKzwn7HLmdo", // Replace with your actual API key
    outputAudioContext,
    outputNode,
    nextStartTimeRef: nextStartTime,
    updateStatus,
    updateError,
    setSearchResults: setSearchResults, // Pass local state setter to update results from hook
    onMarketDataReceived: handleMarketDataReceived,
    setLoading, // Pass loading setter to hook
  });

  // Custom hook for Audio Recording
  const { isRecording, startRecording, stopRecording } = useAudioRecording({
    inputAudioContext,
    inputNode,
    session,
    updateStatus,
    updateError,
  });

  const { currentLanguage, setCurrentLanguage } = useLanguage();

  return (
    <div className="relative min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* Loading Overlay */}
      {loading.active && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-60">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-blue-400 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <div className="text-lg font-semibold text-blue-200">
              {loading.toolName
                ? `Processing: ${loading.toolName}`
                : "Processing..."}
            </div>
          </div>
        </div>
      )}

      {/* Language Selector */}
      <div className="absolute top-5 right-5 z-20">
        <label
          htmlFor="language-select"
          className="mr-2 text-blue-200 font-medium"
        >
          Language:
        </label>
        <select
          id="language-select"
          value={currentLanguage}
          onChange={(e) => setCurrentLanguage(e.target.value)}
          className="bg-gray-800 text-white rounded px-3 py-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search Results Display */}
      {searchResults.length > 0 && (
        <div
          id="search-results"
          className="absolute top-5 left-5 z-10 bg-gray-800 bg-opacity-70 p-4 rounded-xl max-w-sm border border-gray-700 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-2 text-blue-300">Sources</h3>
          <ul className="list-none p-0 m-0">
            {searchResults.map((result, index) => (
              <li key={index} className="mb-2 last:mb-0">
                <a
                  href={result.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline text-sm block"
                >
                  {result.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center gap-4 z-10">
        <div className="flex space-x-4">
          <button
            id="resetButton"
            onClick={resetSession} // Use the resetSession from hook
            disabled={isRecording}
            aria-label="Reset Session"
            className="p-4 rounded-full bg-gray-700 text-white shadow-lg hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#ffffff"
            >
              <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>
          <button
            id="startButton"
            onClick={startRecording} // Use the startRecording from hook
            disabled={isRecording}
            aria-label="Start Recording"
            className="p-4 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#ffffff"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="50" />
            </svg>
          </button>
          <button
            id="stopButton"
            onClick={stopRecording} // Use the stopRecording from hook
            disabled={!isRecording}
            aria-label="Stop Recording"
            className="p-4 rounded-full bg-gray-300 text-gray-800 shadow-lg hover:bg-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#000000"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="0" y="0" width="100" height="100" rx="15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div
        id="status"
        className="absolute bottom-5 left-0 right-0 z-10 text-center text-lg font-medium text-blue-300"
      >
        {error ? `Error: ${error}` : status}
      </div>

      {/* Live Text Prompter & Dashboard */}
      <div className="flex-1 flex items-center justify-center w-full">
        {dashboardData && (
          <div className="w-full flex flex-col items-center">
            <DashboardView result={dashboardData} />
          </div>
        )}
      </div>

      {/* 3D Visualizer Component */}
      {inputNode && outputNode && (
        <div>Visualizing</div>
        // <gdm-live-audio-visuals-3d
        //   .inputNode=${inputNode}
        //   .outputNode=${outputNode}
        // ></gdm-live-audio-visuals-3d>
      )}
    </div>
  );
};

export default LiveAudio;
