"""Whisper transcription provider."""

from pathlib import Path
from typing import List, Optional

from loguru import logger
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from src.transcription.base import BaseTranscriber
from src.utils.exceptions import APIError, APIAuthenticationError, APINetworkError, APIRateLimitError, ConfigurationError
from src.utils.models import TranscriptResult, TranscriptSegment


class WhisperTranscriber(BaseTranscriber):
    """OpenAI Whisper transcription provider."""

    def __init__(self, api_key: str, model: Optional[str] = "whisper-1"):
        """Initialize Whisper transcriber.

        Args:
            api_key: OpenAI API key
            model: Whisper model name (default: whisper-1)
        """
        super().__init__(api_key, model)
        self.client = AsyncOpenAI(api_key=api_key)

    async def transcribe(self, audio_path: Path) -> TranscriptResult:
        """Transcribe audio using Whisper API.

        Note: Whisper does NOT provide speaker diarization natively.
        Speaker labeling must be done separately.

        Args:
            audio_path: Path to audio file

        Returns:
            TranscriptResult with segments

        Raises:
            APIError: If transcription fails
        """
        logger.info(f"Transcribing with Whisper: {audio_path}")

        try:
            transcript = await self._transcribe_with_retry(audio_path)

            # Whisper returns a single text blob, not segmented by speaker
            # For now, create a single segment. Speaker diarization will be added later.
            segments = [
                TranscriptSegment(
                    speaker="Unknown",  # Will be labeled later
                    text=transcript.text,
                    start_time=0.0,
                    end_time=0.0  # Whisper doesn't provide timestamps in basic mode
                )
            ]

            result = TranscriptResult(
                segments=segments,
                language=transcript.language if hasattr(transcript, 'language') else 'unknown',
                metadata={
                    'model': self.model,
                    'provider': 'whisper'
                }
            )

            logger.info(f"Transcription complete. Language: {result.language}")
            return result

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise self._handle_api_error(e)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type(APINetworkError),
        reraise=True
    )
    async def _transcribe_with_retry(self, audio_path: Path):
        """Transcribe with retry logic.

        Args:
            audio_path: Path to audio file

        Returns:
            Whisper transcription response

        Raises:
            APIError: If transcription fails after retries
        """
        try:
            with open(audio_path, 'rb') as audio_file:
                transcript = await self.client.audio.transcriptions.create(
                    model=self.model,
                    file=audio_file,
                    response_format="json"
                )
            return transcript

        except Exception as e:
            raise self._handle_api_error(e)

    def _handle_api_error(self, error: Exception) -> APIError:
        """Convert OpenAI errors to our custom exceptions.

        Args:
            error: Original exception

        Returns:
            Custom APIError
        """
        error_str = str(error).lower()

        if 'authentication' in error_str or 'api key' in error_str or 'unauthorized' in error_str:
            return APIAuthenticationError(f"OpenAI API authentication failed: {error}")
        elif 'rate limit' in error_str or 'quota' in error_str:
            return APIRateLimitError(f"OpenAI API rate limit exceeded: {error}")
        elif 'timeout' in error_str or 'connection' in error_str:
            return APINetworkError(f"Network error calling OpenAI API: {error}")
        else:
            return APIError(f"OpenAI API error: {error}")

    def validate_config(self) -> bool:
        """Validate API key and model configuration.

        Returns:
            True if valid

        Raises:
            ConfigurationError: If invalid
        """
        if not self.api_key:
            raise ConfigurationError("OpenAI API key is required for Whisper")

        if not self.api_key.startswith('sk-'):
            logger.warning("OpenAI API key should start with 'sk-'")

        return True

    def get_supported_formats(self) -> List[str]:
        """Get supported audio formats.

        Returns:
            List of supported file extensions
        """
        return ['.m4a', '.mp3', '.wav', '.webm', '.mpga', '.mpeg', '.flac', '.ogg']
