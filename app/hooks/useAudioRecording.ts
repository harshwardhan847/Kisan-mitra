import { useState, useRef, useCallback } from "react";
import { createBlob } from "~/utils/audio"; // Ensure this path is correct

interface UseAudioRecordingProps {
  inputAudioContext: AudioContext | null;
  inputNode: GainNode | null;
  session: any | null; // The Gemini Live session to send audio to
  updateStatus: (msg: string) => void;
  updateError: (msg: string) => void;
}

interface AudioRecordingHook {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export const useAudioRecording = ({
  inputAudioContext,
  inputNode,
  session,
  updateStatus,
  updateError,
}: UseAudioRecordingProps): AudioRecordingHook => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const isRecordingRef = useRef(false); // To ensure onaudioprocess uses latest state

  const startRecording = useCallback(async () => {
    if (isRecording || !inputAudioContext || !inputNode || !session) {
      // Guard against multiple recordings or uninitialized states
      updateStatus("Preparation for recording not complete.");
      return;
    }

    inputAudioContext.resume();
    updateStatus("Requesting microphone access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false, // Only audio needed
      });
      mediaStreamRef.current = stream;

      updateStatus("Microphone access granted. Starting capture...");

      const sourceNode = inputAudioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;
      sourceNode.connect(inputNode); // Connect to the input gain node

      const bufferSize = 256; // Smaller buffer for lower latency
      const scriptProcessorNode = inputAudioContext.createScriptProcessor(
        bufferSize,
        1, // input channels
        1 // output channels
      );
      scriptProcessorNodeRef.current = scriptProcessorNode;

      isRecordingRef.current = true; // Update ref first
      setIsRecording(true); // Then update state

      scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        // Only process if actively recording
        if (!isRecordingRef.current) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0); // Get mono channel data

        // Send PCM data as a Blob to the Gemini session
        session.sendRealtimeInput({ media: createBlob(pcmData) });
      };

      // Connect nodes in the audio graph
      sourceNode.connect(scriptProcessorNode);
      // Connect script processor to destination or keep it disconnected if not needed for local playback
      // Connecting to destination keeps the scriptProcessorNode active, which is often necessary
      scriptProcessorNode.connect(inputAudioContext.destination);

      updateStatus("🔴 Recording... Capturing PCM chunks.");
    } catch (err: any) {
      console.error("Error starting recording:", err);
      updateError(`Error: ${err.message}`);
      stopRecording(); // Attempt to stop if an error occurs
    }
  }, [
    isRecording,
    inputAudioContext,
    inputNode,
    session,
    updateStatus,
    updateError,
  ]);

  const stopRecording = useCallback(() => {
    if (!isRecording && !mediaStreamRef.current) return; // Nothing to stop

    updateStatus("Stopping recording...");

    isRecordingRef.current = false; // Update ref first
    setIsRecording(false); // Then update state

    // Disconnect audio nodes to release resources
    if (scriptProcessorNodeRef.current && sourceNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    // Stop all tracks on the media stream (e.g., microphone)
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Clear references
    scriptProcessorNodeRef.current = null;
    sourceNodeRef.current = null;

    updateStatus("Recording stopped. Click Start to begin again.");
  }, [isRecording, updateStatus]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
};
