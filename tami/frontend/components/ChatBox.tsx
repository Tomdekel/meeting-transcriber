"use client";

import { useState, useRef, useEffect } from "react";
import { sendChatMessage, getChatHistory } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface ChatBoxProps {
  sessionId: string;
}

const QUICK_PROMPTS = [
  "מהן הנקודות העיקריות?",
  "מהן המשימות?",
  "סכם את הפגישה",
  "מי אמר מה?",
];

export default function ChatBox({ sessionId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const history = await getChatHistory(sessionId);
      setMessages(
        history.messages.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
      );
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async (message?: string) => {
    const textToSend = message || input.trim();

    if (!textToSend) return;

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Send to backend
      const response = await sendChatMessage(sessionId, textToSend);

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          id: response.id,
          role: "assistant",
          content: response.content,
          createdAt: new Date(response.createdAt),
        },
      ]);
    } catch (error: any) {
      console.error("Chat failed:", error);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `שגיאה: ${error.message || "לא ניתן לשלוח את השאלה"}`,
          createdAt: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-surface rounded-lg shadow-lg flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-text-primary">שאלות ותשובות</h3>
        <p className="text-sm text-text-secondary mt-1">
          שאל שאלות על הפגישה וקבל תשובות מבוססות על התמליל והסיכום
        </p>
      </div>

      {/* Quick Prompts */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-background text-text-secondary rounded-full hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <svg
                className="w-16 h-16 mx-auto text-text-tertiary mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-text-secondary">
                התחל שיחה על ידי שליחת שאלה או לחיצה על אחד מהכפתורים למעלה
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-start" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-white"
                      : "bg-background text-text-primary"
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {message.role === "user" ? "אתה" : "עוזר"}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-background">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-text-secondary">מקליד...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="שאל שאלה על הפגישה..."
            disabled={loading}
            rows={2}
            className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>שלח</span>
            <svg
              className="w-5 h-5 rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-text-tertiary mt-2">
          לחץ Enter לשלוח, Shift+Enter לשורה חדשה
        </p>
      </div>
    </div>
  );
}
