"""Language detection service for automatic provider routing."""

from pathlib import Path
from typing import Optional, Tuple
from loguru import logger

from src.transcription.whisper import WhisperTranscriber


# Language to provider mapping
LANGUAGE_PROVIDER_MAP = {
    "he": "ivrit",      # Hebrew -> Ivrit (optimized for Hebrew)
    "en": "whisper",    # English -> Whisper
    # All other languages default to Whisper with auto-detect
}

# Languages that Ivrit is optimized for
IVRIT_SUPPORTED_LANGUAGES = {"he"}  # Hebrew


class LanguageDetectionService:
    """Service for detecting audio language and routing to appropriate ASR provider."""

    def __init__(self, openai_api_key: str):
        """Initialize language detection service.

        Args:
            openai_api_key: OpenAI API key for Whisper
        """
        self.openai_api_key = openai_api_key

    async def detect_language(self, audio_path: Path) -> Tuple[str, float]:
        """Detect the dominant language in an audio file.

        Uses Whisper's built-in language detection.

        Args:
            audio_path: Path to audio file

        Returns:
            Tuple of (language_code, confidence) e.g. ("en", 0.95)
        """
        logger.info(f"Detecting language for audio: {audio_path}")

        transcriber = WhisperTranscriber(api_key=self.openai_api_key)
        language, confidence = await transcriber.detect_language(audio_path)

        logger.info(f"Detected language: {language} with confidence: {confidence}")
        return language, confidence

    def get_provider_for_language(self, language: str) -> str:
        """Get the recommended transcription provider for a language.

        Args:
            language: ISO 639-1 language code (e.g., "en", "he")

        Returns:
            Provider name ("whisper" or "ivrit")
        """
        provider = LANGUAGE_PROVIDER_MAP.get(language, "whisper")
        logger.info(f"Selected provider '{provider}' for language '{language}'")
        return provider

    def get_model_for_provider(self, provider: str, language: str) -> str:
        """Get the recommended model for a provider and language.

        Args:
            provider: Provider name ("whisper" or "ivrit")
            language: ISO 639-1 language code

        Returns:
            Model name
        """
        if provider == "ivrit":
            return "ivrit-ai/whisper-large-v3-turbo-ct2"
        else:
            return "whisper-1"

    async def detect_and_route(self, audio_path: Path) -> Tuple[str, str, str, float]:
        """Detect language and determine the best provider and model.

        This is the main entry point for automatic ASR routing.

        Args:
            audio_path: Path to audio file

        Returns:
            Tuple of (language, provider, model, confidence)
        """
        # Detect language
        language, confidence = await self.detect_language(audio_path)

        # Get provider and model
        provider = self.get_provider_for_language(language)
        model = self.get_model_for_provider(provider, language)

        logger.info(
            f"Language detection complete: language={language}, "
            f"provider={provider}, model={model}, confidence={confidence}"
        )

        return language, provider, model, confidence


def get_language_detection_service(openai_api_key: str) -> LanguageDetectionService:
    """Factory function to create a LanguageDetectionService.

    Args:
        openai_api_key: OpenAI API key

    Returns:
        LanguageDetectionService instance
    """
    return LanguageDetectionService(openai_api_key)
