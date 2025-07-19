"use client";

import React, { useState } from "react";
import type { MarketDataResult } from "../../tools/getMarketData";
import type { GovernmentSchemesResult } from "../../tools/getGovernmentSchemes";
import type { CropDiseaseDiagnosis } from "../../tools/diagnoseCropDisease";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Leaf,
  DollarSign,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractUrlsFromText } from "~/utils/ai_parsing";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "blue" | "green" | "amber" | "red" | "purple";
}

const StatCard = React.memo(
  ({ label, value, icon, trend, color = "blue" }: StatCardProps) => {
    const colorClasses = {
      blue: "from-blue-500/20 to-cyan-500/20 border-blue-400/30 text-blue-300",
      green:
        "from-green-500/20 to-emerald-500/20 border-green-400/30 text-green-300",
      amber:
        "from-amber-500/20 to-yellow-500/20 border-amber-400/30 text-amber-300",
      red: "from-red-500/20 to-pink-500/20 border-red-400/30 text-red-300",
      purple:
        "from-purple-500/20 to-violet-500/20 border-purple-400/30 text-purple-300",
    };

    const glowColors = {
      blue: "hover:shadow-blue-400/20",
      green: "hover:shadow-green-400/20",
      amber: "hover:shadow-amber-400/20",
      red: "hover:shadow-red-400/20",
      purple: "hover:shadow-purple-400/20",
    };

    return (
      <motion.div
        className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl rounded-2xl border shadow-lg p-6 flex flex-col items-center min-w-[140px] transition-all duration-300 ${glowColors[color]} hover:shadow-2xl cursor-pointer group relative overflow-hidden`}
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Magical shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 3,
            ease: "easeInOut",
          }}
        />

        <div className="flex items-center space-x-2 mb-3 relative z-10">
          {icon && (
            <motion.div
              className="opacity-80"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              {icon}
            </motion.div>
          )}
          {trend && (
            <div className="flex items-center">
              {trend === "up" && (
                <TrendingUp className="w-4 h-4 text-green-400" />
              )}
              {trend === "down" && (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-slate-300 mb-2 text-center font-medium relative z-10">
          {label}
        </div>
        <motion.div
          className="text-2xl font-bold text-white relative z-10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          {value}
        </motion.div>

        {/* Floating sparkles */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-300 rounded-full opacity-0 group-hover:opacity-100"
            animate={{
              x: [0, Math.cos(i * 2.1) * 20, 0],
              y: [0, Math.sin(i * 2.1) * 20, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2,
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
    );
  }
);

const RechartsChart = React.memo(
  ({ chartType, chartData }: { chartType?: string; chartData?: any }) => {
    if (!chartType || !chartData || chartData.length === 0) return null;

    const customTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-xl p-4 shadow-2xl"
          >
            <p className="text-amber-200 font-medium mb-2">{`${label}`}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {`${entry.name}: ${entry.value}`}
              </p>
            ))}
          </motion.div>
        );
      }
      return null;
    };

    if (chartType === "line") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/20 hover:border-amber-400/40 transition-all duration-300 group"
        >
          <div className="flex items-center space-x-2 mb-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <Activity className="w-5 h-5 text-amber-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-amber-200 group-hover:text-amber-100 transition-colors">
              Magical Price Divination
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#6b7280"
                opacity={0.3}
              />
              <XAxis dataKey="date" stroke="#d1d5db" fontSize={12} />
              <YAxis stroke="#d1d5db" fontSize={12} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey="modal"
                stroke="#fbbf24"
                strokeWidth={3}
                name="Modal Price"
                dot={{ fill: "#fbbf24", strokeWidth: 2, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="min"
                stroke="#10b981"
                strokeWidth={2}
                name="Min Price"
                dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="max"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Max Price"
                dot={{ fill: "#f59e0b", strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      );
    }

    if (chartType === "bar") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 group"
        >
          <div className="flex items-center space-x-2 mb-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-purple-200 group-hover:text-purple-100 transition-colors">
              Market Enchantment Analysis
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#6b7280"
                opacity={0.3}
              />
              <XAxis dataKey="market" stroke="#d1d5db" fontSize={12} />
              <YAxis stroke="#d1d5db" fontSize={12} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar
                dataKey="modal"
                fill="#8b5cf6"
                name="Modal Price"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="min"
                fill="#10b981"
                name="Min Price"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="max"
                fill="#f59e0b"
                name="Max Price"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      );
    }

    if (chartType === "grouped-bar") {
      const keys = Object.keys(chartData[0] || {}).filter((k) => k !== "date");
      const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#3b82f6"];
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/20 hover:border-indigo-400/40 transition-all duration-300 group"
        >
          <div className="flex items-center space-x-2 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-indigo-200 group-hover:text-indigo-100 transition-colors">
              Mystical Grouped Analysis
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#6b7280"
                opacity={0.3}
              />
              <XAxis dataKey="date" stroke="#d1d5db" fontSize={12} />
              <YAxis stroke="#d1d5db" fontSize={12} />
              <Tooltip content={customTooltip} />
              <Legend />
              {keys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[idx % 4]}
                  name={key}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      );
    }

    return null;
  }
);

export type ToolResponse =
  | MarketDataResult
  | Record<string, MarketDataResult>
  | GovernmentSchemesResult
  | CropDiseaseDiagnosis
  | { error: string };

interface DashboardViewProps {
  results: ToolResponse[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ results }) => {
  const [expandedIndexes, setExpandedIndexes] = useState<Set<string>>(
    new Set()
  );

  const toggleExpand = (key: string) => {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="w-full flex flex-col h-full flex-1 items-center gap-6 md:px-8 py-28 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-amber-600/50 scrollbar-track-slate-800/50">
      <AnimatePresence>
        {results?.map((result, i) => {
          if (!result) return <React.Fragment key={i} />;

          // Government Schemes
          if ("schemes" in result && "summary" in result) {
            const schemesResult = result as GovernmentSchemesResult;
            return (
              <motion.div
                key={"gov-" + i}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="w-full max-w-4xl bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-xl rounded-3xl p-4 md:p-8 shadow-2xl border border-green-400/30 transition-all duration-300 hover:shadow-green-400/20 hover:border-green-300/50 group relative overflow-hidden"
              >
                {/* Magical background effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{
                    background: [
                      "radial-gradient(circle at 20% 50%, #10b98120 0%, transparent 50%)",
                      "radial-gradient(circle at 80% 50%, #059f6920 0%, transparent 50%)",
                      "radial-gradient(circle at 20% 50%, #10b98120 0%, transparent 50%)",
                    ],
                  }}
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                />

                <div className="flex items-center space-x-3 mb-6 relative z-10">
                  <motion.div
                    className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(16, 185, 129, 0.3)",
                        "0 0 30px rgba(16, 185, 129, 0.5)",
                        "0 0 20px rgba(16, 185, 129, 0.3)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    <FileText className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-green-300 group-hover:text-green-200 transition-colors">
                      Ministry Scrolls & Decrees
                    </h2>
                    <p className="text-sm text-slate-400">
                      Magical support programs from the realm
                    </p>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6 p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30 relative z-10"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {schemesResult.summary}
                  </ReactMarkdown>
                </motion.div>

                <div className="grid gap-4 relative z-10">
                  {schemesResult.schemes.map((s, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.1 }}
                      className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 hover:border-green-400/40 transition-all duration-300 group/scheme relative overflow-hidden"
                      whileHover={{ scale: 1.02, y: -2 }}
                    >
                      {/* Scheme card magical effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent -skew-x-12 opacity-0 group-hover/scheme:opacity-100"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatDelay: 2,
                        }}
                      />

                      <div className="flex flex-col md:flex-row items-start justify-between mb-4 relative z-10">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-green-200 mb-2 group-hover/scheme:text-green-100 transition-colors">
                            {s.name}
                          </h3>
                          <p className="text-slate-300 mb-3">{s.summary}</p>
                          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-md border border-green-400/30">
                            <motion.div
                              className="w-2 h-2 bg-green-400 rounded-full"
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [1, 0.7, 1],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Number.POSITIVE_INFINITY,
                              }}
                            />
                            <span className="text-xs text-green-300 font-medium">
                              {s.eligibility}
                            </span>
                          </div>
                        </div>
                        <motion.a
                          href={
                            extractUrlsFromText(s.applicationLink)?.[0] ?? ""
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 mt-4 md:mt-0 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl text-white font-medium transition-all duration-300 shadow-lg hover:shadow-green-500/25 relative z-10"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span>Cast Application</span>
                          <ExternalLink className="w-4 h-4" />
                        </motion.a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          }

          // Crop Disease Diagnosis
          if (
            "diseaseName" in result &&
            "cause" in result &&
            "treatment" in result
          ) {
            const diseaseResult = result as CropDiseaseDiagnosis;
            const key = `dis-${i}`;
            const isExpanded = !expandedIndexes.has(key);
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="w-full max-w-4xl bg-gradient-to-br from-red-900/20 to-pink-900/20 backdrop-blur-xl rounded-3xl p-4 md:p-8 shadow-2xl border border-red-400/30 transition-all duration-300 hover:shadow-red-400/20 hover:border-red-300/50 group relative overflow-hidden"
              >
                {/* Dark magic background effect */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{
                    background: [
                      "radial-gradient(circle at 30% 40%, #dc262620 0%, transparent 50%)",
                      "radial-gradient(circle at 70% 60%, #be123c20 0%, transparent 50%)",
                      "radial-gradient(circle at 30% 40%, #dc262620 0%, transparent 50%)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                />

                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg"
                      animate={{
                        boxShadow: [
                          "0 0 20px rgba(239, 68, 68, 0.3)",
                          "0 0 30px rgba(239, 68, 68, 0.5)",
                          "0 0 20px rgba(239, 68, 68, 0.3)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-bold text-red-300 group-hover:text-red-200 transition-colors">
                        Dark Arts Detection
                      </h2>
                      <p className="text-sm text-slate-400">
                        Ancient wisdom reveals plant ailments
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => toggleExpand(key)}
                    className="flex items-center cursor-pointer space-x-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-600/50 transition-all duration-300 text-slate-300 hover:text-white relative z-10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-sm font-medium">
                      {isExpanded ? "Conceal" : "Reveal"} Ancient Knowledge
                    </span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </motion.div>
                  </motion.button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-6 relative z-10"
                    >
                      {diseaseResult.markdown ? (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30"
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {diseaseResult.markdown}
                          </ReactMarkdown>
                        </motion.div>
                      ) : (
                        <div className="space-y-6">
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30"
                          >
                            <div className="flex items-center space-x-2 mb-3">
                              <Leaf className="w-5 h-5 text-red-400" />
                              <span className="font-bold text-red-200">
                                Cursed Affliction Identified:
                              </span>
                            </div>
                            <p className="text-slate-200 text-lg">
                              {diseaseResult.diseaseName}
                            </p>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30"
                          >
                            <div className="flex items-center space-x-2 mb-3">
                              <Info className="w-5 h-5 text-blue-400" />
                              <span className="font-bold text-blue-200">
                                Source of Dark Magic:
                              </span>
                            </div>
                            <p className="text-slate-200">
                              {diseaseResult.cause}
                            </p>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30"
                          >
                            <div className="flex items-center space-x-2 mb-4">
                              <CheckCircle className="w-5 h-5 text-green-400" />
                              <span className="font-bold text-green-200">
                                Healing Incantations:
                              </span>
                            </div>
                            <div className="space-y-3">
                              {diseaseResult.treatment.map((step, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 + idx * 0.1 }}
                                  className="flex items-start space-x-3 p-3 bg-slate-800/30 rounded-xl hover:bg-slate-700/30 transition-colors duration-300"
                                >
                                  <motion.div
                                    className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-green-400/30"
                                    animate={{
                                      boxShadow: [
                                        "0 0 10px rgba(16, 185, 129, 0.2)",
                                        "0 0 20px rgba(16, 185, 129, 0.4)",
                                        "0 0 10px rgba(16, 185, 129, 0.2)",
                                      ],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Number.POSITIVE_INFINITY,
                                      delay: idx * 0.2,
                                    }}
                                  >
                                    <span className="text-xs font-bold text-green-400">
                                      {idx + 1}
                                    </span>
                                  </motion.div>
                                  <p className="text-slate-200">{step}</p>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          // Market Data Results
          const marketResults: MarketDataResult[] = Array.isArray(result)
            ? result
            : typeof result === "object" && "records" in result
            ? [result as MarketDataResult]
            : Object.values(result as Record<string, MarketDataResult>);

          return marketResults.map((res, j) => {
            const key = `mkt-${i}-${j}`;
            const records = res.records || [];
            const prices =
              records.length > 1
                ? records
                    .map((r) => Number.parseFloat(r.Modal_Price))
                    .filter((n) => !isNaN(n))
                : records.length === 1
                ? [
                    Number.parseFloat(records[0].Max_Price),
                    Number.parseFloat(records[0].Min_Price),
                    Number.parseFloat(records[0].Modal_Price),
                  ]
                : [];

            const min = prices.length ? Math.min(...prices) : "-";
            const max = prices.length ? Math.max(...prices) : "-";
            const avg = prices.length
              ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0)
              : "-";

            const dateRange = (() => {
              const sorted = records.map((r) => r.Arrival_Date).sort();
              return sorted.length
                ? `${sorted[0]} to ${sorted[sorted.length - 1]}`
                : "-";
            })();

            const isExpanded = !expandedIndexes.has(key);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="w-full max-w-4xl bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-3xl p-4 md:p-8 shadow-2xl border border-blue-400/30 transition-all duration-300 hover:shadow-blue-400/20 hover:border-blue-300/50 group relative overflow-hidden"
              >
                {/* Magical market background effect */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{
                    background: [
                      "radial-gradient(circle at 25% 25%, #3b82f620 0%, transparent 50%)",
                      "radial-gradient(circle at 75% 75%, #06b6d420 0%, transparent 50%)",
                      "radial-gradient(circle at 25% 25%, #3b82f620 0%, transparent 50%)",
                    ],
                  }}
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                />

                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg"
                      animate={{
                        boxShadow: [
                          "0 0 20px rgba(59, 130, 246, 0.3)",
                          "0 0 30px rgba(59, 130, 246, 0.5)",
                          "0 0 20px rgba(59, 130, 246, 0.3)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      <DollarSign className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-lg md:text-2xl font-bold text-blue-300 group-hover:text-blue-200 transition-colors">
                        Merchant's Crystal Ball
                      </h2>
                      <div className="flex flex-col md:flex-row items-start md:items-center space-x-4 text-sm text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Leaf className="w-4 h-4" />
                          <span>{records[0]?.Commodity || "N/A"}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-nowrap">
                          <Calendar className="w-4 h-4" />
                          <span>{dateRange}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {res.summary && (
                    <motion.button
                      onClick={() => toggleExpand(key)}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-600/50 transition-all duration-300 text-slate-300 hover:text-white relative z-10"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-sm font-medium">
                        {isExpanded ? "Hide" : "Reveal"} Oracle's Vision
                      </span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </motion.div>
                    </motion.button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 md:mb-8 relative z-10">
                  <StatCard
                    label="Minimum Enchantment"
                    value={min}
                    icon={<TrendingDown className="w-5 h-5" />}
                    color="green"
                  />
                  <StatCard
                    label="Maximum Enchantment"
                    value={max}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="red"
                  />
                  <StatCard
                    label="Average Mystique"
                    value={avg}
                    icon={<Activity className="w-5 h-5" />}
                    color="blue"
                  />
                  <StatCard
                    label="Sacred Records"
                    value={records.length}
                    icon={<BarChart3 className="w-5 h-5" />}
                    color="purple"
                  />
                </div>

                <div className="relative z-10">
                  <RechartsChart
                    chartType={res.chartType}
                    chartData={res.chartData}
                  />
                </div>

                <AnimatePresence>
                  {isExpanded && res.summary && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.5 }}
                      className="mt-8 p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30 relative z-10"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{
                            duration: 3,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                        >
                          <Sparkles className="w-5 h-5 text-amber-400" />
                        </motion.div>
                        <h3 className="text-lg font-semibold text-amber-200">
                          Oracle's Prophecy
                        </h3>
                      </div>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {res.summary}
                      </ReactMarkdown>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          });
        })}
      </AnimatePresence>
    </div>
  );
};

export default DashboardView;
