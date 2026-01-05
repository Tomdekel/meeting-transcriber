"""Base interface for transcription providers."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional

from src.utils.models import TranscriptResult


class BaseTranscriber(ABC):
    """Abstract base class for all transcription providers."""

    def __init__(self, api_key: str, model: Optional[str] = None):
        """Initialize the transcriber.

        Args:
            api_key: API key for the transcription service
            model: Optional model name/version
        """
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def transcribe(self, audio_path: Path) -> TranscriptResult:
        """Transcribe audio file to text with speaker segments.

        Args:
            audio_path: Path to the audio file

        Returns:
            TranscriptResult with segments and metadata

        Raises:
            AudioFileError: If audio file is invalid
            APIError: If transcription API fails
        """
        pass

    @abstractmethod
    def validate_config(self) -> bool:
        """Validate API key and model configuration.

        Returns:
            True if configuration is valid

        Raises:
            ConfigurationError: If configuration is invalid
        """
        pass

    @abstractmethod
    def get_supported_formats(self) -> List[str]:
        """Return list of supported audio formats.

        Returns:
            List of file extensions (e.g., ['.m4a', '.wav'])
        """
        pass
