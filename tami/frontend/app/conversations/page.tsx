"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listSessions, deleteSession, updateSession, Session } from "@/lib/api";

export default function ConversationsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (editingSession) {
      setEditTitle(editingSession.title || editingSession.audioFileName);
    }
  }, [editingSession]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listSessions({ page: 1, pageSize: 50 });
      setSessions(response.sessions);
    } catch (err: any) {
      setError(err.message || "שגיאה בטעינת השיחות");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full bg-green-50 text-green-700">
            הושלם
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700">
            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            מעבד
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full bg-red-50 text-red-700">
            נכשל
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full bg-amber-50 text-amber-700">
            ממתין
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "עכשיו";
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;

    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDelete = async () => {
    if (!deletingSession) return;
    try {
      await deleteSession(deletingSession.id);
      await loadSessions();
      setDeletingSession(null);
    } catch (err) {
      setError("נכשל במחיקת השיחה");
      setDeletingSession(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    try {
      await updateSession(editingSession.id, { title: editTitle });
      await loadSessions();
      setEditingSession(null);
    } catch (err) {
      setError("נכשל בעדכון שם השיחה");
      setEditingSession(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col" dir="rtl">
      <main className="max-w-[1100px] mx-auto px-8 py-6 flex flex-col flex-1 gap-8 w-full">
        {/* Header */}
        <header className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-[26px] font-bold text-[#111827]">השיחות שלך</h1>
            <p className="text-[14px] text-[#6B7280] mt-1">כל התמלולים והסיכומים שלך יופיעו כאן.</p>
          </div>
          <div className="flex gap-[10px] flex-wrap">
            <Link
              href="/conversations/new"
              className="h-[40px] px-[18px] bg-[#2B3A67] hover:bg-[#243053] text-white font-medium rounded-full transition-colors inline-flex items-center"
            >
              שיחה חדשה
            </Link>
            <Link
              href="/conversations/new?mode=upload"
              className="h-[40px] px-[16px] bg-transparent border border-[#E5E7EB] hover:border-[#9CA3AF] text-[#111827] font-medium rounded-full transition-colors inline-flex items-center"
            >
              העלה הקלטה
            </Link>
          </div>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-[12px] p-6 animate-pulse"
                style={{ boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)' }}
              >
                <div className="h-5 bg-[#E5E7EB] rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-[#E5E7EB] rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-[#E5E7EB] rounded w-1/4"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-[8px] p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-[14px] text-red-700">{error}</p>
              <button
                onClick={loadSessions}
                className="text-[13px] text-red-700 hover:underline"
              >
                נסה שוב
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sessions.length === 0 && (
          <section className="flex-1 flex items-center justify-center">
            <div
              className="bg-white rounded-[12px] p-8 max-w-[520px] w-full text-center flex flex-col gap-4"
              style={{ boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)' }}
            >
              {/* Icon Circle */}
              <div className="w-[56px] h-[56px] mx-auto mb-1 bg-[#EEF2FF] rounded-full flex items-center justify-center text-[28px]">
                🎙️
              </div>

              {/* Title */}
              <h2 className="text-[20px] font-semibold text-[#111827]">
                עדיין אין שיחות בתמי
              </h2>

              {/* Body Text */}
              <p className="text-[14px] text-[#6B7280] leading-[1.6]">
                תמי שומרת בשבילך את כל מה שנאמר בפגישות החשובות.
                כדי להתחיל, תוכל להקליט שיחה חדשה או להעלות הקלטה קיימת.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center mt-2">
                <Link
                  href="/conversations/new"
                  className="min-w-[170px] h-[42px] px-5 bg-[#2B3A67] hover:bg-[#243053] text-white font-semibold rounded-full transition-colors inline-flex items-center justify-center"
                >
                  שיחה חדשה
                </Link>
                <Link
                  href="/conversations/new?mode=upload"
                  className="min-w-[160px] h-[42px] px-5 bg-transparent border border-[#E5E7EB] hover:border-[#9CA3AF] text-[#6B7280] font-medium rounded-full transition-colors inline-flex items-center justify-center"
                >
                  העלה הקלטה קיימת
                </Link>
              </div>

              {/* Helper Text */}
              <p className="text-[12px] text-[#6B7280] mt-1">
                לדוגמה: פגישת צוות, שיחה עם לקוח, ראיון מועמד או שיחת זום חשובה.
              </p>
            </div>
          </section>
        )}

        {/* Sessions List */}
        {!loading && !error && sessions.length > 0 && (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/session/${session.id}`}
                className="block bg-white rounded-[12px] p-6 hover:shadow-lg transition-shadow"
                style={{ boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title Row */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[16px] font-semibold text-[#1F2937] truncate">
                        {session.title || session.audioFileName || "שיחה ללא כותרת"}
                      </h3>
                      {getStatusBadge(session.status)}
                    </div>

                    {/* Summary/Context */}
                    {session.context && (
                      <p className="text-[14px] text-[#6B7280] mb-3 line-clamp-2">
                        {session.context}
                      </p>
                    )}

                    {/* Meta Row */}
                    <div className="flex items-center gap-4 text-[12px] text-[#9CA3AF]">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(session.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        עברית
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingSession(session);
                      }}
                      className="p-2 text-[#9CA3AF] hover:text-[#1F2937] transition-colors rounded-lg hover:bg-[#F7F8FA]"
                      title="ערוך שם"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeletingSession(session);
                      }}
                      className="p-2 text-[#9CA3AF] hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      title="מחק"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-[#9CA3AF] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Sessions Count */}
        {!loading && !error && sessions.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-[13px] text-[#9CA3AF]">
              מציג {sessions.length} {sessions.length === 1 ? "שיחה" : "שיחות"}
            </p>
          </div>
        )}

        {/* Edit Modal */}
        {editingSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-[12px] p-6 max-w-md w-full"
              style={{ boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)' }}
            >
              <h3 className="text-[18px] font-semibold text-[#1F2937] mb-4">ערוך שם שיחה</h3>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full h-[44px] px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2B3A67] focus:border-transparent mb-4"
                placeholder="שם השיחה..."
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 h-[44px] bg-[#2B3A67] hover:bg-[#1F2937] text-white font-medium rounded-[8px] transition-colors"
                >
                  שמור
                </button>
                <button
                  onClick={() => setEditingSession(null)}
                  className="flex-1 h-[44px] bg-white border border-[#E5E7EB] hover:border-[#9CA3AF] text-[#1F2937] font-medium rounded-[8px] transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-[12px] p-6 max-w-md w-full"
              style={{ boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#1F2937]">למחוק שיחה?</h3>
                  <p className="text-[13px] text-[#6B7280]">פעולה זו אינה ניתנת לביטול</p>
                </div>
              </div>
              <p className="text-[14px] text-[#6B7280] mb-6">
                האם את/ה בטוח/ה שברצונך למחוק את &quot;{deletingSession.title || deletingSession.audioFileName}&quot;?
                פעולה זו תמחק לצמיתות את התמלול, הסיכום וכל המידע הקשור.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 h-[44px] bg-red-600 hover:bg-red-700 text-white font-medium rounded-[8px] transition-colors"
                >
                  מחק
                </button>
                <button
                  onClick={() => setDeletingSession(null)}
                  className="flex-1 h-[44px] bg-white border border-[#E5E7EB] hover:border-[#9CA3AF] text-[#1F2937] font-medium rounded-[8px] transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
