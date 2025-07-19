"use client";

import type React from "react";
import { useState, useCallback, useEffect } from "react";
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
  ExternalLink,
  Zap,
  Languages,
  MessageCircle,
  ChevronsUp,
  ChevronsDown,
  Wand2,
} from "lucide-react";
import type { PreviousChats } from "~/types/tool_types";
import BlurText from "~/components/BlurText";
import { AnimatePresence, motion } from "framer-motion";

interface SearchResult {
  uri: string;
  title: string;
}

const MAX_CONTEXT_CHATS = 10;

const LiveAudio: React.FC = () => {
  // State for UI display
  const [status, setStatus] = useState("");
  const [isControlPanel, setIsControlPanel] = useState(true);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<{
    active: boolean;
    toolName?: string;
  }>({ active: false });
  const [livePrompt, setLivePrompt] = useState<string>("");
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [dashboardData, setDashboardData] = useState<PreviousChats>([]);
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

  const getPreviousChats = () => dashboardData.slice(-MAX_CONTEXT_CHATS);

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
    previousChats: getPreviousChats(),
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

  useEffect(() => {
    if (dashboardData.length > 0) {
      setIsControlPanel(false);
    }
  }, [dashboardData]);

  const handleClearHistory = () => {
    setDashboardData([]);
    stopRecording();
    setIsControlPanel(true);
    setDashboardError("");
    setLivePrompt("");
  };

  const handleManualDiagnoseRequest = () => {
    setCameraOpen(true);
    setPendingAgentDiagnosis(false);
  };

  const handleImageCapture = async (image: string) => {
    if (cameraOpen === false) return;
    setCameraOpen(false);
    setDiagnoseLoading(true);
    setDiagnosePreview(image);

    try {
      if ((window as any).__agentDiagnosisCallback) {
        (window as any).__agentDiagnosisCallback(image);
      } else {
        const result = await diagnoseCropDisease(
          image,
          currentLanguage,
          getPreviousChats()
        );
        setDashboardData((prev) => [...prev, result]);
      }
    } catch {
      setDashboardError(
        "The spell failed to diagnose the magical plant. Please try again."
      );
    } finally {
      setDiagnoseLoading(false);
      setDiagnosePreview(null);
      setPendingAgentDiagnosis(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full flex-1 h-full bg-gradient-to-br from-purple-950 via-indigo-950 to-violet-900 text-amber-50 relative overflow-hidden">
      {/* Magical Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        {/* Floating magical particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-amber-400 rounded-full animate-bounce opacity-60"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-32 left-16 w-3 h-3 bg-amber-300 rounded-full animate-pulse opacity-50"></div>
      </div>

      {/* Magical Loading Overlay */}
      {loading.active && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-purple-900/90 backdrop-blur-xl rounded-2xl p-8 border border-amber-600/50 shadow-2xl shadow-amber-500/20">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Wand2 className="h-12 w-12 text-amber-400 animate-spin" />
                <div className="absolute inset-0 h-12 w-12 border-2 border-amber-400/20 rounded-full animate-ping"></div>
              </div>
              <div className="text-xl font-medium text-amber-200">
                {loading.toolName
                  ? `Casting Spell: ${loading.toolName}`
                  : "Weaving Magic..."}
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Magical Header */}
      <header className="fixed left-0 right-0 h-min top-0 z-20 p-6 backdrop-blur-3xl bg-gradient-to-br from-purple-950/50 via-indigo-950/50 to-violet-900/50 border-b border-amber-600/20">
        <div className="flex items-center justify-between">
          {/* Magical Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Zap className="w-6 h-6 text-purple-900" />
            </div>
            <div>
              <h1 className="text-2xl hidden md:block font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Herbology Oracle
              </h1>
              <h1 className="text-2xl block md:hidden font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                HO
              </h1>
              <p className="text-sm md:block hidden text-amber-300/70">
                Magical Voice Divination
              </p>
            </div>
          </div>

          {/* Spell Controls */}
          <div className="flex items-center space-x-3">
            {/* Clear Scrolls Button */}
            <button
              onClick={handleClearHistory}
              disabled={dashboardData.length === 0}
              className="cursor-pointer p-2 md:mr-4 transition-all border border-amber-600/50 rounded-md duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:scale-100 hover:bg-amber-600/20"
            >
              <MessageCircle className="w-6 h-6 text-amber-300" />
            </button>
            <Languages className="w-5 h-5 text-amber-400" />
            <select
              value={currentLanguage}
              onChange={(e) => {
                setCurrentLanguage(e.target.value);
                stopRecording();
                setIsControlPanel(true);
              }}
              className="bg-purple-800/50 backdrop-blur-xl border border-amber-600/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all duration-200"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option
                  key={opt.code}
                  value={opt.code}
                  className="bg-purple-800"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Ancient Scrolls (Search Results) */}
      {searchResults.length > 0 && (
        <div className="absolute top-24 left-6 z-10 max-w-sm">
          <div className="bg-purple-900/80 backdrop-blur-xl rounded-2xl p-6 border border-amber-600/50 shadow-2xl shadow-amber-500/20">
            <div className="flex items-center space-x-2 mb-4">
              <ExternalLink className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-200">
                Ancient Texts
              </h3>
            </div>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <a
                  key={index}
                  href={result.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-purple-800/50 rounded-xl hover:bg-purple-700/50 transition-all duration-200 group border border-amber-600/20"
                >
                  <div className="text-amber-400 group-hover:text-amber-300 text-sm font-medium line-clamp-2">
                    {result.title}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Magical Content Area */}
      <main className="flex-1 h-full flex flex-col items-center justify-center md:px-6 py-0 relative z-10">
        {/* Magical Image Preview */}
        {diagnosePreview && (
          <div className="mb-8 w-full max-w-md">
            <div className="bg-purple-900/80 backdrop-blur-xl rounded-2xl p-6 border border-amber-600/50 shadow-2xl shadow-amber-500/20">
              <div className="text-center mb-4">
                <div className="inline-flex items-center space-x-2 text-amber-400 mb-2">
                  <Camera className="w-5 h-5" />
                  <span className="font-medium">Magical Specimen</span>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-amber-600/30">
                <img
                  src={diagnosePreview || "/placeholder.svg"}
                  alt="Selected magical plant"
                  className="w-full h-48 object-cover"
                />
                {diagnoseLoading && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Wand2 className="w-8 h-8 text-amber-400 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-sm text-amber-300/70 text-center mt-3">
                {diagnoseLoading
                  ? "Consulting the ancient texts..."
                  : "Specimen ready for divination"}
              </p>
            </div>
          </div>
        )}

        {/* Magical Dashboard */}
        {dashboardData.length > 0 ? (
          <div className="w-full max-w-4xl h-full flex-1">
            {dashboardError && (
              <div className="mb-6 p-4 bg-red-900/50 backdrop-blur-xl border border-red-600/50 rounded-2xl text-red-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="font-medium">Dark Magic Detected:</span>
                  <span>{dashboardError}</span>
                </div>
              </div>
            )}
            <DashboardView results={[...(dashboardData || [])].reverse()} />
          </div>
        ) : (
          <>
            {!diagnoseLoading && (
              <div className="w-full h-full flex items-center justify-center flex-1 min-h-full">
                <BlurText
                  text="Mischief Managed!"
                  delay={150}
                  animateBy="words"
                  direction="top"
                  onAnimationComplete={() => {}}
                  className="text-3xl text-amber-200 md:text-9xl font-semibold mb-8"
                />
              </div>
            )}
          </>
        )}
      </main>

      <div
        className={`fixed bottom-0 left-1/2 transition-all transform -translate-x-1/2 flex flex-col items-center justify-center z-50 ${
          isControlPanel ? "translate-y-0" : " translate-y-[80%]"
        }`}
      >
        {/* Magical Control Panel */}
        {!!status && (
          <AnimatePresence>
            <motion.div
              transition={{ duration: 0.4, ease: "easeInOut" }}
              initial={{ y: "100%", scale: 0.4 }}
              exit={{ y: "100%", scale: 0.4 }}
              animate={{ y: 0, scale: 1 }}
              className="bg-purple-900/50 mb-4 backdrop-blur-xl relative w-min rounded-3xl p-8 border border-amber-600/50 shadow-2xl shadow-amber-500/20"
            >
              <button
                onClick={() => {
                  setIsControlPanel(!isControlPanel);
                }}
                className={`absolute cursor-pointer top-0 bg-purple-900/50 backdrop-blur-xl border border-amber-600/50 shadow-2xl p-2 py-3 rounded-full aspect-square left-1/2 -translate-y-[40%] transform -translate-x-1/2 text-amber-400 text-sm hover:bg-amber-600/20 transition-all`}
              >
                {isControlPanel ? (
                  <ChevronsDown size={25} className="" />
                ) : (
                  <ChevronsUp size={25} className="" />
                )}
              </button>

              <div className="flex items-center justify-center space-x-6">
                {/* Magical Camera Spell */}
                <button
                  onClick={handleManualDiagnoseRequest}
                  disabled={diagnoseLoading}
                  className="group relative cursor-pointer p-4 bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-amber-500/25"
                >
                  <Camera className="w-6 h-6 text-purple-900" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                {/* Voice Magic Controls */}
                <div className="flex items-center space-x-4">
                  {isRecording ? (
                    <button
                      onClick={() => {
                        stopRecording();
                      }}
                      disabled={!isRecording}
                      className={`group relative p-6 rounded-full transition-all duration-300 transform shadow-2xl ${
                        isRecording
                          ? "bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 hover:scale-110 hover:shadow-purple-500/50"
                          : "bg-gradient-to-br from-gray-500 to-gray-600 cursor-not-allowed"
                      }`}
                    >
                      <MicOff className="w-8 h-8 text-amber-100" />
                      {isRecording && (
                        <div className="absolute inset-0 rounded-full bg-purple-400/20 animate-pulse" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        startRecording();
                      }}
                      disabled={isRecording}
                      className={`group relative p-6 rounded-full transition-all duration-300 transform shadow-2xl ${
                        isRecording
                          ? "bg-gradient-to-br from-gray-500 to-gray-600 cursor-not-allowed"
                          : " cursor-pointer bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 hover:scale-110 hover:shadow-red-500/50"
                      }`}
                    >
                      <Mic className="w-8 h-8 text-amber-100" />
                      {!isRecording && (
                        <div className="absolute inset-0 scale-75 rounded-full bg-red-400/20 animate-ping" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {!status && (
          <AnimatePresence>
            <motion.div
              transition={{ duration: 0.4, ease: "easeInOut" }}
              initial={{ y: "100%", scale: 0.4 }}
              exit={{ y: "100%", scale: 0.4 }}
              animate={{ y: 0, scale: 1 }}
              className="inline-flex mb-4 items-center space-x-2 px-4 py-2 bg-amber-900/50 backdrop-blur-xl border border-amber-600/50 rounded-full text-amber-200"
            >
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <span>Awakening the Magic...</span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Magical Camera Modal */}
      <CameraDiagnosisModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleImageCapture}
      />
    </div>
  );
};

export default LiveAudio;
