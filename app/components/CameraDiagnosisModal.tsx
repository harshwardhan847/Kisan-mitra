"use client";

import type React from "react";
import { useRef, useState } from "react";
import {
  Camera,
  Upload,
  X,
  Check,
  ImageIcon,
  Sparkles,
  AlertCircle,
} from "lucide-react";

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setPreview(ev.target.result as string);
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = () => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setIsProcessing(false);
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        processFile(file);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Crop Disease Analysis
                </h2>
                <p className="text-sm text-slate-400">
                  Upload or capture an image for AI diagnosis
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-800/50 rounded-xl transition-all duration-200 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Area */}
          {!preview && (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${
                isDragOver
                  ? "border-green-400 bg-green-500/10"
                  : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/30"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center space-y-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isDragOver ? "bg-green-500/20" : "bg-slate-800/50"
                  }`}
                >
                  {isProcessing ? (
                    <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload
                      className={`w-8 h-8 ${
                        isDragOver ? "text-green-400" : "text-slate-400"
                      }`}
                    />
                  )}
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {isProcessing ? "Processing image..." : "Upload crop image"}
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Drag and drop your image here, or click to browse
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-1 bg-slate-800/50 rounded-full">
                      JPG
                    </span>
                    <span className="px-2 py-1 bg-slate-800/50 rounded-full">
                      PNG
                    </span>
                    <span className="px-2 py-1 bg-slate-800/50 rounded-full">
                      WEBP
                    </span>
                  </div>
                </div>
              </div>

              {/* Camera hint */}
              <div className="absolute top-4 right-4">
                <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/70 rounded-full">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400">
                    Camera supported
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {preview && (
            <div className="space-y-4">
              <div className="relative bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
                <div className="flex items-center space-x-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-green-400" />
                  <span className="font-medium text-slate-200">
                    Image Preview
                  </span>
                  <div className="flex-1"></div>
                  <button
                    onClick={() => setPreview(null)}
                    className="p-1 hover:bg-slate-700/50 rounded-lg transition-all duration-200 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-slate-900/50">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-200">
                      Ready for AI analysis
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-200 mb-2">
                  Tips for better results:
                </h4>
                <ul className="text-sm text-amber-100/80 space-y-1">
                  <li>• Ensure good lighting and clear focus</li>
                  <li>• Capture the affected area up close</li>
                  <li>• Include surrounding healthy tissue for comparison</li>
                  <li>• Avoid shadows and reflections</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Your image will be analyzed using advanced AI models
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl font-medium transition-all duration-200 border border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
                disabled={!preview}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-green-500/25 disabled:shadow-none flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Analyze Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraDiagnosisModal;
