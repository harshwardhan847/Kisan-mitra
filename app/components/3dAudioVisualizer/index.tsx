import React, { useRef, useEffect } from "react";
import { useAudioContexts } from "~/hooks/useAudioContexts";

export default function LiveAudioVisual2D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { inputAudioContext } = useAudioContexts();
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !inputAudioContext) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (!width || !height || !isFinite(width) || !isFinite(height)) return;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const setupAnalyser = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const sourceNode = inputAudioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;

        const analyser = inputAudioContext.createAnalyser();
        analyser.fftSize = 128;
        sourceNode.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;

        let waveOffset = 0;

        const animate = () => {
          requestAnimationFrame(animate);
          if (!dataArrayRef.current || !analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          const width = canvas.offsetWidth;
          const height = canvas.offsetHeight;
          if (!width || !height || !isFinite(width) || !isFinite(height))
            return;

          ctx.clearRect(0, 0, width, height);

          const centerX = width / 2;
          const centerY = height / 2;
          const baseRadius = Math.min(centerX, centerY) / 2;
          const maxRadius = baseRadius * 2;

          const avgAmplitude =
            dataArrayRef.current.reduce((sum, v) => sum + v, 0) /
            dataArrayRef.current.length;

          const scaledRadius =
            baseRadius + (avgAmplitude / 255) * (maxRadius - baseRadius);

          // Main glowing circle
          const gradient = ctx.createRadialGradient(
            centerX,
            centerY,
            baseRadius / 4,
            centerX,
            centerY,
            scaledRadius
          );
          gradient.addColorStop(0, "#3fa9f5");
          gradient.addColorStop(1, "#7ef9ff");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, scaledRadius, 0, 2 * Math.PI);
          ctx.fill();
        };

        animate();
      } catch (error) {
        console.error("Microphone access denied or error occurred:", error);
      }
    };

    setupAnalyser();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      sourceNodeRef.current?.disconnect();
      analyserRef.current?.disconnect();
    };
  }, [inputAudioContext]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
        backgroundColor: "transparent",
      }}
    />
  );
}
