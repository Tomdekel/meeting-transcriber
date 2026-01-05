"""Audio recording for live meetings."""

import sys
import time
import select
import tempfile
from pathlib import Path
from typing import Optional, Literal
from dataclasses import dataclass

import numpy as np
import sounddevice as sd
import soundfile as sf
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from loguru import logger

from src.utils.exceptions import AudioFileError


RecordingSource = Literal["microphone", "system"]


@dataclass
class RecordingConfig:
    """Configuration for audio recording."""
    source: RecordingSource = "microphone"
    device_id: Optional[int] = None
    sample_rate: int = 44100  # CD quality
    channels: int = 2  # Stereo
    output_format: str = "wav"


class AudioRecorder:
    """Real-time audio recorder supporting microphone and system audio."""

    def __init__(self, config: RecordingConfig):
        """Initialize audio recorder.

        Args:
            config: Recording configuration
        """
        self.config = config
        self.console = Console()
        self.is_recording = False
        self.audio_buffer = []
        self.start_time = None

    def list_devices(self) -> None:
        """List available audio input devices."""
        devices = sd.query_devices()
        self.console.print("\n[bold cyan]Available Audio Devices:[/bold cyan]\n")

        for i, device in enumerate(devices):
            if device['max_input_channels'] > 0:
                device_type = "System Audio" if "BlackHole" in device['name'] else "Microphone"
                self.console.print(f"  [{i}] {device['name']} ({device_type})")
                self.console.print(f"      Channels: {device['max_input_channels']}, "
                                 f"Sample Rate: {device['default_samplerate']:.0f}Hz\n")

    def get_device_id(self) -> int:
        """Get device ID based on recording source.

        Returns:
            Device ID to use

        Raises:
            AudioFileError: If device not found
        """
        if self.config.device_id is not None:
            return self.config.device_id

        devices = sd.query_devices()

        if self.config.source == "system":
            # Find BlackHole device
            for i, device in enumerate(devices):
                if "BlackHole" in device['name'] and device['max_input_channels'] > 0:
                    logger.info(f"Found BlackHole device: {device['name']}")
                    return i

            raise AudioFileError(
                "BlackHole audio device not found. Please install BlackHole:\n"
                "  brew install blackhole-2ch\n"
                "  Then configure your audio settings to route system audio to BlackHole."
            )
        else:
            # Use default microphone
            default_input = sd.default.device[0]
            if default_input is not None and default_input >= 0:
                logger.info(f"Using default microphone: {devices[default_input]['name']}")
                return default_input
            else:
                raise AudioFileError("No default microphone found. Please check your audio settings.")

    def _audio_callback(self, indata, frames, time_info, status):
        """Callback for audio stream (captures audio data).

        Args:
            indata: Input audio data
            frames: Number of frames
            time_info: Time information
            status: Status flags
        """
        if status:
            logger.warning(f"Audio stream status: {status}")

        # Append audio data to buffer
        self.audio_buffer.append(indata.copy())

    def record(self, output_path: Path) -> Path:
        """Record audio interactively until user stops.

        Args:
            output_path: Path to save recording

        Returns:
            Path to recorded audio file

        Raises:
            AudioFileError: If recording fails
        """
        try:
            device_id = self.get_device_id()

            self.console.print(f"\n[bold green]Recording from {self.config.source}...[/bold green]")
            self.console.print("[yellow]Press ENTER to stop recording[/yellow]\n")

            # Start recording
            self.is_recording = True
            self.audio_buffer = []
            self.start_time = time.time()

            # Create audio stream
            with sd.InputStream(
                device=device_id,
                channels=self.config.channels,
                samplerate=self.config.sample_rate,
                callback=self._audio_callback
            ):
                # Display recording timer
                with Live(self._get_timer_panel(0), console=self.console, refresh_per_second=10) as live:
                    while self.is_recording:
                        # Check for Enter key press (non-blocking)
                        # Use select for non-blocking input check
                        if sys.platform != 'win32':
                            # Unix-like systems
                            ready, _, _ = select.select([sys.stdin], [], [], 0.1)
                            if ready:
                                sys.stdin.readline()  # Consume the Enter
                                self.is_recording = False
                                break
                        else:
                            # Windows fallback - blocking input with timeout
                            import msvcrt
                            if msvcrt.kbhit():
                                key = msvcrt.getch()
                                if key in [b'\r', b'\n']:  # Enter key
                                    self.is_recording = False
                                    break

                        # Update timer
                        elapsed = time.time() - self.start_time
                        live.update(self._get_timer_panel(elapsed))
                        time.sleep(0.1)

            # Save recording
            elapsed = time.time() - self.start_time
            self.console.print(f"\n[green]Recording stopped. Duration: {self._format_duration(elapsed)}[/green]")

            return self._save_recording(output_path)

        except Exception as e:
            if isinstance(e, AudioFileError):
                raise
            logger.error(f"Recording failed: {e}")
            raise AudioFileError(f"Recording failed: {e}")

    def _save_recording(self, output_path: Path) -> Path:
        """Save recorded audio buffer to file.

        Args:
            output_path: Path to save file

        Returns:
            Path to saved file

        Raises:
            AudioFileError: If save fails
        """
        if not self.audio_buffer:
            raise AudioFileError("No audio data recorded")

        try:
            # Concatenate audio chunks
            audio_data = np.concatenate(self.audio_buffer, axis=0)

            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Save as WAV
            sf.write(
                str(output_path),
                audio_data,
                self.config.sample_rate,
                subtype='PCM_16'
            )

            file_size = output_path.stat().st_size / 1024 / 1024  # MB
            self.console.print(f"[green]Saved recording: {output_path} ({file_size:.2f}MB)[/green]\n")

            logger.info(f"Recording saved: {output_path} ({file_size:.2f}MB)")
            return output_path

        except Exception as e:
            logger.error(f"Failed to save recording: {e}")
            raise AudioFileError(f"Failed to save recording: {e}")

    def _get_timer_panel(self, elapsed: float) -> Panel:
        """Create timer panel for display.

        Args:
            elapsed: Elapsed seconds

        Returns:
            Rich Panel with timer
        """
        duration = self._format_duration(elapsed)
        return Panel(
            f"[bold red]● REC[/bold red] {duration}",
            title="Recording",
            border_style="red"
        )

    @staticmethod
    def _format_duration(seconds: float) -> str:
        """Format duration as HH:MM:SS.

        Args:
            seconds: Duration in seconds

        Returns:
            Formatted string
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)

        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"
