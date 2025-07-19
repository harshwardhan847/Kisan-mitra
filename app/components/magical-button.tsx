"use client";

import { motion } from "framer-motion";
import { type ReactNode, useState } from "react";

interface MagicalButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MagicalButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  className = "",
}: MagicalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const variants = {
    primary: "from-amber-400 via-yellow-500 to-amber-600",
    secondary: "from-purple-500 via-indigo-600 to-purple-700",
    danger: "from-red-500 via-red-600 to-red-700",
    warning: "from-orange-400 via-amber-500 to-orange-600",
  };

  const sizes = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <motion.button
      className={`
        relative group rounded-2xl transition-all duration-300 transform
        bg-gradient-to-br ${variants[variant]}
        ${sizes[size]}
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:scale-105"
        }
        shadow-lg hover:shadow-2xl
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTapStart={() => setIsPressed(true)}
      //@ts-ignore
      onTapEnd={() => setIsPressed(false)}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
    >
      {/* Magical glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at center, ${
            variant === "primary"
              ? "#fbbf24"
              : variant === "secondary"
              ? "#8b5cf6"
              : variant === "danger"
              ? "#ef4444"
              : "#f59e0b"
          }40, transparent 70%)`,
          filter: "blur(8px)",
        }}
        animate={{
          scale: isHovered ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: isHovered ? Number.POSITIVE_INFINITY : 0,
          ease: "easeInOut",
        }}
      />

      {/* Sparkle effects */}
      {isHovered && (
        <>
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0,
            }}
          />
          <motion.div
            className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-300 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              rotate: [0, -180, -360],
            }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.3,
            }}
          />
          <motion.div
            className="absolute top-1/2 -right-2 w-1 h-1 bg-amber-200 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.6,
            }}
          />
        </>
      )}

      {/* Button content */}
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </motion.button>
  );
}
