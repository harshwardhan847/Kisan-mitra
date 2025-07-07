import React, { useRef, useState } from "react";

interface CameraDiagnosisModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (image: string) => void;
}

const CameraDiagnosisModal: React.FC<CameraDiagnosisModalProps> = ({
  open,
  onClose,
  onCapture,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setPreview(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg flex flex-col items-center">
        <h2 className="text-white mb-4">Capture Image of Crop Disease</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="mb-4"
        />
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="max-w-xs max-h-60 mb-4 rounded"
          />
        )}
        <div className="flex gap-4">
          <button
            onClick={handleCapture}
            disabled={!preview}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Use Image
          </button>
          <button
            onClick={() => {
              setPreview(null);
              onClose();
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraDiagnosisModal;
