import React, { useState, useCallback } from "react";
import { useAudioContexts } from "~/hooks/useAudioContexts";
import { useLanguage, LANGUAGE_OPTIONS } from "../context/LanguageContext";
import { useGeminiSession } from "~/hooks/useGeminiSession";
import { useAudioRecording } from "~/hooks/useAudioRecording";
import { diagnoseCropDisease } from "../../tools/diagnoseCropDisease";
import CameraDiagnosisModal from "../components/CameraDiagnosisModal";

import type { MarketDataResult } from "tools/getMarketData";
import DashboardView, { type ToolResponse } from "../components/DashboardView";
import { BiReset } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";

interface SearchResult {
  uri: string;
  title: string;
}

const MAX_CONTEXT_CHATS = 10; // Limit Gemini context to last 5 chats

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
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [dashboardData, setDashboardData] = useState<any[]>([]); // chat history
  const [dashboardError, setDashboardError] = useState<string>(""); // For Gemini/context errors
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnosePreview, setDiagnosePreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingAgentDiagnosis, setPendingAgentDiagnosis] = useState(false);

  // Memoized callbacks for status and error updates
  const updateStatus = useCallback((msg: string) => setStatus(msg), []);
  const updateError = useCallback((msg: string) => setError(msg), []);

  // Listen for AI or tool result updates and show as live prompter
  // We'll update setLivePrompt in the onMarketDataReceived and in GeminiSession's onmessage
  const handleMarketDataReceived = useCallback((data: ToolResponse) => {
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
      setDashboardError("");
    } else if (
      data &&
      typeof data === "object" &&
      (data as MarketDataResult).summary
    ) {
      setLivePrompt((data as MarketDataResult).summary);
      setDashboardError("");
    } else if (data && (data as any).error) {
      setDashboardError((data as any).error);
      setLivePrompt("");
    } else {
      setLivePrompt("");
    }
    setDashboardData((prev) => [...prev, data]); // append new data to chat history
  }, []);

  // Custom hook for AudioContexts and GainNodes
  const {
    inputAudioContext,
    outputAudioContext,
    inputNode,
    outputNode,
    nextStartTime,
  } = useAudioContexts();

  // Handler for agent-driven diagnosis (tool call)
  const handleAgentDiagnoseRequest = useCallback(
    (cb: (image: string) => void) => {
      setCameraOpen(true);
      setPendingAgentDiagnosis(true);
      // Store callback to be called after image capture
      (window as any).__agentDiagnosisCallback = cb;
    },
    []
  );

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
    onRequestImageForDiagnosis: handleAgentDiagnoseRequest, // <-- AGENT-DRIVEN
  });

  // Custom hook for Audio Recording
  const { isRecording, startRecording, stopRecording } = useAudioRecording({
    inputAudioContext,
    inputNode,
    session,
    updateStatus,
    updateError,
  });

  // When calling getMarketData or compareStateMarketData, pass previous chat data for context
  const getPreviousChats = () =>
    dashboardData.filter((d) => d && d.summary).slice(-MAX_CONTEXT_CHATS); // Only last N

  // Clear chat history handler
  const handleClearHistory = () => {
    setDashboardData([]);
    setDashboardError("");
    setLivePrompt("");
  };

  // Handler for manual crop disease diagnosis (button click)
  const handleManualDiagnoseRequest = () => {
    setCameraOpen(true);
    setPendingAgentDiagnosis(false);
  };

  // When image is captured from modal
  const handleImageCapture = async (image: string) => {
    setCameraOpen(false);
    setDiagnoseLoading(true);
    setDiagnosePreview(image);
    try {
      // Always call the agent callback if it exists
      if ((window as any).__agentDiagnosisCallback) {
        (window as any).__agentDiagnosisCallback(image);
        (window as any).__agentDiagnosisCallback = undefined;
      } else {
        const result = await diagnoseCropDisease(image, currentLanguage);
        setDashboardData((prev) => [...prev, result]);
      }
    } catch {
      setDashboardError("Failed to diagnose crop disease. Please try again.");
    } finally {
      setDiagnoseLoading(false);
      setDiagnosePreview(null);
      setPendingAgentDiagnosis(false);
    }
  };

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
          onChange={(e) => {
            setCurrentLanguage(e.target.value);
            stopRecording();
          }}
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

      {/* Camera Button for Crop Disease Diagnosis */}
      <div className="w-full flex flex-col items-center mt-8">
        {diagnosePreview && (
          <div className="w-full max-w-2xl bg-gray-950 rounded-xl p-6 shadow-lg border border-red-700 flex flex-col items-center mt-4">
            <div className="text-red-200 font-semibold mb-2">Preview</div>
            <img
              src={diagnosePreview}
              alt="Selected crop disease"
              className="max-h-64 rounded mb-2"
            />
            <div className="text-xs text-gray-400 mb-2">
              {diagnoseLoading
                ? "Analyzing image..."
                : "Image ready for analysis."}
            </div>
          </div>
        )}
      </div>
      <CameraDiagnosisModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleImageCapture}
      />

      {/* Live Text Prompter & Dashboard */}
      <div className="flex-1 flex items-center justify-center w-full">
        {dashboardData.length > 0 && (
          <div className="w-full flex flex-col items-center">
            {dashboardError && (
              <div className="mb-4 p-4 bg-red-700 text-white rounded shadow max-w-xl w-full text-center">
                <strong>Error:</strong> {dashboardError}
              </div>
            )}
            <DashboardView results={dashboardData} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className=" flex flex-col items-center justify-center gap-4 z-10">
        <div className="flex gap-x-4 items-stretch justify-stretch w-full">
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 shadow-lg mb-2"
            onClick={handleManualDiagnoseRequest}
            disabled={diagnoseLoading}
            aria-label="Diagnose Crop Disease (Camera)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75v-7.5A2.25 2.25 0 014.5 6h2.379a1.5 1.5 0 001.06-.44l.94-.94A1.5 1.5 0 0110.44 4.5h3.12a1.5 1.5 0 011.06.44l.94.94a1.5 1.5 0 001.06.44H19.5a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 15.75z"
              />
              <circle
                cx="12"
                cy="12"
                r="3.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <button
            id="resetButton"
            onClick={resetSession} // Use the resetSession from hook
            disabled={isRecording}
            aria-label="Reset Session"
            className="p-4 rounded-full bg-gray-700 text-white shadow-lg hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hidden"
          >
            <BiReset size={35} />
          </button>
          <button
            id="clearHistoryButton"
            onClick={handleClearHistory}
            disabled={dashboardData.length === 0}
            aria-label="Clear Chat History"
            className="p-4 rounded-full bg-yellow-600 text-white shadow-lg hover:bg-yellow-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Trash/clear icon */}
            <TbTrash size={35} />
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
        className="z-10 text-center text-lg font-medium text-blue-300"
      >
        {error ? `Error: ${error}` : status}
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
