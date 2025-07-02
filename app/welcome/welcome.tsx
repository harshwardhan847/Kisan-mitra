import React, { useRef, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const AudioChat = () => {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    // This runs only in the browser
    let id = localStorage.getItem("clientId");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("clientId", id);
    }
    setClientId(id);
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const convertToBase64PCM = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(",")[1]; // strip 'data:...;base64,'
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob); // will trigger onloadend
    });
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const base64 = await convertToBase64PCM(blob);

      const res = await fetch("http://localhost:3001/api/genai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64, clientId }),
      });

      const { audioBase64 } = await res.json();
      if (audioBase64) {
        const audioBuffer = Uint8Array.from(atob(audioBase64), (c) =>
          c.charCodeAt(0)
        );
        const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.play();
      }
    };

    recorder.start();
    setTimeout(() => {
      recorder.stop();
      setIsRecording(false);
    }, 4000);

    setIsRecording(true);
  };

  if (!clientId) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🎙️ Gemini Audio Chat</h2>
      <button onClick={startRecording} disabled={isRecording}>
        {isRecording ? "Recording..." : "Start Recording"}
      </button>
    </div>
  );
};

export default AudioChat;
