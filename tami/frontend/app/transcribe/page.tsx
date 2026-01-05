"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import { uploadFile, startTranscription, handleApiError } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

interface Settings {
  openaiApiKey: string;
  transcriptionProvider: string;
  transcriptionModel: string;
  summaryModel: string;
  chatModel: string;
}

export default function TranscribePage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>("");
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("tami-settings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError("");
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("אנא בחר קובץ אודיו");
      return;
    }

    if (!context.trim()) {
      setError("אנא הזן הקשר לפגישה");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload file
      const uploadResponse = await uploadFile(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Start transcription with saved settings or defaults
      const transcriptionResponse = await startTranscription({
        uploadId: uploadResponse.uploadId,
        context: context.trim(),
        transcriptionProvider: settings?.transcriptionProvider || "ivrit",
        transcriptionModel: settings?.transcriptionModel || "ivrit-ai/whisper-large-v3-turbo-ct2",
        summaryModel: settings?.summaryModel || "gpt-4o-mini",
      });

      // Redirect to session page
      router.push(`/session/${transcriptionResponse.sessionId}`);
    } catch (err) {
      setError(handleApiError(err));
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-primary">תמלול חדש</h1>
            <button
              onClick={() => router.push("/")}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              חזור
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* API Key Warning */}
        {!settings?.openaiApiKey && (
          <div className="mb-6 bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-warning mb-1">מפתח API לא הוגדר</h3>
                <p className="text-sm text-text-secondary mb-3">
                  כדי להשתמש בשירות התמלול, עליך להגדיר מפתח OpenAI API בהגדרות.
                </p>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  עבור להגדרות
                </Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">העלאת קובץ אודיו</h2>

            {!selectedFile ? (
              <FileUpload onUpload={handleFileSelect} disabled={isUploading} />
            ) : (
              <div className="space-y-4">
                {/* Selected File Info */}
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{selectedFile.name}</p>
                        <p className="text-sm text-text-secondary">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>

                    {!isUploading && (
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-text-tertiary hover:text-error transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">מעלה קובץ...</span>
                      <span className="text-text-primary font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Context Input */}
          <div className="card space-y-4">
            <div>
              <label htmlFor="context" className="block text-lg font-semibold text-text-primary mb-2">
                הקשר הפגישה
              </label>
              <p className="text-sm text-text-secondary mb-3">
                תאר בקצרה את נושא הפגישה (לדוגמה: "ראיון לתפקיד Product Manager")
              </p>
            </div>

            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={isUploading}
              placeholder="לדוגמה: פגישת תכנון רבעון רביעי עם צוות המוצר..."
              className="input min-h-[120px] resize-y"
              rows={4}
            />
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

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !context.trim()}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  מעלה ומתמלל...
                </span>
              ) : (
                "התחל תמלול"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
