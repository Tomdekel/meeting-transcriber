"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startRecording, stopRecording, startTranscription, handleApiError } from "@/lib/api";

export default function RecordPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [context, setContext] = useState("");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingId, setRecordingId] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording
  const handleStartRecording = async () => {
    try {
      setError("");

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Initialize backend recording session
      const response = await startRecording();
      setRecordingId(response.recordingId);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);

          // Send chunk to backend
          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/record/${response.recordingId}/chunk`,
              {
                method: "POST",
                body: event.data,
              }
            );
          } catch (err) {
            console.error("Failed to upload chunk:", err);
          }
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Capture in 1-second chunks
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      console.log("Starting recording timer...");
      timerRef.current = setInterval(() => {
        console.log("Timer tick");
        setRecordingTime((prev) => {
          console.log("Current recording time:", prev);
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("נא לאפשר גישה למיקרופון בהגדרות הדפדפן");
      } else {
        setError(handleApiError(err));
      }
    }
  };

  // Stop recording
  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || !recordingId) return;

    try {
      setIsProcessing(true);

      // Stop media recorder
      mediaRecorderRef.current.stop();

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

      setIsRecording(false);

      // Wait a moment for chunks to finish uploading
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Finalize recording on backend
      const uploadResponse = await stopRecording(recordingId);

      // Start transcription
      const transcriptionResponse = await startTranscription({
        uploadId: uploadResponse.uploadId,
        context: context.trim() || "פגישה",
        transcriptionProvider: "whisper",
        transcriptionModel: "whisper-1",
        summaryModel: "gpt-4o-mini",
      });

      // Redirect to session page
      router.push(`/session/${transcriptionResponse.sessionId}`);
    } catch (err) {
      setError(handleApiError(err));
      setIsProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRecording]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-primary">הקלטת פגישה חיה</h1>
            <Link
              href="/"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              {!isRecording && !isProcessing && "חזור"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          {/* Context Input */}
          {!isRecording && !isProcessing && (
            <div className="card space-y-4">
              <div>
                <label
                  htmlFor="context"
                  className="block text-lg font-semibold text-text-primary mb-2"
                >
                  הקשר הפגישה
                </label>
                <p className="text-sm text-text-secondary mb-3">
                  תאר בקצרה את נושא הפגישה לפני תחילת ההקלטה
                </p>
              </div>

              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="לדוגמה: פגישת צוות שבועית, סיכום פרויקט, ראיון עבודה..."
                className="input min-h-[120px] resize-y"
                rows={4}
              />
            </div>
          )}

          {/* Recording Controls */}
          <div className="card">
            {!isRecording && !isProcessing ? (
              <div className="text-center space-y-6 py-8">
                <div className="w-32 h-32 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">
                    מוכן להקליט?
                  </h2>
                  <p className="text-text-secondary">
                    לחץ על כפתור ההקלטה כדי להתחיל
                  </p>
                </div>

                <button
                  onClick={handleStartRecording}
                  className="btn-primary px-8 py-3 text-lg"
                >
                  התחל הקלטה
                </button>
              </div>
            ) : isProcessing ? (
              <div className="text-center space-y-6 py-8">
                <div className="w-32 h-32 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-primary animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">
                    מעבד הקלטה...
                  </h2>
                  <p className="text-text-secondary">
                    זה עשוי לקחת כמה רגעים
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 py-8">
                {/* Recording indicator */}
                <div className="relative">
                  <div className="w-32 h-32 mx-auto bg-error/10 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-6 h-6 bg-error rounded-full"></div>
                  </div>
                </div>

                {/* Timer */}
                <div>
                  <div className="text-5xl font-bold text-error mb-2 font-mono">
                    {formatTime(recordingTime)}
                  </div>
                  <p className="text-text-secondary">מקליט...</p>
                </div>

                {/* Stop button */}
                <button
                  onClick={handleStopRecording}
                  className="bg-error hover:bg-error/90 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
                >
                  עצור הקלטה
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-error flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
