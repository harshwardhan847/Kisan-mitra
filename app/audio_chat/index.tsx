import type React from "react";
import { useState, useCallback } from "react";
import { useAudioContexts } from "~/hooks/useAudioContexts";
import { useLanguage, LANGUAGE_OPTIONS } from "../context/LanguageContext";
import { useGeminiSession } from "~/hooks/useGeminiSession";
import { useAudioRecording } from "~/hooks/useAudioRecording";
import { diagnoseCropDisease } from "../../tools/diagnoseCropDisease";
import CameraDiagnosisModal from "../components/CameraDiagnosisModal";
import type { MarketDataResult } from "tools/getMarketData";
import DashboardView, { type ToolResponse } from "../components/DashboardView";
import {
  Mic,
  MicOff,
  Camera,
  RotateCcw,
  Trash2,
  Globe,
  Loader2,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface SearchResult {
  uri: string;
  title: string;
}

const MAX_CONTEXT_CHATS = 10;

const LiveAudio: React.FC = () => {
  // State for UI display
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<{
    active: boolean;
    toolName?: string;
  }>({ active: false });
  const [livePrompt, setLivePrompt] = useState<string>("");
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [dashboardError, setDashboardError] = useState<string>("");
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnosePreview, setDiagnosePreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingAgentDiagnosis, setPendingAgentDiagnosis] = useState(false);

  // Memoized callbacks for status and error updates
  const updateStatus = useCallback((msg: string) => setStatus(msg), []);
  const updateError = useCallback((msg: string) => setError(msg), []);

  const handleMarketDataReceived = useCallback((data: ToolResponse) => {
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
    setDashboardData((prev) => [...prev, data]);
  }, []);

  const {
    inputAudioContext,
    outputAudioContext,
    inputNode,
    outputNode,
    nextStartTime,
  } = useAudioContexts();

  const handleAgentDiagnoseRequest = useCallback(
    (cb: (image: string) => void) => {
      setCameraOpen(true);
      setPendingAgentDiagnosis(true);
      (window as any).__agentDiagnosisCallback = cb;
    },
    []
  );

  const {
    session,
    resetSession,
    searchResults: geminiSearchResults,
  } = useGeminiSession({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
    outputAudioContext,
    outputNode,
    nextStartTimeRef: nextStartTime,
    updateStatus,
    updateError,
    setSearchResults: setSearchResults,
    onMarketDataReceived: handleMarketDataReceived,
    setLoading,
    onRequestImageForDiagnosis: handleAgentDiagnoseRequest,
  });

  const { isRecording, startRecording, stopRecording } = useAudioRecording({
    inputAudioContext,
    inputNode,
    session,
    updateStatus,
    updateError,
  });

  const getPreviousChats = () =>
    dashboardData.filter((d) => d && d.summary).slice(-MAX_CONTEXT_CHATS);

  const handleClearHistory = () => {
    setDashboardData([]);
    setDashboardError("");
    setLivePrompt("");
  };

  const handleManualDiagnoseRequest = () => {
    setCameraOpen(true);
    setPendingAgentDiagnosis(false);
  };

  const handleImageCapture = async (image: string) => {
    setCameraOpen(false);
    setDiagnoseLoading(true);
    setDiagnosePreview(image);
    try {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Loading Overlay */}
      {loading.active && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
                <div className="absolute inset-0 h-12 w-12 border-2 border-cyan-400/20 rounded-full animate-ping"></div>
              </div>
              <div className="text-xl font-medium text-slate-200">
                {loading.toolName
                  ? `Processing: ${loading.toolName}`
                  : "Processing..."}
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky inset-0 top-0 z-20 p-6">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-sm text-slate-400">
                Intelligent Voice Interface
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-slate-400" />
            <select
              value={currentLanguage}
              onChange={(e) => {
                setCurrentLanguage(e.target.value);
                stopRecording();
              }}
              className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-200"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option
                  key={opt.code}
                  value={opt.code}
                  className="bg-slate-800"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="absolute top-24 left-6 z-10 max-w-sm">
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <ExternalLink className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-slate-200">Sources</h3>
            </div>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <a
                  key={index}
                  href={result.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-all duration-200 group"
                >
                  <div className="text-cyan-400 group-hover:text-cyan-300 text-sm font-medium line-clamp-2">
                    {result.title}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-0 relative z-10">
        {/* Image Preview */}
        {diagnosePreview && (
          <div className="mb-8 w-full max-w-md">
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
              <div className="text-center mb-4">
                <div className="inline-flex items-center space-x-2 text-amber-400 mb-2">
                  <Camera className="w-5 h-5" />
                  <span className="font-medium">Image Preview</span>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={diagnosePreview || "/placeholder.svg"}
                  alt="Selected crop disease"
                  className="w-full h-48 object-cover"
                />
                {diagnoseLoading && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400 text-center mt-3">
                {diagnoseLoading
                  ? "Analyzing image..."
                  : "Image ready for analysis"}
              </p>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {dashboardData.length > 0 && (
          <div className="w-full max-w-4xl mb-8">
            {dashboardError && (
              <div className="mb-6 p-4 bg-red-900/50 backdrop-blur-xl border border-red-700/50 rounded-2xl text-red-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="font-medium">Error:</span>
                  <span>{dashboardError}</span>
                </div>
              </div>
            )}
            <div className="w-full pb-48">
              <DashboardView results={dashboardData} />
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 w-full flex flex-col items-center justify-center z-50">
        {/* Control Panel */}
        <div className="bg-slate-900/50 backdrop-blur-xl w-min rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-center space-x-6">
            {/* Camera Button */}
            <button
              onClick={handleManualDiagnoseRequest}
              disabled={diagnoseLoading}
              className="group relative p-4 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-amber-500/25"
            >
              <Camera className="w-6 h-6 text-white" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Reset Button */}
            <button
              onClick={resetSession}
              disabled={isRecording}
              className="group relative p-4 bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-slate-500/25"
            >
              <RotateCcw className="w-6 h-6 text-white" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-slate-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Clear History Button */}
            <button
              onClick={handleClearHistory}
              disabled={dashboardData.length === 0}
              className="group relative p-4 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-yellow-500/25"
            >
              <Trash2 className="w-6 h-6 text-white" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Recording Controls */}
            <div className="flex items-center space-x-4">
              {/* Start Recording */}
              <button
                onClick={startRecording}
                disabled={isRecording}
                className={`group relative p-6 rounded-full transition-all duration-300 transform shadow-2xl ${
                  isRecording
                    ? "bg-gradient-to-br from-gray-500 to-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 hover:scale-110 hover:shadow-red-500/50"
                }`}
              >
                <Mic className="w-8 h-8 text-white" />
                {!isRecording && (
                  <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping"></div>
                )}
              </button>

              {/* Stop Recording */}
              <button
                onClick={stopRecording}
                disabled={!isRecording}
                className={`group relative p-6 rounded-full transition-all duration-300 transform shadow-2xl ${
                  !isRecording
                    ? "bg-gradient-to-br from-gray-500 to-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 hover:scale-110 hover:shadow-slate-500/50"
                }`}
              >
                <MicOff className="w-8 h-8 text-white" />
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-slate-400/20 animate-pulse"></div>
                )}
              </button>
            </div>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center justify-center mt-6 space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-medium">Recording...</span>
              <div className="flex space-x-1">
                <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-6 bg-red-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse delay-200"></div>
                <div className="w-1 h-6 bg-red-400 rounded-full animate-pulse delay-300"></div>
                <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse delay-400"></div>
              </div>
            </div>
          )}
        </div>
        {/* Status Bar */}
        <footer className="relative z-10 p-6">
          <div className="text-center">
            {error ? (
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-red-900/50 backdrop-blur-xl border border-red-700/50 rounded-full text-red-200">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span>Error: {error}</span>
              </div>
            ) : status ? (
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-900/50 backdrop-blur-xl border border-cyan-700/50 rounded-full text-cyan-200">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span>{status}</span>
              </div>
            ) : (
              <div className="text-slate-400">Ready to assist</div>
            )}
          </div>
        </footer>
      </div>

      {/* Camera Modal */}
      <CameraDiagnosisModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleImageCapture}
      />

      {/* Audio Visualizer Placeholder */}
      {inputNode && outputNode && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-slate-500 text-sm">
          Audio Visualizer Active
        </div>
      )}
    </div>
  );
};

export default LiveAudio;
