import React, { useMemo, useState } from "react";
import type { MandiRecord, MarketDataResult } from "../../tools/getMarketData";
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

interface StatCardProps {
  label: string;
  value: string | number;
}

const StatCard = React.memo(({ label, value }: StatCardProps) => (
  <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center min-w-[120px]">
    <div className="text-xs text-blue-200 mb-1">{label}</div>
    <div className="text-xl font-bold text-blue-400">{value}</div>
  </div>
));

const RechartsChart = React.memo(
  ({ chartType, chartData }: { chartType?: string; chartData?: any }) => {
    if (!chartType || !chartData || chartData.length === 0) return null;
    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="modal"
              stroke="#4f8cff"
              name="Modal Price"
            />
            <Line
              type="monotone"
              dataKey="min"
              stroke="#82ca9d"
              name="Min Price"
            />
            <Line
              type="monotone"
              dataKey="max"
              stroke="#ff7300"
              name="Max Price"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="market" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="modal" fill="#4f8cff" name="Modal Price" />
            <Bar dataKey="min" fill="#82ca9d" name="Min Price" />
            <Bar dataKey="max" fill="#ff7300" name="Max Price" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "grouped-bar") {
      const keys = Object.keys(chartData[0] || {}).filter((k) => k !== "date");
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {keys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={["#4f8cff", "#82ca9d", "#ff7300", "#8884d8"][idx % 4]}
                name={key}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
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
    <div className="w-full flex flex-col items-center gap-6 max-h-[80vh] overflow-y-scroll">
      {results.map((result, i) => {
        if (!result) return <React.Fragment key={i} />;

        if (
          "schemes" in result &&
          "summary" in result &&
          "language" in result
        ) {
          const schemesResult = result as GovernmentSchemesResult;
          return (
            <div
              key={"gov-" + i}
              className="w-full max-w-2xl bg-gray-950 rounded-xl p-6 shadow-lg border border-green-900"
            >
              <div className="text-green-300 text-lg mb-2 font-semibold">
                Government Schemes
              </div>
              <div className="mb-2 text-blue-100">{schemesResult.summary}</div>
              <ul className="space-y-3">
                {schemesResult.schemes.map((s, idx) => (
                  <li key={idx} className="bg-gray-800 rounded p-3">
                    <div className="font-bold text-green-200">{s.name}</div>
                    <div className="text-blue-100 text-sm mb-1">
                      {s.summary}
                    </div>
                    <div className="text-xs text-blue-300 mb-1">
                      Category: {s.category}
                    </div>
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline text-xs"
                    >
                      Apply / More Info
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (
          "diseaseName" in result &&
          "cause" in result &&
          "treatment" in result
        ) {
          const diseaseResult = result as CropDiseaseDiagnosis;
          const key = `dis-${i}`;
          return (
            <div
              key={key}
              className="w-full max-w-2xl bg-gray-950 rounded-xl p-6 shadow-lg border border-red-900"
            >
              <div className="text-red-300 text-lg mb-2 font-semibold">
                Crop Disease Diagnosis
              </div>
              <button
                onClick={() => toggleExpand(key)}
                className="text-xs text-blue-400 underline mb-2"
              >
                {expandedIndexes.has(key)
                  ? "Collapse Details"
                  : "Expand Details"}
              </button>
              {expandedIndexes.has(key) &&
                (diseaseResult.markdown ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {diseaseResult.markdown}
                  </ReactMarkdown>
                ) : (
                  <>
                    <div className="mb-2">
                      <span className="font-bold text-red-200">Disease:</span>{" "}
                      {diseaseResult.diseaseName}
                    </div>
                    <div className="mb-2">
                      <span className="font-bold text-blue-200">Cause:</span>{" "}
                      {diseaseResult.cause}
                    </div>
                    <div className="mb-2">
                      <span className="font-bold text-green-200">
                        Treatment Steps:
                      </span>
                      <ul className="list-disc ml-6 text-blue-100">
                        {diseaseResult.treatment.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ))}
            </div>
          );
        }

        const marketResults: MarketDataResult[] = Array.isArray(result)
          ? result
          : typeof result === "object" && "records" in result
          ? [result as MarketDataResult]
          : Object.values(result as Record<string, MarketDataResult>);

        return marketResults.map((res, j) => {
          const key = `mkt-${i}-${j}`;
          const records = res.records || [];
          const prices = records
            .map((r) => parseFloat(r.Modal_Price))
            .filter((n) => !isNaN(n));
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

          return (
            <div
              key={key}
              className="w-full max-w-2xl bg-gray-950 rounded-xl p-6 shadow-lg border border-blue-900"
            >
              <div className="text-blue-200 text-sm mb-2">
                Crop: {records[0]?.Commodity || "-"} | Date: {dateRange}
              </div>
              <div className="flex flex-wrap gap-4 mb-4">
                <StatCard label="Min Modal Price" value={min} />
                <StatCard label="Max Modal Price" value={max} />
                <StatCard label="Avg Modal Price" value={avg} />
                <StatCard label="Records" value={records.length} />
              </div>
              <RechartsChart
                chartType={res.chartType}
                chartData={res.chartData}
              />
              {res.summary && (
                <button
                  onClick={() => toggleExpand(key)}
                  className="text-xs text-blue-400 underline mb-2"
                >
                  {expandedIndexes.has(key)
                    ? "Collapse Summary"
                    : "Expand Summary"}
                </button>
              )}
              {expandedIndexes.has(key) && res.summary && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {res.summary}
                </ReactMarkdown>
              )}
            </div>
          );
        });
      })}
    </div>
  );
};

export default DashboardView;
