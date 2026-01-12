"""Ivrit transcription provider using RunPod serverless."""

from pathlib import Path
from typing import List, Optional
from loguru import logger
import ivrit

from src.transcription.base import BaseTranscriber
from src.utils.exceptions import APIError, APIAuthenticationError, ConfigurationError
from src.utils.models import TranscriptResult, TranscriptSegment


class IvritTranscriber(BaseTranscriber):
    """Ivrit.ai transcription provider via RunPod serverless."""

    def __init__(
        self,
        api_key: str,
        endpoint_id: str,
        model: Optional[str] = "ivrit-ai/whisper-large-v3-turbo-ct2",
        language: Optional[str] = "he"
    ):
        """Initialize Ivrit transcriber.

        Args:
            api_key: RunPod API key
            endpoint_id: RunPod endpoint ID
            model: Ivrit model name (default: whisper-large-v3-turbo-ct2)
            language: Language code for transcription (default: "he" for Hebrew)
        """
        super().__init__(api_key, model)
        self.endpoint_id = endpoint_id
        self.language = language or "he"  # Default to Hebrew if None
        self.ivrit_model = None
        logger.info(f"Initialized Ivrit transcriber with model {model}, language {self.language}")

    def _initialize_model(self):
        """Lazy-load the Ivrit model."""
        if self.ivrit_model is None:
            try:
                logger.info("Loading Ivrit model...")
                self.ivrit_model = ivrit.load_model(
                    engine="runpod",
                    model=self.model,
                    api_key=self.api_key,
                    endpoint_id=self.endpoint_id,
                    core_engine="stable-whisper"  # Enable diarization support
                )
                logger.info("Ivrit model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Ivrit model: {e}")
                if "authentication" in str(e).lower() or "api key" in str(e).lower():
                    raise APIAuthenticationError(f"Ivrit authentication failed: {e}")
                raise ConfigurationError(f"Failed to initialize Ivrit model: {e}")

    async def transcribe(self, audio_path: Path) -> TranscriptResult:
        """Transcribe audio using Ivrit API with speaker diarization.

        Args:
            audio_path: Path to audio file

        Returns:
            TranscriptResult with segments including speaker information

        Raises:
            APIError: If transcription fails
            APIAuthenticationError: If authentication fails
        """
        if not audio_path.exists():
            raise ValueError(f"Audio file not found: {audio_path}")

        self._initialize_model()

        try:
            logger.info(f"Starting Ivrit transcription for {audio_path.name}")

            # Transcribe with diarization enabled
            result = self.ivrit_model.transcribe(
                path=str(audio_path),
                language=self.language,  # Use configured language
                diarize=True,   # Enable speaker diarization
                word_timestamps=False,  # Disable to reduce payload
                extra_data=False  # Disable to reduce payload
            )

            logger.info(f"Transcription complete. Processing {len(result.get('segments', []))} segments")

            # Convert Ivrit segments to our format
            segments = []
            for seg in result.get('segments', []):
                # Segment objects have .speakers (list), not .speaker
                # Access as object attributes, not dict keys
                speakers_list = seg.speakers if hasattr(seg, 'speakers') and seg.speakers else []
                speaker = speakers_list[0] if speakers_list else 'Unknown'

                segment = TranscriptSegment(
                    speaker=speaker,
                    text=seg.text.strip(),
                    start_time=seg.start,
                    end_time=seg.end
                )
                segments.append(segment)

            # Get detected language from result or use configured language
            detected_language = result.get('language', self.language)

            logger.info(f"Successfully transcribed with {len(segments)} segments")

            return TranscriptResult(
                segments=segments,
                language=detected_language,
                metadata={
                    'model': self.model,
                    'provider': 'ivrit',
                    'engine': 'runpod',
                    'diarization': True
                }
            )

        except Exception as e:
            logger.error(f"Ivrit transcription failed: {e}")
            if "authentication" in str(e).lower() or "api key" in str(e).lower():
                raise APIAuthenticationError(f"Ivrit API authentication failed: {e}")
            raise APIError(f"Ivrit transcription failed: {e}")

    def validate_config(self) -> bool:
        """Validate that API key and endpoint ID are configured.

        Returns:
            True if configuration is valid

        Raises:
            ConfigurationError: If configuration is invalid
        """
        if not self.api_key:
            raise ConfigurationError("Ivrit API key is not configured")

        if not self.endpoint_id:
            raise ConfigurationError("Ivrit endpoint ID is not configured")

        if not self.api_key.startswith("rpa_"):
            logger.warning("Ivrit API key does not start with 'rpa_' - may be invalid")

        return True

    def get_supported_formats(self) -> List[str]:
        """Get list of supported audio formats.

        Returns:
            List of supported file extensions
        """
        # Ivrit supports the same formats as Whisper
        return ['.m4a', '.mp3', '.wav', '.webm', '.mpga', '.mpeg', '.flac', '.ogg']
