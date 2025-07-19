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
  Sparkles,
  Languages,
  MessageCircle,
  ChevronsDown,
} from "lucide-react";
import type { PreviousChats } from "~/types/tool_types";
import BlurText from "~/components/BlurText";
import { AnimatePresence, motion } from "framer-motion";

import { MagicalButton } from "~/components/magical-button";
import { MagicalOrb } from "~/components/magical-orb";
import { MagicalParticles } from "~/components/magical-particles";

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
        "The enchantment failed to divine the plant's secrets. Please try again."
      );
    } finally {
      setDiagnoseLoading(false);
      setDiagnosePreview(null);
      setPendingAgentDiagnosis(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full flex-1 h-full relative overflow-hidden">
      {/* Enhanced Magical Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, #1e40af 0%, transparent 50%)",
              "radial-gradient(circle at 40% 80%, #7c2d12 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </div>

      {/* Magical Particles */}
      <MagicalParticles />

      {/* Professional Loading Overlay */}
      <AnimatePresence>
        {loading.active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-xl bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative"
            >
              {/* Magical loading orb */}
              <MagicalOrb isActive={true} size={120} color="#fbbf24" />

              {/* Loading text */}
              <motion.div
                className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                <div className="text-xl font-semibold text-amber-200 mb-2">
                  {loading.toolName
                    ? `Weaving ${loading.toolName}`
                    : "Channeling Magic"}
                </div>
                <div className="flex justify-center space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-amber-400 rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed left-0 right-0 top-0 z-20 backdrop-blur-xl bg-gradient-to-r from-slate-900/80 via-purple-900/80 to-indigo-900/80 border-b border-amber-500/20"
      >
        <div className="flex items-center justify-between p-6">
          {/* Enhanced Logo */}
          <motion.div
            className="flex items-center space-x-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="relative">
              <motion.div
                className="w-12 h-12 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg"
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(251, 191, 36, 0.3)",
                    "0 0 30px rgba(251, 191, 36, 0.5)",
                    "0 0 20px rgba(251, 191, 36, 0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                <Sparkles className="w-7 h-7 text-slate-900" />
              </motion.div>
              {/* Floating sparkles around logo */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-amber-300 rounded-full"
                  animate={{
                    x: [0, Math.cos(i * 2.1) * 25, 0],
                    y: [0, Math.sin(i * 2.1) * 25, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.5,
                    ease: "easeInOut",
                  }}
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                />
              ))}
            </div>
            <div>
              <motion.h1
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                style={{ backgroundSize: "200% 200%" }}
              >
                <span className="hidden md:inline">Herbology Oracle</span>
                <span className="md:hidden">HO</span>
              </motion.h1>
              <p className="text-sm text-amber-200/70 hidden md:block font-medium">
                Magical Voice Divination
              </p>
            </div>
          </motion.div>

          {/* Enhanced Controls */}
          <div className="flex items-center space-x-4">
            <MagicalButton
              onClick={handleClearHistory}
              disabled={dashboardData.length === 0}
              variant="secondary"
              size="sm"
              className="!p-3"
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </MagicalButton>

            <div className="flex items-center space-x-3">
              <Languages className="w-5 h-5 text-amber-400" />
              <motion.select
                whileFocus={{ scale: 1.02 }}
                value={currentLanguage}
                onChange={(e) => {
                  setCurrentLanguage(e.target.value);
                  stopRecording();
                  setIsControlPanel(true);
                }}
                className="bg-slate-800/50 backdrop-blur-xl border border-amber-500/30 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all duration-200 cursor-pointer"
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
              </motion.select>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Enhanced Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="absolute top-24 left-6 z-10 max-w-sm"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/30 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 20,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <ExternalLink className="w-5 h-5 text-amber-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-amber-200">
                  Ancient Scrolls
                </h3>
              </div>
              <div className="space-y-3">
                {searchResults.map((result, index) => (
                  <motion.a
                    key={index}
                    href={result.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="block p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-all duration-200 group border border-amber-500/20 hover:border-amber-400/40"
                    whileHover={{ scale: 1.02, x: 5 }}
                  >
                    <div className="text-amber-400 group-hover:text-amber-300 text-sm font-medium line-clamp-2">
                      {result.title}
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 h-full flex flex-col items-center justify-center md:px-6 py-0 relative z-10 pt-24">
        {/* Enhanced Image Preview */}
        <AnimatePresence>
          {diagnosePreview && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="mb-8 w-full max-w-md"
            >
              <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/30 shadow-2xl">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center space-x-2 text-amber-400 mb-2">
                    <Camera className="w-5 h-5" />
                    <span className="font-semibold">Magical Specimen</span>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-amber-500/30">
                  <img
                    src={diagnosePreview || "/placeholder.svg"}
                    alt="Selected magical plant"
                    className="w-full h-48 object-cover"
                  />
                  {diagnoseLoading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <MagicalOrb isActive={true} size={60} color="#fbbf24" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-amber-300/70 text-center mt-3 font-medium">
                  {diagnoseLoading
                    ? "Consulting the ancient texts..."
                    : "Specimen ready for divination"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard or Welcome */}
        {dashboardData.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl h-full flex-1"
          >
            {dashboardError && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 p-4 bg-red-900/50 backdrop-blur-xl border border-red-500/50 rounded-2xl text-red-200"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Dark Magic Detected:</span>
                  <span>{dashboardError}</span>
                </div>
              </motion.div>
            )}
            <DashboardView results={[...(dashboardData || [])].reverse()} />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center flex-1 min-h-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <BlurText
                text="Hey Mate!"
                delay={150}
                animateBy="words"
                direction="top"
                onAnimationComplete={() => {}}
                className="text-4xl md:text-8xl lg:text-9xl font-bold text-white text-center"
              />
              {/* Floating magical elements around text */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-amber-400 rounded-full"
                  animate={{
                    x: [0, Math.cos((i * Math.PI) / 3) * 100, 0],
                    y: [0, Math.sin((i * Math.PI) / 3) * 100, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.3,
                    ease: "easeInOut",
                  }}
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                />
              ))}
            </motion.div>
          </div>
        )}
      </main>

      {/* Enhanced Control Panel */}
      <motion.div
        className={`fixed bottom-0 left-1/2 transition-all transform -translate-x-1/2 flex flex-col items-center justify-center z-50`}
        animate={{
          y: isControlPanel ? 0 : "80%",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <AnimatePresence>
          {!!status && (
            <motion.div
              initial={{ y: 100, scale: 0.8, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 100, scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative mb-4 backdrop-blur-xl bg-slate-900/80 rounded-3xl p-8 border border-amber-500/30 shadow-2xl"
            >
              {/* Panel toggle button */}
              <motion.button
                onClick={() => setIsControlPanel(!isControlPanel)}
                className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-full p-3 hover:bg-amber-500/20 transition-all duration-300"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  animate={{ rotate: isControlPanel ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronsDown size={20} className="text-amber-400" />
                </motion.div>
              </motion.button>

              <div className="flex items-center justify-center space-x-8">
                {/* Enhanced Camera Button */}
                <MagicalButton
                  onClick={handleManualDiagnoseRequest}
                  disabled={diagnoseLoading}
                  variant="warning"
                  size="lg"
                >
                  <Camera className="w-7 h-7 text-slate-900" />
                </MagicalButton>

                {/* Enhanced Voice Controls */}
                <div className="relative">
                  {isRecording ? (
                    <MagicalButton
                      onClick={stopRecording}
                      disabled={!isRecording}
                      variant="secondary"
                      size="lg"
                      className="!p-8"
                    >
                      <MicOff className="w-8 h-8 text-white" />
                    </MagicalButton>
                  ) : (
                    <MagicalButton
                      onClick={startRecording}
                      disabled={isRecording}
                      variant="danger"
                      size="lg"
                      className="!p-8"
                    >
                      <Mic className="w-8 h-8 text-white" />
                    </MagicalButton>
                  )}

                  {/* Recording indicator */}
                  {isRecording && (
                    <motion.div
                      className="absolute -top-2 -right-2 w-4 h-4 bg-red-400 rounded-full"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [1, 0.5, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Status */}
        <AnimatePresence>
          {!status && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="inline-flex mb-4 items-center space-x-3 px-6 py-3 bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 rounded-full text-amber-200"
            >
              <motion.div
                className="w-3 h-3 bg-amber-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
              <span className="font-medium">Awakening the Magic...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Camera Modal */}
      <CameraDiagnosisModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleImageCapture}
      />
    </div>
  );
};

export default LiveAudio;
