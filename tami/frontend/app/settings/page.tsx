"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Settings {
  openaiApiKey: string;
  transcriptionProvider: string;
  transcriptionModel: string;
  summaryModel: string;
  chatModel: string;
}

const TRANSCRIPTION_MODELS = [
  { value: "ivrit-ai/whisper-large-v3-turbo-ct2", label: "Ivrit Whisper v3 Turbo (מומלץ - עם זיהוי דוברים)" },
  { value: "ivrit-ai/whisper-large-v3-ct2", label: "Ivrit Whisper v3 Large (איכות מקסימלית)" },
  { value: "whisper-1", label: "OpenAI Whisper (ללא זיהוי דוברים)" },
];

const SUMMARY_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (הכי טוב)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (מומלץ - מהיר וזול)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

const CHAT_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (מומלץ)" },
  { value: "gpt-4o", label: "GPT-4o (הכי טוב)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    openaiApiKey: "",
    transcriptionProvider: "ivrit",
    transcriptionModel: "ivrit-ai/whisper-large-v3-turbo-ct2",
    summaryModel: "gpt-4o-mini",
    chatModel: "gpt-4o-mini",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // For now, load from localStorage
      // TODO: Load from backend API when user authentication is implemented
      const saved = localStorage.getItem("tami-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      // Validate API key
      if (!settings.openaiApiKey.trim()) {
        setSaveMessage({ type: "error", text: "נא להזין מפתח API" });
        return;
      }

      // For now, save to localStorage
      // TODO: Save to backend API when user authentication is implemented
      localStorage.setItem("tami-settings", JSON.stringify(settings));

      setSaveMessage({ type: "success", text: "ההגדרות נשמרו בהצלחה" });

      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveMessage({ type: "error", text: "שגיאה בשמירת ההגדרות" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    // TODO: Implement test connection to OpenAI API
    alert("בדיקת חיבור - לא מיושם עדיין");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">הגדרות</h1>
          <p className="text-text-secondary">נהל את מפתח ה-API ובחר מודלים לתמלול וסיכום</p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            saveMessage.type === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-error/10 text-error border border-error/20"
          }`}>
            <div className="flex items-center gap-2">
              {saveMessage.type === "success" ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span>{saveMessage.text}</span>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-surface rounded-lg shadow-lg p-6 space-y-6">
          {/* OpenAI API Key */}
          <div>
            <label className="block text-text-primary font-medium mb-2">
              מפתח OpenAI API
            </label>
            <p className="text-sm text-text-secondary mb-3">
              קבל מפתח API מ-{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                platform.openai.com
              </a>
            </p>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                placeholder="sk-proj-..."
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                {showApiKey ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Transcription Model */}
          <div>
            <label className="block text-text-primary font-medium mb-2">
              מודל תמלול
            </label>
            <select
              value={settings.transcriptionModel}
              onChange={(e) => {
                const model = e.target.value;
                const provider = model.startsWith("ivrit-ai/") ? "ivrit" : "whisper";
                setSettings({ ...settings, transcriptionModel: model, transcriptionProvider: provider });
              }}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TRANSCRIPTION_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-text-tertiary mt-1">
              Ivrit מספק תמלול מדויק בעברית עם זיהוי דוברים אוטומטי
            </p>
          </div>

          {/* Summary Model */}
          <div>
            <label className="block text-text-primary font-medium mb-2">
              מודל סיכום
            </label>
            <select
              value={settings.summaryModel}
              onChange={(e) => setSettings({ ...settings, summaryModel: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SUMMARY_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-text-tertiary mt-1">
              GPT-4o Mini מומלץ - מהיר, זול ואיכותי
            </p>
          </div>

          {/* Chat Model */}
          <div>
            <label className="block text-text-primary font-medium mb-2">
              מודל צ'אט
            </label>
            <select
              value={settings.chatModel}
              onChange={(e) => setSettings({ ...settings, chatModel: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CHAT_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-text-tertiary mt-1">
              משמש לשאלות ותשובות על הפגישה
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? "שומר..." : "שמור הגדרות"}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={!settings.openaiApiKey.trim()}
              className="px-6 py-3 bg-background text-text-primary rounded-lg hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              בדוק חיבור
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">אבטחת מידע</h3>
              <p className="text-sm text-blue-800">
                מפתח ה-API נשמר באופן מקומי בדפדפן שלך ומשמש רק לשליחת בקשות ל-OpenAI.
                איננו שומרים את המפתח בשרתים שלנו.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
