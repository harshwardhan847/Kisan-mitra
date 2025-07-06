// components/PriceDetailsModal.tsx
import React from "react";
import type { MarketDataResult } from "tools/getMarketData"; // Import the MandiRecord interface
import ReactMarkdown from "react-markdown"; // <--- ADD THIS IMPORT
import remarkGfm from "remark-gfm";

interface PriceDetailsModalProps {
  data: MarketDataResult;
  onClose: () => void;
}

const PriceDetailsModal: React.FC<PriceDetailsModalProps> = ({
  data,
  onClose,
}) => {
  if (!data) return null; // Don't render if no data

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 max-h-[90vh] overflow-scroll text-white rounded-lg shadow-xl p-6 w-full max-w-[90%] border border-gray-700 relative">
        <button
          onClick={onClose}
          className="sticky top-3 left-3 text-gray-400 hover:text-gray-200 text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>

        {data.error ? (
          <div className="">{data.error}</div>
        ) : (
          data?.records?.map((data, idx) => (
            <div>
              <h2 className="text-xl font-bold mb-4 text-blue-300">
                {data.Commodity} Market Price
              </h2>
              <p className="mb-1">
                <strong>State:</strong> {data.State}
              </p>
              <p className="mb-1">
                <strong>District:</strong> {data.District}
              </p>
              <p className="mb-1">
                <strong>Market:</strong> {data.Market}
              </p>
              <p className="mb-1">
                <strong>Arrival Date:</strong> {data.Arrival_Date}
              </p>
              <p className="mb-1">
                <strong>Min Price:</strong> {data.Min_Price}
              </p>
              <p className="mb-1">
                <strong>Max Price:</strong> {data.Max_Price}
              </p>
              <p className="mb-4">
                <strong>Modal Price:</strong> {data.Modal_Price}
              </p>
            </div>
          ))
        )}

        {/* <--- ADD ReactMarkdown COMPONENT HERE */}
        <div className="mt-4 p-3 bg-gray-700 rounded-md text-gray-200 prose prose-invert max-w-none w-full">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.summary}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default PriceDetailsModal;
