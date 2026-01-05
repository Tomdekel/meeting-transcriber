"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { formatFileSize } from "@/lib/utils";

interface FileUploadProps {
  onUpload: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
}

const ACCEPTED_AUDIO_TYPES = {
  "audio/m4a": [".m4a"],
  "audio/mp3": [".mp3"],
  "audio/mpeg": [".mp3", ".mpeg"],
  "audio/wav": [".wav"],
  "audio/webm": [".webm"],
  "audio/ogg": [".ogg"],
  "audio/flac": [".flac"],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function FileUpload({
  onUpload,
  accept = ACCEPTED_AUDIO_TYPES,
  maxSize = MAX_FILE_SIZE,
  disabled = false,
}: FileUploadProps) {
  const [error, setError] = useState<string>("");

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError("");

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError(`הקובץ גדול מדי. גודל מקסימלי: ${formatFileSize(maxSize)}`);
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("סוג קובץ לא נתמך. אנא העלה קובץ אודיו");
        } else {
          setError("שגיאה בהעלאת הקובץ");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragActive && !isDragReject
              ? "border-primary bg-primary/5"
              : isDragReject
              ? "border-error bg-error/5"
              : "border-border hover:border-primary hover:bg-primary/5"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {/* Icon */}
          <div
            className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${isDragActive ? "bg-primary/10" : "bg-muted"}
          `}
          >
            <svg
              className={`w-8 h-8 ${isDragActive ? "text-primary" : "text-text-secondary"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Text */}
          <div className="space-y-2">
            {isDragActive ? (
              <p className="text-lg font-semibold text-primary">שחרר את הקובץ כאן...</p>
            ) : (
              <>
                <p className="text-lg font-semibold text-text-primary">
                  גרור ושחרר קובץ אודיו או{" "}
                  <span className="text-primary">לחץ לבחירה</span>
                </p>
                <p className="text-sm text-text-secondary">
                  תומך ב-MP3, M4A, WAV, FLAC ועוד
                </p>
                <p className="text-xs text-text-tertiary">
                  גודל מקסימלי: {formatFileSize(maxSize)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
