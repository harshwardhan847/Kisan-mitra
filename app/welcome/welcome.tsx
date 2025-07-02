import React, { useRef, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { createBlob } from "~/utils/audio";

const AudioChat = () => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Accumulate Float32Array chunks of audio PCM data
  const audioChunksRef = useRef<Float32Array[]>([]);

  useEffect(() => {
    let id = localStorage.getItem("clientId");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("clientId", id);
    }
    setClientId(id);
  }, []);

  const startRecording = async () => {
    if (isRecording) return;
    setIsRecording(true);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    audioChunksRef.current = [];

    processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      audioChunksRef.current.push(new Float32Array(inputData));
    };

    source.connect(processor);
    processor.connect(audioContext.destination); // This line is important

    console.log("Recording started");
  };

  const stopRecording = async () => {
    setIsRecording(false);

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

    await audioContextRef.current?.close();

    // Combine audio chunks
    const totalLength = audioChunksRef.current.reduce(
      (acc, chunk) => acc + chunk.length,
      0
    );
    const fullBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log("Captured samples:", fullBuffer.length);
    if (fullBuffer.length === 0) {
      console.error("No audio data captured");
      return;
    }

    try {
      // Use your encoding utility to create base64 PCM audio
      const audioBlob = createBlob(fullBuffer); // returns { data: base64string, mimeType }
      const audioBase64 = audioBlob.data;

      if (!clientId) {
        console.error("Client ID is missing");
        return;
      }

      // Call backend API
      const response = await fetch("http://localhost:3001/api/genai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, clientId }),
      });

      if (!response.ok) {
        console.error("Backend returned error", await response.text());
        return;
      }

      const data = await response.json();

      if (data.audioBase64) {
        const audioBuffer = Uint8Array.from(atob(data.audioBase64), (c) =>
          c.charCodeAt(0)
        );
        const audioResponseBlob = new Blob([audioBuffer], {
          type: "audio/wav",
        });
        const url = URL.createObjectURL(audioResponseBlob);
        const audio = new Audio(url);
        audio.play();
      } else {
        console.error("No audioBase64 received from backend");
      }
    } catch (error) {
      console.error("Error during API call or processing response:", error);
    }
  };

  if (!clientId) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🎙️ Gemini Audio Chat</h2>
      <button onClick={startRecording} disabled={isRecording}>
        {isRecording ? "Recording..." : "Start Recording"}
      </button>
      <button
        onClick={stopRecording}
        disabled={!isRecording}
        style={{ marginLeft: "1rem" }}
      >
        Stop Recording
      </button>
    </div>
  );
};

export default AudioChat;
