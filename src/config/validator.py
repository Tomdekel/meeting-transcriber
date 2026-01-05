"""Configuration validation."""

from pathlib import Path

from src.config.loader import Config
from src.utils.exceptions import ConfigurationError


class ConfigValidator:
    """Validate configuration values."""

    @staticmethod
    def validate(config: Config) -> None:
        """Validate configuration.

        Args:
            config: Configuration to validate

        Raises:
            ConfigurationError: If configuration is invalid
        """
        # Validate audio path
        if config.audio_path is None:
            raise ConfigurationError("Audio path is required")

        if not isinstance(config.audio_path, Path):
            config.audio_path = Path(config.audio_path)

        if not config.audio_path.exists():
            raise ConfigurationError(f"Audio file not found: {config.audio_path}")

        # Validate API keys
        if config.transcription_provider == "whisper":
            if not config.openai_api_key:
                raise ConfigurationError(
                    "OpenAI API key is required for Whisper transcription. "
                    "Set via --openai-key, OPENAI_API_KEY env var, or config file."
                )
        elif config.transcription_provider == "ivrit":
            if not config.transcription_api_key:
                raise ConfigurationError(
                    "Transcription API key is required for Ivrit. "
                    "Set via --transcription-key or config file."
                )

        # For summarization and chat, we need OpenAI key
        if not config.openai_api_key:
            raise ConfigurationError(
                "OpenAI API key is required for summarization and chat. "
                "Set via --openai-key, OPENAI_API_KEY env var, or config file."
            )

        # Validate output formats
        valid_formats = ["markdown", "plaintext"]
        for fmt in config.output_formats:
            if fmt not in valid_formats:
                raise ConfigurationError(
                    f"Invalid output format: {fmt}. Valid formats: {', '.join(valid_formats)}"
                )

        # Validate output directory (create if doesn't exist)
        if not isinstance(config.output_dir, Path):
            config.output_dir = Path(config.output_dir)

        config.output_dir.mkdir(parents=True, exist_ok=True)

        # Validate participants
        if not config.participants:
            raise ConfigurationError(
                "At least one participant is required. "
                "Set via --participants or config file."
            )

        # Validate context
        if not config.context:
            raise ConfigurationError(
                "Meeting context is required. "
                "Set via --context or config file."
            )
