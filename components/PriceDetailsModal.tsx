// components/PriceDetailsModal.tsx
import React from "react";
import type { MarketData } from "tools/getMarketData"; // Import the MarketData interface

interface PriceDetailsModalProps {
  data: MarketData;
  onClose: () => void;
}

const PriceDetailsModal: React.FC<PriceDetailsModalProps> = ({
  data,
  onClose,
}) => {
  if (!data) return null; // Don't render if no data

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 text-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        {data.error ? (
          <div>
            <h2 className="text-xl font-bold mb-4 text-red-400">
              Error Fetching Price
            </h2>
            <p className="mb-2">
              Could not retrieve market data for {data.commodityName}.
            </p>
            <p className="text-sm text-red-300">Details: {data.error}</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-4 text-blue-300">
              {data.commodityName} Market Price
            </h2>
            <p className="mb-1">
              <strong>State:</strong> {data.state}
            </p>
            <p className="mb-1">
              <strong>District:</strong> {data.district}
            </p>
            <p className="mb-1">
              <strong>Market:</strong> {data.market}
            </p>
            <p className="mb-1">
              <strong>Arrival Date:</strong> {data.arrival_date}
            </p>
            <p className="mb-1">
              <strong>Min Price:</strong> {data.min_price}
            </p>
            <p className="mb-1">
              <strong>Max Price:</strong> {data.max_price}
            </p>
            <p className="mb-4">
              <strong>Modal Price:</strong> {data.modal_price}
            </p>
            <p className="text-sm italic text-gray-400">{data.trends}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceDetailsModal;
