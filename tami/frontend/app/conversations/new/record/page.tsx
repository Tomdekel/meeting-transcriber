"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { uploadFile, startTranscription, handleApiError } from "@/lib/api";

type RecordingState = "ready" | "recording" | "processing";

function LiveRecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as "room" | "online" || "room";

  // Get stored data from sessionStorage
  const [context, setContext] = useState("");
  const [participants, setParticipants] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("מיקרופון ברירת מחדל");

  const [recordingState, setRecordingState] = useState<RecordingState>("ready");
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string>("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Audio visualization state - 12 bars for smoother visualization
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0.15));
  const [isVisualizing, setIsVisualizing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animationFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Load data from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedContext = sessionStorage.getItem("recordContext") || "";
      const storedParticipants = sessionStorage.getItem("recordParticipants") || "";
      const storedDeviceId = sessionStorage.getItem("recordDeviceId") || "";
      const storedDeviceLabel = sessionStorage.getItem("recordDeviceLabel") || "מיקרופון ברירת מחדל";

      setContext(storedContext);
      setParticipants(storedParticipants);
      setSelectedDeviceId(storedDeviceId);
      setDeviceLabel(storedDeviceLabel);
    }
  }, []);

  // Recording timer
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (recordingState === "recording") {
      intervalId = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [recordingState]);

  // Audio visualization using useEffect - runs when isVisualizing becomes true
  useEffect(() => {
    if (!isVisualizing) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!analyser || !dataArray) {
      console.log("Visualization: missing analyser or dataArray");
      return;
    }

    console.log("Visualization started");
    let frameId: number;
    let isRunning = true;

    const updateVisualization = () => {
      if (!isRunning) return;

      // Get frequency data from the analyser
      analyser.getByteFrequencyData(dataArray);

      // Sample 12 frequency bands for our bars
      const bands = 12;
      const bufferLength = analyser.frequencyBinCount;
      const bandSize = Math.floor(bufferLength / bands);
      const newLevels: number[] = [];

      for (let i = 0; i < bands; i++) {
        let sum = 0;
        for (let j = 0; j < bandSize; j++) {
          sum += dataArray[i * bandSize + j];
        }
        const avg = sum / bandSize / 255;
        // Scale and add minimum height
        newLevels.push(Math.max(0.1, Math.min(1, avg * 3)));
      }

      setAudioLevels(newLevels);
      frameId = requestAnimationFrame(updateVisualization);
    };

    frameId = requestAnimationFrame(updateVisualization);

    return () => {
      console.log("Visualization cleanup");
      isRunning = false;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isVisualizing]);

  // Stop visualization
  const stopVisualization = useCallback(() => {
    setIsVisualizing(false);
    setAudioLevels(new Array(12).fill(0.15));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVisualization();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stopVisualization]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = async () => {
    try {
      setError("");
      let stream: MediaStream;

      if (mode === "online") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true, // Required for getDisplayMedia
        });
        // Stop video track immediately
        stream.getVideoTracks().forEach(track => track.stop());
      } else {
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
      }

      streamRef.current = stream;

      // Set up audio visualization with Web Audio API
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5; // Less smoothing for more responsive visualization
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      // Enable visualization - this will trigger the useEffect
      setIsVisualizing(true);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log(`Chunk received: ${event.data.size} bytes, total chunks: ${chunksRef.current.length}`);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("שגיאה בהקלטה");
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecordingState("recording");
      setRecordingTime(0);
    } catch (err: any) {
      console.error("Recording error:", err);
      if (err.name === "NotAllowedError") {
        setError(
          mode === "online"
            ? "נא לבחור חלון או לשונית להקלטה"
            : "נא לאפשר גישה למיקרופון בהגדרות הדפדפן"
        );
      } else {
        setError(handleApiError(err));
      }
    }
  };

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    // Stop visualization
    stopVisualization();

    try {
      setRecordingState("processing");

      // Wait for final data
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => {
            console.log(`Recording stopped, total chunks: ${chunksRef.current.length}`);
            resolve();
          };
          mediaRecorderRef.current.stop();
        } else {
          resolve();
        }
      });

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      // Check if we have any data
      if (chunksRef.current.length === 0) {
        setError("לא נקלט אודיו. נסה שוב.");
        setRecordingState("ready");
        return;
      }

      const completeBlob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
      console.log(`Complete blob size: ${completeBlob.size} bytes`);

      if (completeBlob.size < 1000) {
        setError("ההקלטה קצרה מדי. נסה שוב.");
        setRecordingState("ready");
        return;
      }

      const audioFile = new File([completeBlob], "recording.webm", { type: "audio/webm;codecs=opus" });

      console.log("Uploading file...");
      const uploadResponse = await uploadFile(audioFile);
      console.log("Upload response:", uploadResponse);

      const transcriptionResponse = await startTranscription({
        uploadId: uploadResponse.uploadId,
        context: context.trim() || "פגישה",
        participants: participants.trim() ? participants.split(",").map((p) => p.trim()).filter(Boolean) : undefined,
        transcriptionProvider: "whisper",
        transcriptionModel: "whisper-1",
        summaryModel: "gpt-4o-mini",
      });

      // Clear sessionStorage
      sessionStorage.removeItem("recordContext");
      sessionStorage.removeItem("recordParticipants");
      sessionStorage.removeItem("recordDeviceId");
      sessionStorage.removeItem("recordDeviceLabel");

      router.push(`/session/${transcriptionResponse.sessionId}`);
    } catch (err) {
      console.error("Stop recording error:", err);
      setError(handleApiError(err));
      setRecordingState("ready");
    }
  };

  const handleCancelRecording = () => {
    if (recordingState === "recording") {
      setShowCancelModal(true);
    } else {
      handleGoBack();
    }
  };

  const handleConfirmCancel = () => {
    // Stop everything
    stopVisualization();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setShowCancelModal(false);
    handleGoBack();
  };

  const handleGoBack = () => {
    sessionStorage.removeItem("recordContext");
    sessionStorage.removeItem("recordParticipants");
    sessionStorage.removeItem("recordDeviceId");
    sessionStorage.removeItem("recordDeviceLabel");
    router.push("/conversations/new");
  };

  const modeLabel = mode === "online" ? "שיחה אונליין" : "שיחה בחדר";

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col" dir="rtl">
      {/* Top Bar */}
      <header className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-2 text-[14px] text-[#6B7280]">
          <span className="font-semibold text-[#111827]">תמי</span>
          <span>•</span>
          <span>{modeLabel}</span>
        </div>
        <button
          onClick={handleCancelRecording}
          className="text-[14px] text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          חזור
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-8 pb-12">
        <div
          className="w-full max-w-[560px] bg-white rounded-[12px] p-6"
          style={{ boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)" }}
        >
          {/* Timer & Status Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-[36px] font-semibold text-[#111827] font-mono tracking-tight">
              {formatTime(recordingTime)}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  recordingState === "recording" ? "bg-[#EF4444] animate-pulse" : "bg-[#D1D5DB]"
                }`}
              />
              <span className="text-[13px] text-[#6B7280]">
                {recordingState === "recording" ? "מקליט" : recordingState === "processing" ? "מעבד..." : "מוכן להקלטה"}
              </span>
            </div>
          </div>

          {/* Context (if provided) */}
          {context && (
            <div className="mb-6 pb-6 border-b border-[#F3F4F6]">
              <div className="text-[12px] text-[#9CA3AF] mb-1">הקשר השיחה</div>
              <div className="text-[14px] text-[#374151]">{context}</div>
            </div>
          )}

          {/* Waveform Section */}
          <div className="bg-[#F9FAFB] rounded-[10px] p-5 mb-6">
            {/* Audio-reactive Waveform Bars */}
            <div className="flex gap-1 items-center justify-center h-[56px] mb-3">
              {audioLevels.map((level, i) => (
                <div
                  key={i}
                  className="w-[5px] rounded-full"
                  style={{
                    height: `${Math.max(8, level * 56)}px`,
                    backgroundColor: recordingState === "recording"
                      ? `rgba(43, 58, 103, ${0.5 + level * 0.5})`
                      : "#D1D5DB",
                    transition: "height 0.05s ease-out",
                  }}
                />
              ))}
            </div>
            {/* Device Label */}
            <div className="text-[12px] text-[#6B7280] text-center">
              {mode === "online" ? "מקליט דרך: אודיו מהמחשב" : `מקליט דרך: ${deviceLabel}`}
            </div>
          </div>

          {/* Info Text */}
          <p className="text-[12px] text-[#9CA3AF] text-center mb-6">
            אפשר להקטין את החלון בזמן ההקלטה. תמי תמשיך להקליט ברקע.
          </p>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 mb-6">
              <p className="text-[13px] text-red-700 text-center">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            {recordingState === "processing" ? (
              <div className="flex items-center justify-center gap-3 text-[#6B7280] py-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-[14px]">מעבד הקלטה...</span>
              </div>
            ) : (
              <>
                <button
                  onClick={recordingState === "recording" ? handleStopRecording : handleStartRecording}
                  className={`min-w-[140px] h-[44px] rounded-[8px] font-medium transition-colors flex items-center justify-center ${
                    recordingState === "recording"
                      ? "bg-[#EF4444] hover:bg-[#DC2626] text-white"
                      : "bg-[#2B3A67] hover:bg-[#1F2937] text-white"
                  }`}
                >
                  {recordingState === "recording" ? "עצור הקלטה" : "התחל הקלטה"}
                </button>
                <button
                  onClick={handleCancelRecording}
                  className="min-w-[100px] h-[44px] rounded-[8px] border border-[#E5E7EB] bg-white text-[#6B7280] font-medium hover:border-[#D1D5DB] hover:text-[#374151] transition-colors flex items-center justify-center"
                >
                  בטל וחזור
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-[12px] p-6 max-w-[380px] w-full"
            style={{ boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)" }}
          >
            <h2 className="text-[17px] font-semibold text-[#111827] mb-2">
              לבטל את ההקלטה?
            </h2>
            <p className="text-[14px] text-[#6B7280] mb-5">
              ההקלטה שנעשתה עד עכשיו תימחק ולא תישמר.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 h-[38px] rounded-[8px] border border-[#E5E7EB] bg-white text-[#374151] text-[14px] font-medium hover:border-[#D1D5DB] transition-colors flex items-center justify-center"
              >
                המשך להקליט
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 h-[38px] rounded-[8px] bg-[#EF4444] hover:bg-[#DC2626] text-white text-[14px] font-medium transition-colors flex items-center justify-center"
              >
                כן, בטל
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveRecordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center" dir="rtl">
          <div className="text-[#6B7280]">טוען...</div>
        </div>
      }
    >
      <LiveRecordContent />
    </Suspense>
  );
}
