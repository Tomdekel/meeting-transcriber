"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getTranscriptionStatus,
  updateSummary,
  createActionItem,
  updateActionItem,
  deleteActionItem
} from "@/lib/api";
import ChatBox from "@/components/ChatBox";
import SpeakerEditor from "@/components/SpeakerEditor";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorMessage from "@/components/ErrorMessage";

interface SessionStatus {
  sessionId: string;
  status: string;
  audioFileName: string;
  audioFileUrl?: string;
  context: string;
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
    overview: string;
    keyPoints: string[];
    actionItems: Array<{
      description: string;
      assignee?: string;
    }>;
  };
}

// Speaker color palette - Monday.com inspired colors
const SPEAKER_COLORS = [
  { border: "border-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  { border: "border-green-500", text: "text-green-600", bg: "bg-green-50" },
  { border: "border-purple-500", text: "text-purple-600", bg: "bg-purple-50" },
  { border: "border-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
  { border: "border-pink-500", text: "text-pink-600", bg: "bg-pink-50" },
  { border: "border-cyan-500", text: "text-cyan-600", bg: "bg-cyan-50" },
  { border: "border-amber-500", text: "text-amber-600", bg: "bg-amber-50" },
  { border: "border-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50" },
];

// Helper function to get speaker color based on speaker name
const getSpeakerColor = (speaker: string, speakerMap: Map<string, number>) => {
  if (!speakerMap.has(speaker)) {
    speakerMap.set(speaker, speakerMap.size);
  }
  const colorIndex = speakerMap.get(speaker)! % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[colorIndex];
};

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track speaker to color mapping
  const speakerColorMap = new Map<string, number>();

  // Summary editing state
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedOverview, setEditedOverview] = useState("");
  const [editedKeyPoints, setEditedKeyPoints] = useState<string[]>([]);
  const [savingSummary, setSavingSummary] = useState(false);

  // Action item editing state
  const [editingActionItemId, setEditingActionItemId] = useState<string | null>(null);
  const [newActionItem, setNewActionItem] = useState("");
  const [addingActionItem, setAddingActionItem] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        const status = await getTranscriptionStatus(sessionId);
        setSession(status);
        setLoading(false);

        // Poll every 3 seconds if still processing
        if (status.status === "processing" || status.status === "pending") {
          setTimeout(fetchStatus, 3000);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch session status");
        setLoading(false);
      }
    };

    fetchStatus();
  }, [sessionId]);

  // Summary editing handlers
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

      // Update local state optimistically
      setSession({
        ...session,
        summary: session.summary
          ? {
              ...session.summary,
              overview: editedOverview,
              keyPoints: editedKeyPoints,
            }
          : undefined,
      });

      setIsEditingSummary(false);
    } catch (error) {
      console.error("Failed to save summary:", error);
      alert("שגיאה בשמירת הסיכום");
    } finally {
      setSavingSummary(false);
    }
  };

  const handleCancelEditSummary = () => {
    setIsEditingSummary(false);
    setEditedOverview("");
    setEditedKeyPoints([]);
  };

  const handleUpdateKeyPoint = (index: number, value: string) => {
    const updated = [...editedKeyPoints];
    updated[index] = value;
    setEditedKeyPoints(updated);
  };

  const handleAddKeyPoint = () => {
    setEditedKeyPoints([...editedKeyPoints, ""]);
  };

  const handleRemoveKeyPoint = (index: number) => {
    setEditedKeyPoints(editedKeyPoints.filter((_, i) => i !== index));
  };

  // Action item handlers
  const handleAddActionItem = async () => {
    if (!newActionItem.trim()) return;

    try {
      setAddingActionItem(true);
      const result = await createActionItem(sessionId, {
        description: newActionItem,
      });

      // Update local state optimistically
      if (session?.summary) {
        setSession({
          ...session,
          summary: {
            ...session.summary,
            actionItems: [
              ...session.summary.actionItems,
              {
                id: result.id,
                summaryId: session.summary.id,
                description: newActionItem,
                completed: false,
              },
            ],
          },
        });
      }

      setNewActionItem("");
    } catch (error) {
      console.error("Failed to add action item:", error);
      alert("שגיאה בהוספת משימה");
    } finally {
      setAddingActionItem(false);
    }
  };

  const handleToggleActionItem = async (itemId: string, completed: boolean) => {
    try {
      await updateActionItem(sessionId, itemId, { completed });

      // Update local state optimistically
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
      console.error("Failed to update action item:", error);
      alert("שגיאה בעדכון משימה");
    }
  };

  const handleDeleteActionItem = async (itemId: string) => {
    try {
      await deleteActionItem(sessionId, itemId);

      // Update local state optimistically
      if (session?.summary) {
        setSession({
          ...session,
          summary: {
            ...session.summary,
            actionItems: session.summary.actionItems.filter(
              (item) => item.id !== itemId
            ),
          },
        });
      }
    } catch (error) {
      console.error("Failed to delete action item:", error);
      alert("שגיאה במחיקת משימה");
    }
  };

  // Extract unique speakers with colors
  const getUniqueSpeakers = () => {
    if (!session?.transcript?.segments) return [];

    const speakersMap = new Map<string, { id: string; name: string }>();

    session.transcript.segments.forEach((segment) => {
      const speakerId = segment.speakerId;
      if (!speakersMap.has(speakerId)) {
        speakersMap.set(speakerId, {
          id: speakerId,
          name: segment.speakerName || segment.speakerId,
        });
      }
    });

    return Array.from(speakersMap.values()).map((speaker) => ({
      ...speaker,
      color: getSpeakerColor(speaker.id, speakerColorMap),
    }));
  };

  const handleSpeakersUpdate = (updatedSpeakers: any[]) => {
    // Refresh the session to get updated speaker names
    if (session) {
      const fetchStatus = async () => {
        try {
          const status = await getTranscriptionStatus(sessionId);
          setSession(status);
        } catch (err: any) {
          console.error("Failed to refresh session:", err);
        }
      };
      fetchStatus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/")}
              className="text-primary hover:text-primary-hover mb-4 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              חזור
            </button>
            <div className="h-8 bg-border rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-border rounded w-1/4 animate-pulse"></div>
          </div>

          <LoadingSkeleton type="card" count={1} />
          <div className="mt-6">
            <LoadingSkeleton type="transcript" count={1} />
          </div>
          <div className="mt-6">
            <LoadingSkeleton type="list" count={1} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/")}
              className="text-primary hover:text-primary-hover mb-4 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              חזור
            </button>
            <h1 className="text-3xl font-bold text-text-primary mb-2">שגיאה בטעינת הפגישה</h1>
          </div>

          <ErrorMessage
            message={error}
            onRetry={() => window.location.reload()}
            retryLabel="טען מחדש"
          />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/")}
              className="text-primary hover:text-primary-hover mb-4 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              חזור
            </button>
          </div>

          <div className="bg-surface rounded-lg shadow-lg p-12">
            <div className="flex items-center justify-center">
              <div className="text-center max-w-md">
                <svg className="w-16 h-16 mx-auto text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-text-primary mb-2">לא נמצאה פגישה</h3>
                <p className="text-text-secondary mb-6">
                  הפגישה המבוקשת אינה קיימת או שהוסרה
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  חזור לדף הבית
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-primary hover:text-primary-hover mb-4 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            חזור
          </button>
          <h1 className="text-3xl font-bold text-text-primary mb-2">תמלול פגישה</h1>
          <p className="text-text-secondary">{session.audioFileName}</p>

          {/* Audio Player */}
          {session.audioFileUrl && (
            <div className="mt-4 bg-surface rounded-lg p-4 border border-border">
              <audio
                controls
                className="w-full"
                preload="metadata"
                style={{
                  height: '40px',
                }}
              >
                <source
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${session.audioFileUrl}`}
                  type="audio/wav"
                />
                <source
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${session.audioFileUrl}`}
                  type="audio/mp4"
                />
                <source
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${session.audioFileUrl}`}
                  type="audio/mpeg"
                />
                הדפדפן שלך לא תומך בהשמעת אודיו.
              </audio>
            </div>
          )}
        </div>

        {/* Status Card */}
        <div className="bg-surface rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            {session.status === "processing" || session.status === "pending" ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div>
                  <h3 className="font-semibold text-text-primary">מעבד את התמלול...</h3>
                  <p className="text-sm text-text-secondary">זה יכול לקחת מספר דקות</p>
                </div>
              </>
            ) : session.status === "completed" ? (
              <>
                <div className="text-success">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">התמלול הושלם!</h3>
                  <p className="text-sm text-text-secondary">התמלול והסיכום מוכנים</p>
                </div>
              </>
            ) : session.status === "failed" ? (
              <>
                <div className="text-error">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary">התמלול נכשל</h3>
                  <p className="text-sm text-text-secondary">{session.error || "אירעה שגיאה לא ידועה"}</p>
                  {session.error?.includes("API key") && (
                    <button
                      onClick={() => router.push("/settings")}
                      className="btn-primary mt-3"
                    >
                      הגדר מפתח API
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Context */}
        {session.context && (
          <div className="bg-surface rounded-lg shadow-lg p-6 mb-6">
            <h3 className="font-semibold text-text-primary mb-3">הקשר הפגישה</h3>
            <p className="text-text-secondary">{session.context}</p>
          </div>
        )}

        {/* Transcript */}
        {session.transcript && session.transcript.segments.length > 0 && (
          <div className="bg-surface rounded-lg shadow-lg p-6 mb-6">
            <h3 className="font-semibold text-text-primary mb-4">תמלול</h3>
            <div className="max-h-[600px] overflow-y-auto space-y-4 px-2">
              {session.transcript.segments.map((segment, idx) => {
                const colors = getSpeakerColor(segment.speakerId, speakerColorMap);
                const hasTimestamp = segment.startTime > 0;

                return (
                  <div key={idx} className={`border-r-4 ${colors.border} ${colors.bg} rounded-r-lg pr-4 py-2 transition-all hover:shadow-sm`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`font-semibold ${colors.text}`}>{segment.speakerName || segment.speakerId}</span>
                      {hasTimestamp && (
                        <span className="text-xs text-text-tertiary">
                          {Math.floor(segment.startTime / 60)}:{String(Math.floor(segment.startTime % 60)).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <p className="text-text-primary whitespace-pre-wrap">{segment.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Speaker Editor */}
        {session.transcript && session.transcript.segments.length > 0 && (
          <div className="mb-6">
            <SpeakerEditor
              sessionId={sessionId}
              speakers={getUniqueSpeakers()}
              onUpdate={handleSpeakersUpdate}
            />
          </div>
        )}

        {/* Summary */}
        {session.summary && (
          <div className="bg-surface rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">סיכום</h3>
              {!isEditingSummary ? (
                <button
                  onClick={handleEditSummary}
                  className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  ערוך
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSummary}
                    disabled={savingSummary}
                    className="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
                  >
                    {savingSummary ? "שומר..." : "שמור"}
                  </button>
                  <button
                    onClick={handleCancelEditSummary}
                    disabled={savingSummary}
                    className="text-sm px-3 py-1 bg-background text-text-primary rounded hover:bg-border disabled:opacity-50"
                  >
                    ביטול
                  </button>
                </div>
              )}
            </div>

            {/* Overview */}
            <div className="mb-6">
              <h4 className="font-medium text-text-primary mb-2">סקירה כללית</h4>
              {isEditingSummary ? (
                <textarea
                  value={editedOverview}
                  onChange={(e) => setEditedOverview(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={4}
                />
              ) : (
                <p className="text-text-secondary">{session.summary.overview}</p>
              )}
            </div>

            {/* Key Points */}
            <div className="mb-6">
              <h4 className="font-medium text-text-primary mb-2">נקודות עיקריות</h4>
              {isEditingSummary ? (
                <div className="space-y-2">
                  {editedKeyPoints.map((point, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={point}
                        onChange={(e) => handleUpdateKeyPoint(idx, e.target.value)}
                        className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleRemoveKeyPoint(idx)}
                        className="text-error hover:text-error/80"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddKeyPoint}
                    className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    הוסף נקודה
                  </button>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  {session.summary.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-text-secondary">{point}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Action Items */}
            <div>
              <h4 className="font-medium text-text-primary mb-2">משימות</h4>
              <div className="space-y-2">
                {session.summary.actionItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 group">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => handleToggleActionItem(item.id, e.target.checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`text-text-secondary ${item.completed ? 'line-through opacity-60' : ''}`}>
                        {item.description}
                      </p>
                      {item.assignee && (
                        <span className="text-xs text-text-tertiary">אחראי: {item.assignee}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteActionItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-error hover:text-error/80 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Add new action item */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddActionItem();
                      }
                    }}
                    placeholder="משימה חדשה..."
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleAddActionItem}
                    disabled={addingActionItem || !newActionItem.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {addingActionItem ? "מוסיף..." : "הוסף"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat */}
        {session.status === "completed" && (
          <div className="mb-6">
            <ChatBox sessionId={sessionId} />
          </div>
        )}
      </div>
    </div>
  );
}
