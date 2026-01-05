"""Transcription service - integrates with existing meeting-transcriber code."""

import sys
from pathlib import Path
from typing import Optional, List
from loguru import logger

# Add parent directory to path to import from meeting-transcriber
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from src.transcription.whisper import WhisperTranscriber
# from src.transcription.ivrit import IvritTranscriber  # TODO: Implement Ivrit integration
from src.audio.processor import AudioProcessor
from src.diarization.speaker_labeler import SpeakerLabeler
from src.utils.models import TranscriptResult
from src.utils.exceptions import AudioFileError, APIError


class TranscriptionService:
    """Service for handling audio transcription."""

    def __init__(self):
        """Initialize transcription service."""
        self.audio_processor = AudioProcessor(normalize=True, sample_rate=16000)

    async def transcribe_audio(
        self,
        audio_path: Path,
        provider: str,
        model: str,
        api_key: str,
        participants: Optional[List[str]] = None
    ) -> TranscriptResult:
        """Transcribe audio file.

        Args:
            audio_path: Path to audio file
            provider: Transcription provider ("whisper" or "ivrit")
            model: Model name
            api_key: API key for the provider
            participants: List of participant names for speaker labeling

        Returns:
            TranscriptResult with segments

        Raises:
            AudioFileError: If audio processing fails
            APIError: If transcription API fails
        """
        logger.info(f"Transcribing audio with {provider}/{model}: {audio_path}")

        try:
            # Process audio
            processed_audio = self.audio_processor.process(audio_path)
            logger.info(f"Audio processed: {processed_audio}")

            # Create transcriber based on provider
            if provider.lower() == "whisper":
                transcriber = WhisperTranscriber(api_key=api_key, model=model)
            # elif provider.lower() == "ivrit":
            #     transcriber = IvritTranscriber(api_key=api_key, model=model)
            else:
                raise ValueError(f"Unsupported transcription provider: {provider}. Only 'whisper' is currently supported.")

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
