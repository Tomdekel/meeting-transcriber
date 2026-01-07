"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getTranscriptionStatus,
  updateSummary,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  sendChatMessage,
} from "@/lib/api";

interface SessionStatus {
  sessionId: string;
  status: string;
  audioFileName?: string;
  audioFileUrl?: string;
  context?: string;
  error?: string;
  transcript?: {
    segments: Array<{
      speakerId: string;
      speakerName?: string;
      text: string;
      startTime: number;
      endTime: number;
    }>;
  };
  summary?: {
    id?: string;
    overview: string;
    keyPoints: string[];
    actionItems: Array<{
      id?: string;
      summaryId?: string;
      description: string;
      assignee?: string;
      deadline?: string;
      completed?: boolean;
    }>;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Speaker colors
const SPEAKER_COLORS = [
  { bg: "#E8F2FF", name: "a" },  // Blue
  { bg: "#EFFFF4", name: "b" },  // Green
  { bg: "#FFF5E6", name: "c" },  // Orange
  { bg: "#F5E6FF", name: "d" },  // Purple
  { bg: "#FFF0F0", name: "e" },  // Pink
];

const getSpeakerColor = (speakerId: string, colorMap: Map<string, string>) => {
  if (!colorMap.has(speakerId)) {
    const colorIndex = colorMap.size % SPEAKER_COLORS.length;
    colorMap.set(speakerId, SPEAKER_COLORS[colorIndex].bg);
  }
  return colorMap.get(speakerId) || "#F2F2F2";
};

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "qa" | "raw">("summary");

  // Speaker color mapping
  const speakerColorMapRef = useRef(new Map<string, string>());

  // Summary editing state
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedOverview, setEditedOverview] = useState("");
  const [editedKeyPoints, setEditedKeyPoints] = useState<string[]>([]);
  const [savingSummary, setSavingSummary] = useState(false);

  // Action item state
  const [newActionItem, setNewActionItem] = useState("");
  const [addingActionItem, setAddingActionItem] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        const status = await getTranscriptionStatus(sessionId);
        setSession(status);
        setLoading(false);

        if (status.status === "processing" || status.status === "pending") {
          setTimeout(fetchStatus, 3000);
        }
      } catch (err: any) {
        setError(err.message || "שגיאה בטעינת השיחה");
        setLoading(false);
      }
    };

    fetchStatus();
  }, [sessionId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Audio handlers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Summary handlers
  const handleEditSummary = () => {
    if (session?.summary) {
      setEditedOverview(session.summary.overview);
      setEditedKeyPoints([...session.summary.keyPoints]);
      setIsEditingSummary(true);
    }
  };

  const handleSaveSummary = async () => {
    if (!session) return;
    try {
      setSavingSummary(true);
      await updateSummary(sessionId, {
        overview: editedOverview,
        keyPoints: editedKeyPoints,
      });
      setSession({
        ...session,
        summary: session.summary
          ? { ...session.summary, overview: editedOverview, keyPoints: editedKeyPoints }
          : undefined,
      });
      setIsEditingSummary(false);
    } catch (error) {
      alert("שגיאה בשמירת הסיכום");
    } finally {
      setSavingSummary(false);
    }
  };

  const handleCancelEditSummary = () => {
    setIsEditingSummary(false);
  };

  // Action item handlers
  const handleAddActionItem = async () => {
    if (!newActionItem.trim()) return;
    try {
      setAddingActionItem(true);
      const result = await createActionItem(sessionId, { description: newActionItem });
      if (session?.summary) {
        setSession({
          ...session,
          summary: {
            ...session.summary,
            actionItems: [
              ...session.summary.actionItems,
              { id: result.id, description: newActionItem, completed: false },
            ],
          },
        });
      }
      setNewActionItem("");
    } catch (error) {
      alert("שגיאה בהוספת משימה");
    } finally {
      setAddingActionItem(false);
    }
  };

  const handleToggleActionItem = async (itemId: string, completed: boolean) => {
    try {
      await updateActionItem(sessionId, itemId, { completed });
      if (session?.summary) {
        setSession({
          ...session,
          summary: {
            ...session.summary,
            actionItems: session.summary.actionItems.map((item) =>
              item.id === itemId ? { ...item, completed } : item
            ),
          },
        });
      }
    } catch (error) {
      alert("שגיאה בעדכון משימה");
    }
  };

  const handleDeleteActionItem = async (itemId: string) => {
    try {
      await deleteActionItem(sessionId, itemId);
      if (session?.summary) {
        setSession({
          ...session,
          summary: {
            ...session.summary,
            actionItems: session.summary.actionItems.filter((item) => item.id !== itemId),
          },
        });
      }
    } catch (error) {
      alert("שגיאה במחיקת משימה");
    }
  };

  // Chat handler
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsSending(true);

    try {
      const response = await sendChatMessage(sessionId, userMessage);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response.content }]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "שגיאה בקבלת תשובה. נסה שוב." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Get raw transcript text
  const getRawTranscript = () => {
    if (!session?.transcript?.segments) return "";
    return session.transcript.segments
      .map((seg) => `${seg.speakerName || seg.speakerId}: ${seg.text}`)
      .join("\n\n");
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2B3A67] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280]">טוען שיחה...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-[10px] p-8 max-w-md text-center" style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-[#1F2937] mb-2">שגיאה בטעינת השיחה</h2>
          <p className="text-[14px] text-[#6B7280] mb-6">{error}</p>
          <Link href="/conversations" className="text-[#2B3A67] hover:underline text-[14px]">
            חזור לשיחות
          </Link>
        </div>
      </div>
    );
  }

  // Processing state
  if (session?.status === "processing" || session?.status === "pending") {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-[10px] p-8 max-w-md text-center" style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
          <div className="w-16 h-16 border-4 border-[#2B3A67] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-[20px] font-semibold text-[#1F2937] mb-2">מעבד את השיחה...</h2>
          <p className="text-[14px] text-[#6B7280] mb-4">התמלול והסיכום יהיו מוכנים בקרוב</p>
          <p className="text-[13px] text-[#9CA3AF]">זה עשוי לקחת מספר דקות</p>
        </div>
      </div>
    );
  }

  // Failed state
  if (session?.status === "failed") {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-[10px] p-8 max-w-md text-center" style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-[#1F2937] mb-2">התמלול נכשל</h2>
          <p className="text-[14px] text-[#6B7280] mb-6">{session.error || "אירעה שגיאה בעיבוד השיחה"}</p>
          <Link href="/conversations" className="text-[#2B3A67] hover:underline text-[14px]">
            חזור לשיחות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]" dir="rtl">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <Link href="/conversations" className="text-[14px] text-[#6B7280] hover:text-[#1F2937] inline-flex items-center gap-2 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            חזור לשיחות
          </Link>
          <h1 className="text-[24px] font-bold text-[#1F2937] mb-2">פרטי השיחה</h1>
          <div className="text-[14px] text-[#6B7280]">
            {session?.audioFileName} • {duration > 0 ? formatTime(duration) : "--:--"} דקות • עברית
          </div>
        </header>

        {/* Audio Player Card */}
        {session?.audioFileUrl && (
          <section
            className="bg-white rounded-[10px] p-5 mb-6"
            style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}
          >
            <audio
              ref={audioRef}
              src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${session.audioFileUrl}`}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 bg-[#2B3A67] hover:bg-[#243053] rounded-full flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-[-2px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Progress */}
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[13px] text-[#6B7280] w-12 text-left">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#2B3A67] [&::-webkit-slider-thumb]:rounded-full"
                />
                <span className="text-[13px] text-[#6B7280] w-12">{formatTime(duration)}</span>
              </div>

              {/* Speed */}
              <button
                onClick={changePlaybackRate}
                className="px-3 py-1.5 bg-[#F5F7FA] rounded-md text-[13px] text-[#1F2937] font-medium hover:bg-[#E5E7EB] transition-colors"
              >
                {playbackRate}x
              </button>
            </div>
          </section>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-6">
          {/* LEFT: Transcript */}
          <aside
            className="bg-white rounded-[10px] p-5 lg:order-1 order-2"
            style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}
          >
            <h2 className="text-[16px] font-semibold text-[#1F2937] mb-4">תמלול השיחה</h2>
            <div className="max-h-[60vh] overflow-y-auto space-y-3 scrollbar-thin">
              {session?.transcript?.segments.map((segment, idx) => {
                const bgColor = getSpeakerColor(segment.speakerId, speakerColorMapRef.current);
                return (
                  <div
                    key={idx}
                    className="rounded-[10px] p-3"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="text-[12px] text-[#6B7280] mb-1">
                      {segment.speakerName || segment.speakerId} • {formatTime(segment.startTime)}
                    </div>
                    <p className="text-[14px] text-[#1F2937] leading-relaxed">{segment.text}</p>
                  </div>
                );
              })}
              {(!session?.transcript?.segments || session.transcript.segments.length === 0) && (
                <p className="text-[14px] text-[#6B7280] text-center py-8">אין תמלול זמין</p>
              )}
            </div>
          </aside>

          {/* RIGHT: Tabs */}
          <section
            className="bg-white rounded-[10px] p-5 lg:order-2 order-1"
            style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}
          >
            {/* Tabs */}
            <div className="flex gap-2 border-b border-[#E5E7EB] mb-5">
              <button
                onClick={() => setActiveTab("summary")}
                className={`px-4 py-2.5 text-[14px] font-medium transition-colors ${
                  activeTab === "summary"
                    ? "text-[#2B3A67] border-b-2 border-[#2B3A67]"
                    : "text-[#6B7280] hover:text-[#1F2937]"
                }`}
              >
                סיכום
              </button>
              <button
                onClick={() => setActiveTab("qa")}
                className={`px-4 py-2.5 text-[14px] font-medium transition-colors ${
                  activeTab === "qa"
                    ? "text-[#2B3A67] border-b-2 border-[#2B3A67]"
                    : "text-[#6B7280] hover:text-[#1F2937]"
                }`}
              >
                שאלות AI
              </button>
              <button
                onClick={() => setActiveTab("raw")}
                className={`px-4 py-2.5 text-[14px] font-medium transition-colors ${
                  activeTab === "raw"
                    ? "text-[#2B3A67] border-b-2 border-[#2B3A67]"
                    : "text-[#6B7280] hover:text-[#1F2937]"
                }`}
              >
                תוכן גולמי
              </button>
            </div>

            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                {session?.summary ? (
                  <>
                    {/* Overview */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[15px] font-semibold text-[#1F2937]">סיכום השיחה</h3>
                        {!isEditingSummary && (
                          <button
                            onClick={handleEditSummary}
                            className="text-[13px] text-[#2B3A67] hover:underline"
                          >
                            ערוך
                          </button>
                        )}
                      </div>
                      {isEditingSummary ? (
                        <div className="space-y-3">
                          <textarea
                            value={editedOverview}
                            onChange={(e) => setEditedOverview(e.target.value)}
                            className="w-full h-24 px-3 py-2 border border-[#E5E7EB] rounded-[8px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2B3A67] resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveSummary}
                              disabled={savingSummary}
                              className="px-4 py-2 bg-[#2B3A67] text-white text-[13px] rounded-[8px] hover:bg-[#243053] disabled:opacity-50"
                            >
                              {savingSummary ? "שומר..." : "שמור"}
                            </button>
                            <button
                              onClick={handleCancelEditSummary}
                              className="px-4 py-2 bg-[#F5F7FA] text-[#1F2937] text-[13px] rounded-[8px] hover:bg-[#E5E7EB]"
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[14px] text-[#6B7280] leading-relaxed">
                          {session.summary.overview}
                        </p>
                      )}
                    </div>

                    {/* Key Points */}
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#1F2937] mb-3">נקודות עיקריות</h4>
                      <ul className="space-y-2">
                        {session.summary.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#2B3A67] mt-1">•</span>
                            <span className="text-[14px] text-[#6B7280]">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Items */}
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#1F2937] mb-3">משימות</h4>
                      <div className="space-y-2">
                        {session.summary.actionItems.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 group">
                            <input
                              type="checkbox"
                              checked={item.completed || false}
                              onChange={(e) => item.id && handleToggleActionItem(item.id, e.target.checked)}
                              className="mt-1 w-4 h-4 accent-[#2B3A67]"
                            />
                            <span
                              className={`flex-1 text-[14px] ${
                                item.completed ? "text-[#9CA3AF] line-through" : "text-[#6B7280]"
                              }`}
                            >
                              {item.description}
                            </span>
                            <button
                              onClick={() => item.id && handleDeleteActionItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-red-500 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}

                        {/* Add new task */}
                        <div className="flex gap-2 mt-3">
                          <input
                            type="text"
                            value={newActionItem}
                            onChange={(e) => setNewActionItem(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddActionItem()}
                            placeholder="הוסף משימה חדשה..."
                            className="flex-1 h-[40px] px-3 border border-[#E5E7EB] rounded-[8px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2B3A67]"
                          />
                          <button
                            onClick={handleAddActionItem}
                            disabled={addingActionItem || !newActionItem.trim()}
                            className="px-4 h-[40px] bg-[#2B3A67] text-white text-[13px] rounded-[8px] hover:bg-[#243053] disabled:opacity-50"
                          >
                            {addingActionItem ? "..." : "הוסף"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[14px] text-[#6B7280] text-center py-8">אין סיכום זמין</p>
                )}
              </div>
            )}

            {/* Q&A Tab */}
            {activeTab === "qa" && (
              <div className="flex flex-col h-[50vh]">
                <h3 className="text-[15px] font-semibold text-[#1F2937] mb-4">שאלות ותשובות</h3>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {chatMessages.length === 0 && (
                    <p className="text-[14px] text-[#9CA3AF] text-center py-8">
                      שאל שאלה על השיחה...
                    </p>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`rounded-[10px] p-3 max-w-[85%] ${
                        msg.role === "user"
                          ? "bg-[#2B3A67] text-white mr-auto"
                          : "bg-[#F5F7FA] text-[#1F2937] ml-auto"
                      }`}
                    >
                      <p className="text-[14px] leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                  {isSending && (
                    <div className="bg-[#F5F7FA] rounded-[10px] p-3 max-w-[85%] ml-auto">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="שאל שאלה על השיחה..."
                    className="flex-1 h-[44px] px-4 border border-[#E5E7EB] rounded-[8px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2B3A67]"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isSending}
                    className="px-5 h-[44px] bg-[#2B3A67] text-white text-[14px] font-medium rounded-[8px] hover:bg-[#243053] disabled:opacity-50 transition-colors"
                  >
                    שלח
                  </button>
                </div>
              </div>
            )}

            {/* Raw Tab */}
            {activeTab === "raw" && (
              <div>
                <h3 className="text-[15px] font-semibold text-[#1F2937] mb-4">תוכן גולמי</h3>
                <pre className="bg-[#F5F7FA] rounded-[8px] p-4 text-[13px] text-[#1F2937] leading-relaxed max-h-[50vh] overflow-auto whitespace-pre-wrap font-sans">
                  {getRawTranscript() || "אין תוכן זמין"}
                </pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
