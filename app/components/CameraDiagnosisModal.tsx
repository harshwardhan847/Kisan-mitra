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
  Eye,
  Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-500/30 overflow-hidden"
          >
            {/* Magical background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute top-0 left-0 w-full h-full opacity-20"
                animate={{
                  background: [
                    "radial-gradient(circle at 20% 20%, #fbbf2420 0%, transparent 50%)",
                    "radial-gradient(circle at 80% 80%, #8b5cf620 0%, transparent 50%)",
                    "radial-gradient(circle at 20% 20%, #fbbf2420 0%, transparent 50%)",
                  ],
                }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
              />
              {/* Floating magical particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-amber-400 rounded-full"
                  animate={{
                    x: [0, Math.cos(i * 0.8) * 100, 0],
                    y: [0, Math.sin(i * 0.8) * 100, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 4 + i * 0.5,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.3,
                    ease: "easeInOut",
                  }}
                  style={{
                    left: `${20 + i * 10}%`,
                    top: `${20 + i * 8}%`,
                  }}
                />
              ))}
            </div>

            {/* Header */}
            <div className="relative p-6 border-b border-amber-500/20 bg-gradient-to-r from-purple-900/50 to-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(251, 191, 36, 0.3)",
                        "0 0 30px rgba(251, 191, 36, 0.5)",
                        "0 0 20px rgba(251, 191, 36, 0.3)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    <Eye className="w-6 h-6 text-slate-900" />
                  </motion.div>
                  <div>
                    <motion.h2
                      className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                      style={{ backgroundSize: "200% 200%" }}
                    >
                      Magical Plant Divination
                    </motion.h2>
                    <p className="text-sm text-amber-200/70">
                      Reveal the secrets hidden within your specimen
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={handleClose}
                  className="p-2 hover:bg-amber-500/20 rounded-xl transition-all duration-200 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/40"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 relative z-10">
              {/* Upload Area */}
              {!preview && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer group ${
                    isDragOver
                      ? "border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                      : "border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-500/5"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Magical shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatDelay: 2,
                    }}
                  />

                  <div className="flex flex-col items-center space-y-4 relative z-10">
                    <motion.div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isDragOver ? "bg-amber-500/20" : "bg-slate-800/50"
                      }`}
                      animate={{
                        scale: isDragOver ? [1, 1.1, 1] : 1,
                        rotate: isProcessing ? 360 : 0,
                      }}
                      transition={{
                        scale: {
                          duration: 1,
                          repeat: isDragOver ? Number.POSITIVE_INFINITY : 0,
                        },
                        rotate: {
                          duration: 2,
                          repeat: isProcessing ? Number.POSITIVE_INFINITY : 0,
                          ease: "linear",
                        },
                      }}
                    >
                      {isProcessing ? (
                        <Wand2 className="w-8 h-8 text-amber-400" />
                      ) : (
                        <Upload
                          className={`w-8 h-8 ${
                            isDragOver ? "text-amber-400" : "text-amber-500"
                          }`}
                        />
                      )}
                    </motion.div>

                    <div className="text-center">
                      <motion.h3
                        className="text-lg font-semibold text-amber-200 mb-2"
                        animate={{ opacity: isProcessing ? [1, 0.5, 1] : 1 }}
                        transition={{
                          duration: 1,
                          repeat: isProcessing ? Number.POSITIVE_INFINITY : 0,
                        }}
                      >
                        {isProcessing
                          ? "Channeling magical energies..."
                          : "Summon your plant specimen"}
                      </motion.h3>
                      <p className="text-amber-300/70 mb-4">
                        Cast your image into the mystical realm, or invoke the
                        file browser
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 text-xs text-amber-400/60">
                        {["JPG", "PNG", "WEBP"].map((format, i) => (
                          <motion.span
                            key={format}
                            className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full"
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.3,
                            }}
                          >
                            {format}
                          </motion.span>
                        ))}
                      </div>
                    </div>

                    {/* Floating sparkles around upload area */}
                    {isDragOver &&
                      [...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-amber-400 rounded-full"
                          animate={{
                            x: [0, Math.cos(i * 1.05) * 60, 0],
                            y: [0, Math.sin(i * 1.05) * 60, 0],
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: i * 0.2,
                            ease: "easeInOut",
                          }}
                          style={{
                            left: "50%",
                            top: "50%",
                          }}
                        />
                      ))}
                  </div>

                  {/* Camera hint */}
                  <motion.div
                    className="absolute top-4 right-4"
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/70 backdrop-blur-xl rounded-full border border-amber-500/20">
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-amber-300">
                        Scrying Glass Ready
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Image Preview */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="space-y-4"
                  >
                    <div className="relative bg-slate-800/30 rounded-2xl p-4 border border-amber-500/20 group">
                      <div className="flex items-center space-x-2 mb-4">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{
                            duration: 3,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                        >
                          <ImageIcon className="w-5 h-5 text-amber-400" />
                        </motion.div>
                        <span className="font-medium text-amber-200">
                          Captured Specimen
                        </span>
                        <div className="flex-1"></div>
                        <motion.button
                          onClick={() => setPreview(null)}
                          className="p-1 hover:bg-amber-500/20 rounded-lg transition-all duration-200 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/40"
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>

                      <motion.div
                        className="relative overflow-hidden rounded-xl bg-slate-900/50 border border-amber-500/20"
                        whileHover={{ scale: 1.02 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      >
                        <img
                          src={preview || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                        {/* Magical scanning effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                        />

                        {/* Corner sparkles */}
                        {[
                          { top: "10px", left: "10px" },
                          { top: "10px", right: "10px" },
                          { bottom: "10px", left: "10px" },
                          { bottom: "10px", right: "10px" },
                        ].map((pos, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-amber-400 rounded-full"
                            style={pos}
                            animate={{
                              scale: [0, 1, 0],
                              opacity: [0, 1, 0],
                              rotate: [0, 180, 360],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.5,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
                      >
                        <div className="flex items-center space-x-2">
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            }}
                          >
                            <Sparkles className="w-4 h-4 text-amber-400" />
                          </motion.div>
                          <span className="text-sm text-amber-200">
                            Specimen prepared for mystical analysis
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Magical Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-4 relative overflow-hidden"
              >
                {/* Magical background effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-indigo-500/10 to-purple-500/5"
                  animate={{
                    background: [
                      "linear-gradient(45deg, #8b5cf610 0%, #6366f110 50%, #8b5cf610 100%)",
                      "linear-gradient(45deg, #6366f110 0%, #8b5cf610 50%, #6366f110 100%)",
                      "linear-gradient(45deg, #8b5cf610 0%, #6366f110 50%, #8b5cf610 100%)",
                    ],
                  }}
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                />

                <div className="flex items-start space-x-3 relative z-10">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  </motion.div>
                  <div>
                    <h4 className="font-medium text-purple-200 mb-2">
                      Ancient Wisdom for Perfect Divination:
                    </h4>
                    <ul className="text-sm text-purple-100/80 space-y-1">
                      {[
                        "Ensure the mystical light illuminates your specimen clearly",
                        "Focus the scrying lens upon the afflicted regions",
                        "Include surrounding healthy essence for comparison",
                        "Banish shadows and reflective enchantments",
                      ].map((tip, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex items-center space-x-2"
                        >
                          <motion.div
                            className="w-1 h-1 bg-purple-400 rounded-full"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.3,
                            }}
                          />
                          <span>{tip}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 border-t border-amber-500/20 bg-gradient-to-r from-slate-900/50 to-purple-900/50 relative"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-amber-300/70">
                  Your specimen shall be analyzed by the most powerful magical
                  algorithms
                </div>
                <div className="flex items-center space-x-3">
                  <motion.button
                    onClick={handleClose}
                    className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl font-medium transition-all duration-200 border border-slate-600/50 hover:border-slate-500/50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Dismiss
                  </motion.button>
                  <motion.button
                    onClick={handleCapture}
                    disabled={!preview}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-600 disabled:to-gray-700 text-slate-900 hover:text-slate-800 disabled:text-gray-400 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-amber-500/25 disabled:shadow-none flex items-center space-x-2 border border-amber-400/30 disabled:border-gray-600/30 relative overflow-hidden"
                    whileHover={{ scale: preview ? 1.05 : 1 }}
                    whileTap={{ scale: preview ? 0.95 : 1 }}
                  >
                    {/* Button magical effect */}
                    {preview && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatDelay: 2,
                        }}
                      />
                    )}
                    <Check className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Begin Divination</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CameraDiagnosisModal;
