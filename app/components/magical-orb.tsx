"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface MagicalOrbProps {
  isActive?: boolean
  size?: number
  color?: string
}

export function MagicalOrb({ isActive = false, size = 100, color = "#fbbf24" }: MagicalOrbProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0)

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setPulseIntensity(Math.random())
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isActive])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Core orb */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}80, ${color}40, ${color}20)`,
          boxShadow: `0 0 ${size / 4}px ${color}60, inset 0 0 ${size / 8}px ${color}40`,
        }}
        animate={{
          scale: isActive ? [1, 1.1, 1] : 1,
          opacity: isActive ? [0.8, 1, 0.8] : 0.6,
        }}
        transition={{
          duration: 2,
          repeat: isActive ? Number.POSITIVE_INFINITY : 0,
          ease: "easeInOut",
        }}
      />

      {/* Outer glow rings */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute inset-0 rounded-full border opacity-20"
          style={{
            borderColor: color,
            borderWidth: 1,
            transform: `scale(${1 + ring * 0.2})`,
          }}
          animate={{
            scale: isActive ? [1 + ring * 0.2, 1 + ring * 0.3, 1 + ring * 0.2] : 1 + ring * 0.2,
            opacity: isActive ? [0.1, 0.3, 0.1] : 0.1,
          }}
          transition={{
            duration: 3 + ring,
            repeat: isActive ? Number.POSITIVE_INFINITY : 0,
            ease: "easeInOut",
            delay: ring * 0.2,
          }}
        />
      ))}

      {/* Energy particles */}
      {isActive && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: color,
                left: "50%",
                top: "50%",
                transformOrigin: "0 0",
              }}
              animate={{
                rotate: [0, 360],
                x: [0, (Math.cos((i * Math.PI) / 4) * size) / 2],
                y: [0, (Math.sin((i * Math.PI) / 4) * size) / 2],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
