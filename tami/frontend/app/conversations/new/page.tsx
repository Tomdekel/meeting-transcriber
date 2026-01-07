"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { uploadFile, startTranscription, handleApiError } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "processing";

function NewConversationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "upload" ? "upload" : "record";

  const [activeTab, setActiveTab] = useState<"record" | "upload">(initialMode);
  const [recordingMode, setRecordingMode] = useState<"room" | "online">("room");
  const [context, setContext] = useState("");
  const [participants, setParticipants] = useState("");
  const [error, setError] = useState<string>("");

  // Device state for room mode
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Recording state (inline on same page)
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0.15));
  const [isVisualizing, setIsVisualizing] = useState(false);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enumerate audio devices on mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          stream.getTracks().forEach(track => track.stop());
        });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === "audioinput");
        setAudioDevices(audioInputs);

        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }
    };

    getDevices();
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

  // Audio visualization
  useEffect(() => {
    if (!isVisualizing) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!analyser || !dataArray) return;

    let frameId: number;
    let isRunning = true;

    const updateVisualization = () => {
      if (!isRunning) return;
      analyser.getByteFrequencyData(dataArray);

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
        newLevels.push(Math.max(0.1, Math.min(1, avg * 3)));
      }

      setAudioLevels(newLevels);
      frameId = requestAnimationFrame(updateVisualization);
    };

    frameId = requestAnimationFrame(updateVisualization);

    return () => {
      isRunning = false;
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isVisualizing]);

  // Stop visualization helper
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

  // Start recording
  const handleStartRecording = async () => {
    try {
      setError("");
      let stream: MediaStream;

      if (recordingMode === "online") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        });
        stream.getVideoTracks().forEach(track => track.stop());
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
            : { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
        });
      }

      streamRef.current = stream;

      // Set up audio visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      setIsVisualizing(true);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onerror = () => setError("שגיאה בהקלטה");

      mediaRecorder.start(1000);
      setRecordingState("recording");
      setRecordingTime(0);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError(recordingMode === "online" ? "נא לבחור חלון או לשונית להקלטה" : "נא לאפשר גישה למיקרופון בהגדרות הדפדפן");
      } else {
        setError(handleApiError(err));
      }
    }
  };

  // Stop recording
  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    stopVisualization();

    try {
      setRecordingState("processing");

      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
          mediaRecorderRef.current.stop();
        } else {
          resolve();
        }
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      if (chunksRef.current.length === 0) {
        setError("לא נקלט אודיו. נסה שוב.");
        setRecordingState("idle");
        return;
      }

      const completeBlob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });

      if (completeBlob.size < 1000) {
        setError("ההקלטה קצרה מדי. נסה שוב.");
        setRecordingState("idle");
        return;
      }

      const audioFile = new File([completeBlob], "recording.webm", { type: "audio/webm;codecs=opus" });

      const uploadResponse = await uploadFile(audioFile);

      const transcriptionResponse = await startTranscription({
        uploadId: uploadResponse.uploadId,
        context: context.trim() || "פגישה",
        participants: participants.trim() ? participants.split(",").map((p) => p.trim()).filter(Boolean) : undefined,
        transcriptionProvider: "ivrit",
        transcriptionModel: "ivrit-ai/whisper-large-v3-turbo-ct2",
        summaryModel: "gpt-4o-mini",
      });

      router.push(`/session/${transcriptionResponse.sessionId}`);
    } catch (err) {
      setError(handleApiError(err));
      setRecordingState("idle");
    }
  };

  // Cancel recording
  const handleCancelRecording = () => {
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
    setRecordingState("idle");
    setRecordingTime(0);
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) {
      handleFileSelect(file);
    } else {
      setError("אנא בחר קובץ אודיו תקין");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Start transcription from upload
  const handleStartTranscription = async () => {
    if (!selectedFile) {
      setError("אנא בחר קובץ אודיו");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const uploadResponse = await uploadFile(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const transcriptionResponse = await startTranscription({
        uploadId: uploadResponse.uploadId,
        context: context.trim() || "פגישה",
        participants: participants.trim() ? participants.split(",").map((p) => p.trim()).filter(Boolean) : undefined,
        transcriptionProvider: "ivrit",
        transcriptionModel: "ivrit-ai/whisper-large-v3-turbo-ct2",
        summaryModel: "gpt-4o-mini",
      });

      router.push(`/session/${transcriptionResponse.sessionId}`);
    } catch (err) {
      setError(handleApiError(err));
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]" dir="rtl">
      <main className="max-w-[720px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[24px] font-bold text-[#1F2937] mb-2">שיחה חדשה</h1>
          <p className="text-[15px] text-[#6B7280]">
            ספר בקצרה על השיחה ובחר איך להקליט או להעלות אותה.
          </p>
        </div>

        {/* Context Section */}
        <div
          className="bg-white rounded-[8px] p-6 mb-6"
          style={{ boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)" }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1F2937] mb-2">
                הקשר השיחה <span className="text-[#9CA3AF] font-normal">(לא חובה)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="על מה השיחה הזו? לדוגמה: פגישת צוות שבועית, ראיון מועמד, שיחה עם לקוח..."
                className="w-full h-[100px] px-3 py-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[#1F2937] text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#2B3A67] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1F2937] mb-2">
                משתתפים <span className="text-[#9CA3AF] font-normal">(לא חובה)</span>
              </label>
              <input
                type="text"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="יוסי, שרה, דוד..."
                className="w-full h-[44px] px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[#1F2937] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2B3A67] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Recording Source Section */}
        <div
          className="bg-white rounded-[8px] p-6 mb-6"
          style={{ boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)" }}
        >
          {/* Underlined Tabs */}
          <div className="flex gap-8 border-b border-[#E5E7EB] mb-6">
            <button
              onClick={() => setActiveTab("record")}
              className={`pb-3 text-[15px] font-medium transition-colors relative ${
                activeTab === "record"
                  ? "text-[#1F2937]"
                  : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              הקלטה חיה
              {activeTab === "record" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2B3A67]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`pb-3 text-[15px] font-medium transition-colors relative ${
                activeTab === "upload"
                  ? "text-[#1F2937]"
                  : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              העלאת הקלטה קיימת
              {activeTab === "upload" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2B3A67]" />
              )}
            </button>
          </div>

          {/* Record Tab Content */}
          {activeTab === "record" && (
            <div className="space-y-6">
              {/* Show recording UI when recording/processing */}
              {recordingState !== "idle" ? (
                <div className="space-y-5">
                  {/* Timer & Status */}
                  <div className="flex items-center justify-between">
                    <div className="text-[32px] font-semibold text-[#111827] font-mono tracking-tight">
                      {formatTime(recordingTime)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${recordingState === "recording" ? "bg-[#EF4444] animate-pulse" : "bg-[#D1D5DB]"}`} />
                      <span className="text-[13px] text-[#6B7280]">
                        {recordingState === "recording" ? "מקליט" : "מעבד..."}
                      </span>
                    </div>
                  </div>

                  {/* Waveform */}
                  <div className="bg-[#F9FAFB] rounded-[10px] p-5">
                    <div className="flex gap-1 items-center justify-center h-[48px] mb-2">
                      {audioLevels.map((level, i) => (
                        <div
                          key={i}
                          className="w-[5px] rounded-full"
                          style={{
                            height: `${Math.max(8, level * 48)}px`,
                            backgroundColor: recordingState === "recording" ? `rgba(43, 58, 103, ${0.5 + level * 0.5})` : "#D1D5DB",
                            transition: "height 0.05s ease-out",
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-[12px] text-[#6B7280] text-center">
                      {recordingMode === "online" ? "מקליט: אודיו מהמחשב" : `מקליט: ${audioDevices.find(d => d.deviceId === selectedDeviceId)?.label || "מיקרופון"}`}
                    </div>
                  </div>

                  {/* Recording Actions */}
                  {recordingState === "processing" ? (
                    <div className="flex items-center justify-center gap-3 text-[#6B7280] py-3">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-[14px]">מעבד ומתמלל...</span>
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleStopRecording}
                        className="min-w-[140px] h-[44px] rounded-[8px] bg-[#EF4444] hover:bg-[#DC2626] text-white font-medium transition-colors flex items-center justify-center"
                      >
                        עצור הקלטה
                      </button>
                      <button
                        onClick={handleCancelRecording}
                        className="min-w-[100px] h-[44px] rounded-[8px] border border-[#E5E7EB] bg-white text-[#6B7280] font-medium hover:border-[#D1D5DB] transition-colors flex items-center justify-center"
                      >
                        בטל
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Recording Mode Title */}
                  <h3 className="text-[15px] font-medium text-[#1F2937]">איך תרצה להקליט?</h3>

                  {/* Radio Cards */}
                  <div className="space-y-3">
                    {/* Room Recording Card */}
                    <button
                      onClick={() => setRecordingMode("room")}
                      className={`w-full text-right p-4 rounded-[8px] border-2 transition-all ${
                        recordingMode === "room"
                          ? "border-[#2B3A67] bg-[#2B3A67]/5"
                          : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          recordingMode === "room" ? "border-[#2B3A67]" : "border-[#D1D5DB]"
                        }`}>
                          {recordingMode === "room" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#2B3A67]" />
                          )}
                        </div>
                        <div>
                          <p className="text-[15px] font-medium text-[#1F2937] mb-1">
                            שיחה בחדר (דרך המיקרופון)
                          </p>
                          <p className="text-[13px] text-[#6B7280]">
                            כשאתם יושבים באותו חדר והלפטופ לידך.
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Online Recording Card */}
                    <button
                      onClick={() => setRecordingMode("online")}
                      className={`w-full text-right p-4 rounded-[8px] border-2 transition-all ${
                        recordingMode === "online"
                          ? "border-[#2B3A67] bg-[#2B3A67]/5"
                          : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          recordingMode === "online" ? "border-[#2B3A67]" : "border-[#D1D5DB]"
                        }`}>
                          {recordingMode === "online" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#2B3A67]" />
                          )}
                        </div>
                        <div>
                          <p className="text-[15px] font-medium text-[#1F2937] mb-1">
                            שיחה אונליין (Zoom / Meet וכו׳)
                          </p>
                          <p className="text-[13px] text-[#6B7280]">
                            הקלטת אודיו מהמחשב בזמן שיחת וידאו.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Inline explanation for online mode */}
                  {recordingMode === "online" && (
                    <div className="bg-[#F0F4FF] border border-[#C7D2FE] rounded-[8px] p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <svg className="w-5 h-5 text-[#4F46E5] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-[14px] text-[#374151]">
                          <p className="font-medium mb-2">איך זה עובד:</p>
                          <ol className="list-decimal list-inside space-y-1 text-[13px] text-[#4B5563]">
                            <li>בחר את הטאב או החלון שבו פועלת השיחה</li>
                            <li>ודא שהאופציה <strong>״שתף אודיו״</strong> מסומנת</li>
                            <li>לחץ <strong>״שתף״</strong> וההקלטה תתחיל</li>
                          </ol>
                          <p className="mt-2 text-[12px] text-[#6B7280]">
                            💡 המשתתפים האחרים לא יראו שאתה מקליט
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Device Selection - Only show for room mode */}
                  {recordingMode === "room" && audioDevices.length > 0 && (
                    <div>
                      <label className="block text-[14px] font-medium text-[#1F2937] mb-2">
                        בחר מיקרופון
                      </label>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="w-full h-[44px] px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[#1F2937] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2B3A67] focus:border-transparent"
                      >
                        {audioDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `מיקרופון ${device.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Start Recording Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleStartRecording}
                      className="w-full sm:w-[240px] h-[44px] bg-[#2B3A67] hover:bg-[#1F2937] text-white font-medium rounded-[8px] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      התחל להקליט
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload Tab Content */}
          {activeTab === "upload" && (
            <div className="space-y-6">
              {/* Upload Title */}
              <h3 className="text-[15px] font-medium text-[#1F2937]">יש לך כבר הקלטה מוכנה?</h3>

              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[8px] p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-[#2B3A67] bg-[#2B3A67]/5"
                      : "border-[#E5E7EB] hover:border-[#2B3A67] hover:bg-[#F7F8FA]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 mx-auto mb-4 bg-[#F7F8FA] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-medium text-[#1F2937] mb-1">
                    גרור ושחרר קובץ אודיו או <span className="text-[#2B3A67]">לחץ לבחירה</span>
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    תומך ב-MP3, M4A, WAV, FLAC עד 100MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F7F8FA] rounded-[8px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2B3A67]/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#2B3A67]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#1F2937]">{selectedFile.name}</p>
                        <p className="text-[12px] text-[#6B7280]">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    {!isUploading && (
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-2 text-[#6B7280] hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {isUploading && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#6B7280]">מעלה קובץ...</span>
                        <span className="text-[#1F2937] font-medium">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-[#E5E7EB] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#2B3A67] h-full transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Start Transcription Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleStartTranscription}
                  disabled={!selectedFile || isUploading}
                  className="w-full sm:w-[240px] h-[44px] bg-[#2B3A67] hover:bg-[#1F2937] text-white font-medium rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      מעלה ומתמלל...
                    </>
                  ) : (
                    "התחל תמלול"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[8px] p-4 mb-6">
            <p className="text-[14px] text-red-700">{error}</p>
          </div>
        )}

        {/* Cancel Link */}
        <div className="text-center">
          <Link
            href="/conversations"
            className="text-[14px] text-[#6B7280] hover:text-[#1F2937] hover:underline transition-colors"
          >
            ביטול וחזרה לשיחות
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function NewConversationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center" dir="rtl">
        <div className="text-[#6B7280]">טוען...</div>
      </div>
    }>
      <NewConversationContent />
    </Suspense>
  );
}
