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
      blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
      green:
        "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400",
      amber:
        "from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400",
      red: "from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400",
      purple:
        "from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400",
    };

    return (
      <div
        className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl rounded-2xl border shadow-lg p-6 flex flex-col items-center min-w-[140px] transition-all duration-300 hover:scale-105 hover:shadow-xl`}
      >
        <div className="flex items-center space-x-2 mb-3">
          {icon && <div className="opacity-80">{icon}</div>}
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
        <div className="text-xs text-slate-300 mb-2 text-center font-medium">
          {label}
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
    );
  }
);

const RechartsChart = React.memo(
  ({ chartType, chartData }: { chartType?: string; chartData?: any }) => {
    if (!chartType || !chartData || chartData.length === 0) return null;

    const customTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-2xl">
            <p className="text-slate-200 font-medium mb-2">{`${label}`}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {`${entry.name}: ${entry.value}`}
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    if (chartType === "line") {
      return (
        <div className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-slate-200">
              Price Trends
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.3}
              />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey="modal"
                stroke="#06b6d4"
                strokeWidth={3}
                name="Modal Price"
                dot={{ fill: "#06b6d4", strokeWidth: 2, r: 4 }}
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
        </div>
      );
    }

    if (chartType === "bar") {
      return (
        <div className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-200">
              Market Comparison
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.3}
              />
              <XAxis dataKey="market" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar
                dataKey="modal"
                fill="#3b82f6"
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
        </div>
      );
    }

    if (chartType === "grouped-bar") {
      const keys = Object.keys(chartData[0] || {}).filter((k) => k !== "date");
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

      return (
        <div className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-200">
              Grouped Analysis
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.3}
              />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
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
        </div>
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
    <div className="w-full flex flex-col items-center gap-8 max-h-[80vh] overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
      {results.map((result, i) => {
        if (!result) return <React.Fragment key={i} />;

        // Government Schemes
        if (
          "schemes" in result &&
          "summary" in result &&
          "language" in result
        ) {
          const schemesResult = result as GovernmentSchemesResult;
          return (
            <div
              key={"gov-" + i}
              className="w-full max-w-4xl bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-green-500/30 transition-all duration-300 hover:shadow-green-500/10"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-300">
                    Government Schemes
                  </h2>
                  <p className="text-sm text-slate-400">
                    Available support programs
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {schemesResult.summary}
                </ReactMarkdown>
              </div>

              <div className="grid gap-4">
                {schemesResult.schemes.map((s, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 hover:border-green-500/30 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-green-200 mb-2 group-hover:text-green-100 transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-slate-300 mb-3">{s.summary}</p>
                        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-300 font-medium">
                            {s.category}
                          </span>
                        </div>
                      </div>
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/25"
                      >
                        <span>Apply</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
          const isExpanded = expandedIndexes.has(key);

          return (
            <div
              key={key}
              className="w-full max-w-4xl bg-gradient-to-br from-red-900/20 to-pink-900/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-red-500/30 transition-all duration-300 hover:shadow-red-500/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-red-300">
                      Crop Disease Diagnosis
                    </h2>
                    <p className="text-sm text-slate-400">
                      AI-powered analysis results
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleExpand(key)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-600/50 transition-all duration-300 text-slate-300 hover:text-white"
                >
                  <span className="text-sm font-medium">
                    {isExpanded ? "Collapse" : "Expand"} Details
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="space-y-6">
                  {diseaseResult.markdown ? (
                    <div className="p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {diseaseResult.markdown}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30">
                        <div className="flex items-center space-x-2 mb-3">
                          <Leaf className="w-5 h-5 text-red-400" />
                          <span className="font-bold text-red-200">
                            Disease Identified:
                          </span>
                        </div>
                        <p className="text-slate-200 text-lg">
                          {diseaseResult.diseaseName}
                        </p>
                      </div>

                      <div className="p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30">
                        <div className="flex items-center space-x-2 mb-3">
                          <Info className="w-5 h-5 text-blue-400" />
                          <span className="font-bold text-blue-200">
                            Root Cause:
                          </span>
                        </div>
                        <p className="text-slate-200">{diseaseResult.cause}</p>
                      </div>

                      <div className="p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30">
                        <div className="flex items-center space-x-2 mb-4">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="font-bold text-green-200">
                            Treatment Steps:
                          </span>
                        </div>
                        <div className="space-y-3">
                          {diseaseResult.treatment.map((step, idx) => (
                            <div
                              key={idx}
                              className="flex items-start space-x-3 p-3 bg-slate-800/30 rounded-xl"
                            >
                              <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-green-400">
                                  {idx + 1}
                                </span>
                              </div>
                              <p className="text-slate-200">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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

          const isExpanded = expandedIndexes.has(key);

          return (
            <div
              key={key}
              className="w-full max-w-4xl bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-blue-500/30 transition-all duration-300 hover:shadow-blue-500/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-300">
                      Market Analysis
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Leaf className="w-4 h-4" />
                        <span>{records[0]?.Commodity || "N/A"}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{dateRange}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {res.summary && (
                  <button
                    onClick={() => toggleExpand(key)}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-600/50 transition-all duration-300 text-slate-300 hover:text-white"
                  >
                    <span className="text-sm font-medium">
                      {isExpanded ? "Collapse" : "Expand"} Summary
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Min Modal Price"
                  value={min}
                  icon={<TrendingDown className="w-5 h-5" />}
                  color="green"
                />
                <StatCard
                  label="Max Modal Price"
                  value={max}
                  icon={<TrendingUp className="w-5 h-5" />}
                  color="red"
                />
                <StatCard
                  label="Avg Modal Price"
                  value={avg}
                  icon={<Activity className="w-5 h-5" />}
                  color="blue"
                />
                <StatCard
                  label="Total Records"
                  value={records.length}
                  icon={<BarChart3 className="w-5 h-5" />}
                  color="purple"
                />
              </div>

              <RechartsChart
                chartType={res.chartType}
                chartData={res.chartData}
              />

              {isExpanded && res.summary && (
                <div className="mt-8 p-6 bg-slate-900/30 rounded-2xl border border-slate-700/30">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-semibold text-slate-200">
                      AI Summary
                    </h3>
                  </div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {res.summary}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        });
      })}
    </div>
  );
};

export default DashboardView;
