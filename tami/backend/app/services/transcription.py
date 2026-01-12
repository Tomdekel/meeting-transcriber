"""Transcription service - integrates with existing meeting-transcriber code."""

import sys
from pathlib import Path
from typing import Optional, List, Tuple
from loguru import logger

# Add parent directory to path to import from meeting-transcriber
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from src.transcription.whisper import WhisperTranscriber
from src.transcription.ivrit import IvritTranscriber
from src.audio.processor import AudioProcessor
from src.diarization.speaker_labeler import SpeakerLabeler
from lib.utils.models import TranscriptResult
from src.utils.exceptions import AudioFileError, APIError


class TranscriptionService:
    """Service for handling audio transcription."""

    # Language to provider mapping
    LANGUAGE_PROVIDER_MAP = {
        "he": "ivrit",      # Hebrew -> Ivrit (optimized for Hebrew)
        "en": "whisper",    # English -> Whisper with English specified
        # All other languages default to Whisper with auto-detect
    }

    def __init__(self):
        """Initialize transcription service."""
        self.audio_processor = AudioProcessor(normalize=True, sample_rate=16000)

    async def detect_language(
        self,
        audio_path: Path,
        api_key: str
    ) -> Tuple[str, float]:
        """Detect the dominant language in an audio file.

        Args:
            audio_path: Path to audio file
            api_key: OpenAI API key for Whisper

        Returns:
            Tuple of (language_code, confidence) e.g. ("en", 0.95)
        """
        logger.info(f"Detecting language for: {audio_path}")

        try:
            # Process audio first
            processed_audio = self.audio_processor.process(audio_path)

            # Use Whisper to detect language
            transcriber = WhisperTranscriber(api_key=api_key)
            language, confidence = await transcriber.detect_language(processed_audio)

            # Clean up processed audio if different from original
            if processed_audio != audio_path:
                self.audio_processor.cleanup(processed_audio)

            logger.info(f"Detected language: {language} (confidence: {confidence})")
            return language, confidence

        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            # Clean up on error
            if 'processed_audio' in locals() and processed_audio != audio_path:
                self.audio_processor.cleanup(processed_audio)
            raise

    def get_provider_for_language(self, language: str) -> str:
        """Get the recommended transcription provider for a language.

        Args:
            language: ISO 639-1 language code (e.g., "en", "he")

        Returns:
            Provider name ("whisper" or "ivrit")
        """
        provider = self.LANGUAGE_PROVIDER_MAP.get(language, "whisper")
        logger.info(f"Selected provider '{provider}' for language '{language}'")
        return provider

    def get_model_for_provider(self, provider: str) -> str:
        """Get the default model for a provider.

        Args:
            provider: Provider name ("whisper" or "ivrit")

        Returns:
            Model name
        """
        if provider == "ivrit":
            return "ivrit-ai/whisper-large-v3-turbo-ct2"
        else:
            return "whisper-1"

    async def transcribe_with_auto_routing(
        self,
        audio_path: Path,
        openai_api_key: str,
        ivrit_api_key: Optional[str] = None,
        ivrit_endpoint_id: Optional[str] = None,
        participants: Optional[List[str]] = None
    ) -> Tuple[TranscriptResult, str]:
        """Transcribe audio with automatic language detection and provider routing.

        This is the main entry point for automatic ASR routing.

        Args:
            audio_path: Path to audio file
            openai_api_key: OpenAI API key (for Whisper and language detection)
            ivrit_api_key: Ivrit API key (optional, required for Hebrew)
            ivrit_endpoint_id: Ivrit endpoint ID (optional, required for Hebrew)
            participants: List of participant names for speaker labeling

        Returns:
            Tuple of (TranscriptResult, detected_language)
        """
        logger.info(f"Starting auto-routed transcription for: {audio_path}")

        # Step 1: Detect language
        language, confidence = await self.detect_language(audio_path, openai_api_key)

        # Step 2: Get provider and model
        provider = self.get_provider_for_language(language)
        model = self.get_model_for_provider(provider)

        # Step 3: Route to appropriate provider
        if provider == "ivrit" and ivrit_api_key and ivrit_endpoint_id:
            logger.info(f"Routing to Ivrit provider for Hebrew (language={language})")
            api_key = ivrit_api_key
            endpoint_id = ivrit_endpoint_id
        else:
            # Fall back to Whisper if Ivrit not configured or for non-Hebrew
            if provider == "ivrit" and (not ivrit_api_key or not ivrit_endpoint_id):
                logger.warning("Ivrit provider not configured, falling back to Whisper")
                provider = "whisper"
                model = "whisper-1"
            logger.info(f"Routing to Whisper provider (language={language})")
            api_key = openai_api_key
            endpoint_id = None

        # Step 4: Transcribe
        transcript_result = await self.transcribe_audio(
            audio_path=audio_path,
            provider=provider,
            model=model,
            api_key=api_key,
            participants=participants,
            endpoint_id=endpoint_id,
            language=language
        )

        return transcript_result, language

    async def transcribe_audio(
        self,
        audio_path: Path,
        provider: str,
        model: str,
        api_key: str,
        participants: Optional[List[str]] = None,
        endpoint_id: Optional[str] = None,
        language: Optional[str] = None
    ) -> TranscriptResult:
        """Transcribe audio file.

        Args:
            audio_path: Path to audio file
            provider: Transcription provider ("whisper" or "ivrit")
            model: Model name
            api_key: API key for the provider
            participants: List of participant names for speaker labeling
            endpoint_id: Endpoint ID (required for Ivrit provider)
            language: Optional language code (e.g., "en", "he"). If None, auto-detect.

        Returns:
            TranscriptResult with segments

        Raises:
            AudioFileError: If audio processing fails
            APIError: If transcription API fails
        """
        logger.info(f"Transcribing audio with {provider}/{model}: {audio_path} (language={language})")

        try:
            # Process audio
            processed_audio = self.audio_processor.process(audio_path)
            logger.info(f"Audio processed: {processed_audio}")

            # Create transcriber based on provider
            if provider.lower() == "whisper":
                transcriber = WhisperTranscriber(api_key=api_key, model=model, language=language)
            elif provider.lower() == "ivrit":
                if not endpoint_id:
                    raise ValueError("endpoint_id is required for Ivrit provider")
                transcriber = IvritTranscriber(api_key=api_key, endpoint_id=endpoint_id, model=model, language=language)
            else:
                raise ValueError(f"Unsupported transcription provider: {provider}. Supported providers: 'whisper', 'ivrit'")

            # Validate configuration
            transcriber.validate_config()

            # Transcribe
            transcript_result = await transcriber.transcribe(processed_audio)
            logger.info(f"Transcription complete. Language: {transcript_result.language}")

            # Label speakers if participants provided
            if participants:
                labeler = SpeakerLabeler(participants)
                transcript_result = labeler.label_speakers(transcript_result)
                logger.info(f"Speakers labeled: {participants}")

            # Clean up processed audio if it's different from original
            if processed_audio != audio_path:
                self.audio_processor.cleanup(processed_audio)

            return transcript_result

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            # Clean up on error
            if 'processed_audio' in locals() and processed_audio != audio_path:
                self.audio_processor.cleanup(processed_audio)
            raise

    def get_supported_formats(self, provider: str) -> List[str]:
        """Get supported audio formats for a provider.

        Args:
            provider: Transcription provider name

        Returns:
            List of supported file extensions
        """
        if provider.lower() == "whisper":
            return ['.m4a', '.mp3', '.wav', '.webm', '.mpga', '.mpeg', '.flac', '.ogg']
        elif provider.lower() == "ivrit":
            return ['.m4a', '.mp3', '.wav', '.flac']
        else:
            return []


# Singleton instance
transcription_service = TranscriptionService()
