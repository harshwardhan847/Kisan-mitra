import { useState, useRef, useEffect } from "react";

interface AudioContexts {
  inputAudioContext: AudioContext | null;
  outputAudioContext: AudioContext | null;
  inputNode: GainNode | null;
  outputNode: GainNode | null;
  nextStartTime: React.MutableRefObject<number>;
}

export const useAudioContexts = (): AudioContexts => {
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  const [inputNode, setInputNode] = useState<GainNode | null>(null);
  const [outputNode, setOutputNode] = useState<GainNode | null>(null);

  useEffect(() => {
    // Initialize input AudioContext (for microphone input)
    inputAudioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)({ sampleRate: 16000 });

    // Initialize output AudioContext (for Gemini's audio responses)
    outputAudioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)({ sampleRate: 24000 });

    const inputGain = inputAudioContextRef.current.createGain();
    const outputGain = outputAudioContextRef.current.createGain();

    setInputNode(inputGain);
    setOutputNode(outputGain);

    // Connect output gain to the audio destination (speakers)
    outputGain.connect(outputAudioContextRef.current.destination);

    // Initialize nextStartTime for audio playback scheduling
    nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

    // Cleanup function: close audio contexts when component unmounts
    return () => {
      inputAudioContextRef.current?.close();
      outputAudioContextRef.current?.close();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return {
    inputAudioContext: inputAudioContextRef.current,
    outputAudioContext: outputAudioContextRef.current,
    inputNode,
    outputNode,
    nextStartTime: nextStartTimeRef,
  };
};
