"use client";

import { useState } from "react";
import { updateSpeakers } from "@/lib/api";

interface Speaker {
  id: string;
  name: string;
  color: {
    border: string;
    text: string;
    bg: string;
  };
}

interface SpeakerEditorProps {
  sessionId: string;
  speakers: Speaker[];
  onUpdate: (updatedSpeakers: Speaker[]) => void;
}

export default function SpeakerEditor({ sessionId, speakers, onUpdate }: SpeakerEditorProps) {
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStartEdit = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setEditedName(speaker.name);
  };

  const handleSave = async (speaker: Speaker) => {
    if (!editedName.trim() || editedName === speaker.name) {
      setEditingSpeakerId(null);
      return;
    }

    try {
      setSaving(true);

      // Create speaker mapping for API
      const speakerMapping: Record<string, string> = {};
      speakers.forEach((s) => {
        if (s.id === speaker.id) {
          speakerMapping[s.id] = editedName.trim();
        }
      });

      // Update backend
      await updateSpeakers(sessionId, speakerMapping);

      // Update local state
      const updatedSpeakers = speakers.map((s) =>
        s.id === speaker.id ? { ...s, name: editedName.trim() } : s
      );
      onUpdate(updatedSpeakers);

      setEditingSpeakerId(null);
    } catch (error) {
      console.error("Failed to update speaker:", error);
      alert("שגיאה בעדכון שם הדובר");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingSpeakerId(null);
    setEditedName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, speaker: Speaker) => {
    if (e.key === "Enter") {
      handleSave(speaker);
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (speakers.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface rounded-lg shadow-lg p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-right"
      >
        <h3 className="font-semibold text-text-primary">דוברים בפגישה</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">
            {speakers.length} {speakers.length === 1 ? "דובר" : "דוברים"}
          </span>
          <svg
            className={`w-5 h-5 text-text-secondary transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary mb-4">
            לחץ על שם כדי לערוך ולהקצות שמות אמיתיים לדוברים
          </p>

          {speakers.map((speaker) => (
            <div
              key={speaker.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-r-4 ${speaker.color.border} ${speaker.color.bg}`}
            >
              {/* Speaker Color Indicator */}
              <div className={`w-3 h-3 rounded-full ${speaker.color.border.replace('border-', 'bg-')}`} />

              {/* Speaker Name/Edit */}
              <div className="flex-1">
                {editingSpeakerId === speaker.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, speaker)}
                      placeholder="שם הדובר"
                      className="flex-1 px-3 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      autoFocus
                      disabled={saving}
                    />
                    <button
                      onClick={() => handleSave(speaker)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 text-sm"
                    >
                      {saving ? "שומר..." : "שמור"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-3 py-1.5 bg-background text-text-primary rounded-lg hover:bg-border transition-colors disabled:opacity-50 text-sm"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEdit(speaker)}
                    className={`text-right ${speaker.color.text} hover:underline font-medium text-sm w-full`}
                  >
                    {speaker.name}
                  </button>
                )}
              </div>

              {/* Edit Icon */}
              {editingSpeakerId !== speaker.id && (
                <button
                  onClick={() => handleStartEdit(speaker)}
                  className="text-text-tertiary hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
