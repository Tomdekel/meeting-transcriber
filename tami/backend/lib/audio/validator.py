"""Audio file validation."""

import subprocess
from pathlib import Path
from typing import Tuple

from lib.utils.exceptions import AudioFileError


class AudioValidator:
    """Validate audio files."""

    SUPPORTED_FORMATS = ['.m4a', '.wav', '.mp3', '.flac', '.ogg', '.webm', '.mpga', '.mpeg']
    MAX_DURATION = 7200  # 2 hours in seconds

    @staticmethod
    def validate(file_path: Path) -> None:
        """Validate audio file.

        Args:
            file_path: Path to audio file

        Raises:
            AudioFileError: If file is invalid
        """
        # Check file exists
        if not file_path.exists():
            raise AudioFileError(f"File not found: {file_path}")

        # Check file is readable
        if not file_path.is_file():
            raise AudioFileError(f"Not a file: {file_path}")

        if not file_path.stat().st_size > 0:
            raise AudioFileError(f"File is empty: {file_path}")

        # Check format is supported
        if file_path.suffix.lower() not in AudioValidator.SUPPORTED_FORMATS:
            raise AudioFileError(
                f"Unsupported format: {file_path.suffix}. "
                f"Supported formats: {', '.join(AudioValidator.SUPPORTED_FORMATS)}"
            )

    @staticmethod
    def check_ffmpeg() -> bool:
        """Check if ffmpeg is installed.

        Returns:
            True if ffmpeg is available

        Raises:
            AudioFileError: If ffmpeg is not installed
        """
        try:
            subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                check=True
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise AudioFileError(
                "ffmpeg is not installed. Please install it:\n"
                "  macOS: brew install ffmpeg\n"
                "  Ubuntu: sudo apt-get install ffmpeg\n"
                "  Windows: Download from https://ffmpeg.org/"
            )

    @staticmethod
    def get_duration(file_path: Path) -> float:
        """Get audio file duration in seconds.

        Args:
            file_path: Path to audio file

        Returns:
            Duration in seconds

        Raises:
            AudioFileError: If duration cannot be determined
        """
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(str(file_path))
            return len(audio) / 1000.0  # Convert ms to seconds
        except Exception as e:
            raise AudioFileError(f"Could not determine duration: {e}")
