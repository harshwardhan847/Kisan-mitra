// components/PriceDetailsModal.tsx
import React from "react";
import type { MarketDataResult } from "tools/getMarketData";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface PriceDetailsModalProps {
  data: MarketDataResult;
  onClose: () => void;
}

const PriceDetailsModal: React.FC<PriceDetailsModalProps> = ({
  data,
  onClose,
}) => {
  if (!data) return null;

  const records = data.records || [];
  const isSingle = records.length === 1;
  const hasMultiple = records.length > 1;

  const formatTooltip = (value: any) => `${value} ₹`;

  const computeStats = (records: any[]) => {
    const prices = records
      .map((r) => parseFloat(r.Modal_Price))
      .filter(Boolean);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = (
      prices.reduce((sum, val) => sum + val, 0) / prices.length
    ).toFixed(2);
    return { min, max, avg };
  };

  const stats = hasMultiple ? computeStats(records) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 max-h-[90vh] overflow-scroll text-white rounded-lg shadow-xl p-6 w-full max-w-[90%] border border-gray-700 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>

        {data.error ? (
          <div className="text-red-500 font-semibold">{data.error}</div>
        ) : (
          <>
            {isSingle && (
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-blue-400">
                  {records[0].Commodity} Market Price
                </h2>
                <p>
                  <strong>State:</strong> {records[0].State}
                </p>
                <p>
                  <strong>District:</strong> {records[0].District}
                </p>
                <p>
                  <strong>Market:</strong> {records[0].Market}
                </p>
                <p>
                  <strong>Date:</strong> {records[0].Arrival_Date}
                </p>
                <p>
                  <strong>Min Price:</strong> ₹{records[0].Min_Price}
                </p>
                <p>
                  <strong>Max Price:</strong> ₹{records[0].Max_Price}
                </p>
                <p>
                  <strong>Modal Price:</strong> ₹{records[0].Modal_Price}
                </p>
              </div>
            )}

            {hasMultiple && (
              <>
                <h2 className="text-2xl font-bold text-blue-400 mb-4">
                  {records[0].Commodity} Price Trends
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-md p-4">
                    <p className="text-sm text-gray-300">Minimum Price</p>
                    <p className="text-lg font-bold text-green-400">
                      ₹{stats?.min}
                    </p>
                  </div>
                  <div className="bg-gray-700 rounded-md p-4">
                    <p className="text-sm text-gray-300">Maximum Price</p>
                    <p className="text-lg font-bold text-red-400">
                      ₹{stats?.max}
                    </p>
                  </div>
                  <div className="bg-gray-700 rounded-md p-4">
                    <p className="text-sm text-gray-300">Average Price</p>
                    <p className="text-lg font-bold text-yellow-300">
                      ₹{stats?.avg}
                    </p>
                  </div>
                </div>

                <div className="w-full h-64">
                  <ResponsiveContainer>
                    <LineChart
                      data={records}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="Arrival_Date" />
                      <YAxis domain={["auto", "auto"]} />
                      <Tooltip formatter={formatTooltip} />
                      <Line
                        type="monotone"
                        dataKey="Modal_Price"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}

        {data.summary && (
          <div className="mt-6 p-4 bg-gray-700 rounded-md text-gray-200 prose prose-invert max-w-none w-full">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.summary}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceDetailsModal;
