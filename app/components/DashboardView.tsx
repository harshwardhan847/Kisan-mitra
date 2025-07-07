import React from "react";
import type { MandiRecord, MarketDataResult } from "../../tools/getMarketData";
import type { GovernmentSchemesResult } from "../../tools/getGovernmentSchemes";
import type { CropDiseaseDiagnosis } from "../../tools/diagnoseCropDisease";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// Recharts imports
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

// RechartsChart: renders recharts chart based on chartType and chartData
const RechartsChart: React.FC<{ chartType?: string; chartData?: any }> = ({
  chartType,
  chartData,
}) => {
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
    // For grouped bar, keys are all markets except 'date'
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
};

export type ToolResponse =
  | MarketDataResult
  | Record<string, MarketDataResult>
  | GovernmentSchemesResult
  | CropDiseaseDiagnosis
  | { error: string };
interface DashboardViewProps {
  results: ToolResponse[];
  onDiagnoseCropDisease?: (image: string) => Promise<void>;
  isDiagnosing?: boolean;
}

const SchemeCard: React.FC<{ result: GovernmentSchemesResult }> = ({
  result,
}) => (
  <div className="w-full max-w-2xl bg-gray-950 rounded-xl p-6 shadow-lg border border-green-900">
    <div className="text-green-300 text-lg mb-2 font-semibold">
      Government Schemes
    </div>
    <div className="mb-2 text-blue-100">{result.summary}</div>
    {result.schemes && result.schemes.length > 0 ? (
      <ul className="space-y-3">
        {result.schemes.map((scheme, i) => (
          <li key={i} className="bg-gray-800 rounded p-3">
            <div className="font-bold text-green-200">{scheme.name}</div>
            <div className="text-blue-100 text-sm mb-1">{scheme.summary}</div>
            <div className="text-xs text-blue-300 mb-1">
              Category: {scheme.category}
            </div>
            <a
              href={scheme.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline text-xs"
            >
              Apply / More Info
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <div className="text-yellow-300 text-sm mt-2">
        No schemes found. Please contact your nearest KVK or CSC for help.
      </div>
    )}
  </div>
);

const DiseaseCard: React.FC<{ result: CropDiseaseDiagnosis }> = ({
  result,
}) => (
  <div className="w-full max-w-2xl bg-gray-950 rounded-xl p-6 shadow-lg border border-red-900">
    <div className="text-red-300 text-lg mb-2 font-semibold">
      Crop Disease Diagnosis
    </div>
    {result.markdown ? (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {result.markdown}
      </ReactMarkdown>
    ) : (
      <>
        <div className="mb-2">
          <span className="font-bold text-red-200">Disease:</span>{" "}
          {result.diseaseName}
        </div>
        <div className="mb-2">
          <span className="font-bold text-blue-200">Cause:</span> {result.cause}
        </div>
        <div className="mb-2">
          <span className="font-bold text-green-200">Treatment Steps:</span>
          <ul className="list-disc ml-6 text-blue-100">
            {result.treatment.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
        {result.warnings && result.warnings.length > 0 && (
          <div className="mb-2">
            <span className="font-bold text-yellow-300">Warnings:</span>
            <ul className="list-disc ml-6 text-yellow-200">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    )}
  </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({
  results,
  onDiagnoseCropDisease,
  isDiagnosing,
}) => {
  return (
    <div className="w-full flex flex-col items-center gap-6 max-h-[80vh] overflow-y-scroll">
      {/* Only render results as cards */}
      {results.map((result, chatIdx) => {
        // Defensive: skip null/undefined
        if (!result) return null;
        // Defensive: avoid misdetection for object-wrapped market data
        if (
          typeof result === "object" &&
          result !== null &&
          Object.prototype.hasOwnProperty.call(result, "schemes") &&
          Array.isArray((result as any).schemes) &&
          Object.prototype.hasOwnProperty.call(result, "summary") &&
          typeof (result as any).summary === "string" &&
          Object.prototype.hasOwnProperty.call(result, "language")
        ) {
          return (
            <SchemeCard
              key={chatIdx}
              result={result as unknown as GovernmentSchemesResult}
            />
          );
        }
        if (
          typeof result === "object" &&
          result !== null &&
          Object.prototype.hasOwnProperty.call(result, "diseaseName") &&
          typeof (result as any).diseaseName === "string" &&
          Object.prototype.hasOwnProperty.call(result, "cause") &&
          typeof (result as any).cause === "string" &&
          Object.prototype.hasOwnProperty.call(result, "treatment") &&
          Array.isArray((result as any).treatment) &&
          Object.prototype.hasOwnProperty.call(result, "warnings") &&
          Array.isArray((result as any).warnings) &&
          Object.prototype.hasOwnProperty.call(result, "language")
        ) {
          return (
            <DiseaseCard
              key={chatIdx}
              result={result as unknown as CropDiseaseDiagnosis}
            />
          );
        }
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
          // Get commodity name and date range (robust to both PascalCase and camelCase)
          const getField = (r: any, key: string) =>
            r[key] ??
            r[key.charAt(0).toLowerCase() + key.slice(1)] ??
            r[key.toUpperCase()];
          const commodity =
            records.length > 0 ? getField(records[0], "Commodity") || "-" : "-";
          let dateRange = "-";
          if (records.length > 0) {
            const dates = records
              .map((r) => getField(r, "Arrival_Date"))
              .sort();
            const first = dates[0];
            const last = dates[dates.length - 1];
            dateRange = first === last ? first : `${first} to ${last}`;
          }
          // Fix: Use correct price fields for min/max/avg if only lowercase keys exist
          const getPrice = (r: any, key: string) =>
            parseFloat(getField(r, key));
          const minFixed = records.length
            ? Math.min(
                ...records
                  .map((r) => getPrice(r, "Min_Price"))
                  .filter((n) => !isNaN(n))
              )
            : null;
          const maxFixed = records.length
            ? Math.max(
                ...records
                  .map((r) => getPrice(r, "Max_Price"))
                  .filter((n) => !isNaN(n))
              )
            : null;
          const avgFixed = records.length
            ? records
                .map((r) => getPrice(r, "Modal_Price"))
                .filter((n) => !isNaN(n))
                .reduce((a, b) => a + b, 0) / records.length
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
              {/* Commodity and Date Range */}
              <div className="flex flex-wrap gap-4 mb-4 items-center">
                <div className="bg-blue-900 text-blue-100 rounded px-3 py-1 text-sm font-semibold">
                  Crop: {commodity}
                </div>
                <div className="bg-gray-800 text-blue-200 rounded px-3 py-1 text-sm">
                  Date: {dateRange}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mb-4">
                <StatCard
                  label="Min Modal Price"
                  value={
                    minFixed !== null &&
                    minFixed !== undefined &&
                    !isNaN(minFixed)
                      ? minFixed
                      : "-"
                  }
                />
                <StatCard
                  label="Max Modal Price"
                  value={
                    maxFixed !== null &&
                    maxFixed !== undefined &&
                    !isNaN(maxFixed)
                      ? maxFixed
                      : "-"
                  }
                />
                <StatCard
                  label="Avg Modal Price"
                  value={
                    avgFixed !== null &&
                    avgFixed !== undefined &&
                    !isNaN(avgFixed)
                      ? avgFixed.toFixed(0)
                      : "-"
                  }
                />
                <StatCard label="Records" value={records.length} />
              </div>
              {/* <ChartCard
                data={records}
                groupBy={
                  records.length > 0 &&
                  getField(records[0], "State") !== undefined
                    ? "Market"
                    : "State"
                }
              /> */}
              <RechartsChart
                chartType={res.chartType}
                chartData={res.chartData}
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
