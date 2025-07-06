import React from "react";
import type { MandiRecord, MarketDataResult } from "../../tools/getMarketData";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
interface StatCardProps {
  label: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value }) => (
  <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center min-w-[120px]">
    <div className="text-xs text-blue-200 mb-1">{label}</div>
    <div className="text-xl font-bold text-blue-400">{value}</div>
  </div>
);

interface ChartCardProps {
  data: MandiRecord[];
  groupBy?: "State" | "Market" | "District";
}

// Simple bar chart using SVG (no external deps)
const ChartCard: React.FC<ChartCardProps> = ({ data, groupBy = "Market" }) => {
  if (!data || data.length === 0) return null;
  // Group by selected key and average modal price
  const groups: Record<string, number[]> = {};
  data.forEach((r) => {
    const key = r[groupBy] || "Unknown";
    const price = parseFloat(r.Modal_Price);
    if (!isNaN(price)) {
      if (!groups[key]) groups[key] = [];
      groups[key].push(price);
    }
  });
  const chartData = Object.entries(groups).map(([k, arr]) => ({
    label: k,
    avg: arr.reduce((a, b) => a + b, 0) / arr.length,
  }));
  const max = Math.max(...chartData.map((d) => d.avg));
  return (
    <div className="w-full max-w-xl mx-auto bg-gray-900 rounded-lg p-4 mt-4">
      <div className="text-blue-200 text-sm mb-2">
        Average Modal Price by {groupBy}
      </div>
      <svg width="100%" height={chartData.length * 32}>
        {chartData.map((d, i) => (
          <g key={d.label} transform={`translate(0,${i * 32})`}>
            <text x={0} y={20} fontSize={14} fill="#aee">
              {d.label}
            </text>
            <rect
              x={120}
              y={6}
              height={18}
              width={(d.avg / max) * 300}
              fill="#4f8cff"
              rx={4}
            />
            <text
              x={130 + (d.avg / max) * 300}
              y={20}
              fontSize={13}
              fill="#fff"
            >
              {d.avg.toFixed(0)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

interface DashboardViewProps {
  results: (MarketDataResult | Record<string, MarketDataResult>)[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ results }) => {
  // Render each result as a chat bubble/card, oldest at top
  return (
    <div className="w-full flex flex-col items-center gap-6 max-h-[80vh] overflow-y-scroll">
      {results.map((result, chatIdx) => {
        const resultsArr = Array.isArray(result)
          ? result
          : typeof result === "object" && !("records" in result)
          ? Object.entries(result as Record<string, MarketDataResult>).map(
              ([region, res]) => ({ ...res, region })
            )
          : [result];
        return resultsArr.map((res, idx) => {
          const records: MandiRecord[] = res.records || [];
          // Stats
          const modalPrices: number[] = records
            .map((r: MandiRecord) => parseFloat(r.Modal_Price))
            .filter((n: number) => !isNaN(n));
          const min = modalPrices.length ? Math.min(...modalPrices) : null;
          const max = modalPrices.length ? Math.max(...modalPrices) : null;
          const avg = modalPrices.length
            ? modalPrices.reduce((a: number, b: number) => a + b, 0) /
              modalPrices.length
            : null;
          return (
            <div
              key={chatIdx + "-" + idx}
              className="w-full max-w-2xl bg-gray-950 rounded-xl p-6 shadow-lg border border-blue-900"
            >
              {res.region && (
                <div className="text-blue-300 text-lg mb-2 font-semibold">
                  {res.region}
                </div>
              )}
              <div className="flex flex-wrap gap-4 mb-4">
                <StatCard
                  label="Min Modal Price"
                  value={min !== null ? min : "-"}
                />
                <StatCard
                  label="Max Modal Price"
                  value={max !== null ? max : "-"}
                />
                <StatCard
                  label="Avg Modal Price"
                  value={avg !== null ? avg.toFixed(0) : "-"}
                />
                <StatCard label="Records" value={records.length} />
              </div>
              <ChartCard
                data={records}
                groupBy={
                  records.length > 0 && records[0].State !== undefined
                    ? "Market"
                    : "State"
                }
              />
              {res.summary && (
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
