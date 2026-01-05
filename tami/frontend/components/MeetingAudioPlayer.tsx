"use client";

import { useRef, useState, useEffect } from "react";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

interface MeetingAudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export default function MeetingAudioPlayer({
  audioUrl,
  onTimeUpdate,
}: MeetingAudioPlayerProps) {
  const playerRef = useRef<AudioPlayer>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Update playback rate when it changes
  useEffect(() => {
    if (playerRef.current?.audio.current) {
      playerRef.current.audio.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle time updates
  const handleListen = () => {
    if (playerRef.current?.audio.current) {
      const audio = playerRef.current.audio.current;
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);

      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime);
      }
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const speedOptions = [
    { label: "0.5×", value: 0.5 },
    { label: "0.75×", value: 0.75 },
    { label: "1×", value: 1.0 },
    { label: "1.25×", value: 1.25 },
    { label: "1.5×", value: 1.5 },
    { label: "2×", value: 2.0 },
  ];

  return (
    <div className="w-full">
      {/* Playback Speed Controls */}
      <div className="flex items-center gap-2 mb-3" dir="rtl">
        <span className="text-sm text-text-secondary font-medium">מהירות השמעה:</span>
        <div className="flex gap-2">
          {speedOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setPlaybackRate(option.value)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                playbackRate === option.value
                  ? "bg-primary text-white"
                  : "bg-surface-secondary text-text-tertiary hover:bg-border hover:text-text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Player - Force LTR */}
      <div className="bg-surface rounded-lg p-6 border border-border" dir="ltr">
        <AudioPlayer
          ref={playerRef}
          src={audioUrl}
          showJumpControls={true}
          showSkipControls={false}
          showFilledProgress={true}
          showDownloadProgress={true}
          onListen={handleListen}
          customAdditionalControls={[]}
          customVolumeControls={[]}
          layout="stacked-reverse"
          className="meeting-audio-player"
        />

        {/* Custom Time Display */}
        <div className="flex justify-between items-center mt-2 text-sm text-text-tertiary font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <style jsx global>{`
        .meeting-audio-player {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          direction: ltr !important;
        }

        .meeting-audio-player .rhap_container {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          direction: ltr !important;
        }

        .meeting-audio-player .rhap_stacked {
          display: flex !important;
          flex-direction: column-reverse !important;
          gap: 16px !important;
        }

        .meeting-audio-player .rhap_stacked .rhap_controls-section {
          justify-content: center !important;
          margin: 0 !important;
        }

        .meeting-audio-player .rhap_stacked .rhap_progress-section {
          width: 100% !important;
        }

        .meeting-audio-player .rhap_progress-section {
          direction: ltr !important;
        }

        .meeting-audio-player .rhap_progress-container {
          direction: ltr !important;
          margin: 0 !important;
        }

        .meeting-audio-player .rhap_progress-bar {
          background-color: rgba(99, 102, 241, 0.1) !important;
          border-radius: 9999px !important;
          height: 10px !important;
          direction: ltr !important;
        }

        .meeting-audio-player .rhap_progress-filled {
          background-color: rgb(99, 102, 241) !important;
          border-radius: 9999px !important;
          direction: ltr !important;
        }

        .meeting-audio-player .rhap_progress-indicator {
          background-color: rgb(99, 102, 241) !important;
          width: 18px !important;
          height: 18px !important;
          top: -5px !important;
          margin-left: -9px !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
        }

        .meeting-audio-player .rhap_time {
          display: none !important;
        }

        .meeting-audio-player .rhap_current-time {
          display: none !important;
        }

        .meeting-audio-player .rhap_total-time {
          display: none !important;
        }

        .meeting-audio-player .rhap_button-clear {
          color: #6b7280 !important;
        }

        .meeting-audio-player .rhap_button-clear:hover {
          color: rgb(99, 102, 241) !important;
        }

        .meeting-audio-player .rhap_controls-section {
          margin-right: 0 !important;
          margin-left: 0 !important;
        }

        .meeting-audio-player .rhap_main-controls {
          gap: 16px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .meeting-audio-player .rhap_main-controls button svg {
          width: 28px !important;
          height: 28px !important;
        }

        .meeting-audio-player .rhap_play-pause-button svg {
          width: 40px !important;
          height: 40px !important;
        }

        .meeting-audio-player .rhap_rewind-button,
        .meeting-audio-player .rhap_forward-button {
          transform: none !important;
        }

        .meeting-audio-player .rhap_volume-controls {
          display: none !important;
        }

        .meeting-audio-player .rhap_additional-controls {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
