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
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [recordingMode, setRecordingMode] = useState<"microphone" | "system">("microphone");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Enumerate audio devices on mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === "audioinput");
        setAudioDevices(audioInputs);

        // Set default device
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }
    };

    getDevices();
  }, []);

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

      let stream: MediaStream;

      if (recordingMode === "microphone") {
        // Microphone mode - for in-person meetings
        stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedDeviceId
            ? {
                deviceId: { exact: selectedDeviceId },
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100,
              }
            : {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100,
              },
        });
      } else {
        // System audio mode - for online meetings
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 44100,
          } as any,
          video: {
            width: 1,
            height: 1,
            frameRate: 1,
          } as any,
        });

        // Stop video track immediately (we only need audio)
        stream.getVideoTracks().forEach((track) => track.stop());
      }

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

      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

      setIsRecording(false);

      // Wait for final chunk to upload with longer timeout
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Finalize recording on backend with retry logic
      const maxRetries = 3;
      let uploadResponse;
      let lastError;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          uploadResponse = await stopRecording(recordingId);
          break; // Success - exit retry loop
        } catch (err) {
          lastError = err;
          console.error(`Stop recording attempt ${attempt + 1} failed:`, err);

          if (attempt < maxRetries - 1) {
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
          }
        }
      }

      if (!uploadResponse) {
        throw lastError || new Error("Failed to stop recording after multiple attempts");
      }

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

  // Recording timer - updates every second when recording
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isRecording) {
      intervalId = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording]);

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

          {/* Recording Source Selection */}
          {!isRecording && !isProcessing && (
            <div className="card space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  מקור ההקלטה
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  בחר את מקור האודיו להקלטה
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="recordingMode"
                    value="microphone"
                    checked={recordingMode === "microphone"}
                    onChange={() => setRecordingMode("microphone")}
                    className="w-5 h-5 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-text-primary">מיקרופון (פגישה פרונטלית)</div>
                    <div className="text-sm text-text-secondary">הקלטת פגישה שמתקיימת ליד המחשב</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="recordingMode"
                    value="system"
                    checked={recordingMode === "system"}
                    onChange={() => setRecordingMode("system")}
                    className="w-5 h-5 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-text-primary">אודיו מערכת (פגישה מקוונת)</div>
                    <div className="text-sm text-text-secondary">
                      הקלטת אודיו מזום, מיט, ווטסאפ ועוד (תידרש שיתוף מסך)
                    </div>
                  </div>
                </label>
              </div>

              {/* Device Selection - Only for Microphone Mode */}
              {recordingMode === "microphone" && audioDevices.length > 0 && (
                <div className="space-y-2">
                  <label htmlFor="audioDevice" className="block text-sm font-medium text-text-primary">
                    בחר מכשיר אודיו
                  </label>
                  <select
                    id="audioDevice"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="input w-full"
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `מיקרופון ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* System Audio Info */}
              {recordingMode === "system" && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-text-primary">
                      <p className="font-semibold mb-1">איך זה עובד?</p>
                      <p className="text-text-secondary">
                        הדפדפן יבקש ממך לשתף מסך/חלון. בחר בטאב של הפגישה (זום, מיט וכו׳) וה-אודיו יוקלט.
                        המשתתפים האחרים בפגישה לא יראו שאתה משתף מסך.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
