"""Factory for creating transcription providers."""

from typing import Optional

from src.transcription.base import BaseTranscriber
from src.transcription.whisper import WhisperTranscriber
from src.utils.exceptions import ConfigurationError


class TranscriberFactory:
    """Factory for creating transcription providers."""

    PROVIDERS = {
        'whisper': WhisperTranscriber,
    }

    @staticmethod
    def create(
        provider: str,
        api_key: str,
        model: Optional[str] = None
    ) -> BaseTranscriber:
        """Create a transcriber instance.

        Args:
            provider: Provider name ('whisper', 'ivrit', etc.)
            api_key: API key for the provider
            model: Optional model name

        Returns:
            Transcriber instance

        Raises:
            ConfigurationError: If provider is unknown
        """
        if provider not in TranscriberFactory.PROVIDERS:
            available = ', '.join(TranscriberFactory.PROVIDERS.keys())
            raise ConfigurationError(
                f"Unknown transcription provider: {provider}. "
                f"Available providers: {available}"
            )

        transcriber_class = TranscriberFactory.PROVIDERS[provider]
        return transcriber_class(api_key=api_key, model=model)

    @staticmethod
    def register_provider(name: str, transcriber_class: type) -> None:
        """Register a new transcription provider.

        Args:
            name: Provider name
            transcriber_class: Transcriber class
        """
        TranscriberFactory.PROVIDERS[name] = transcriber_class
