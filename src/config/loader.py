"""Configuration loader with layered priority system."""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from src.utils.exceptions import ConfigurationError


class Config(BaseModel):
    """Application configuration."""

    # Audio
    audio_path: Optional[Path] = None

    # Participants and context
    participants: List[str] = Field(default_factory=list)
    context: str = ""

    # Transcription
    transcription_provider: str = "whisper"
    transcription_api_key: Optional[str] = None
    transcription_model: Optional[str] = "whisper-1"
    transcription_language: str = "auto"

    # Summarization & Chat (GPT-4o mini)
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"

    # Chat settings
    chat_enabled: bool = True
    chat_save_history: bool = True

    # Output
    output_formats: List[str] = Field(default_factory=lambda: ["markdown", "plaintext"])
    output_dir: Path = Path("./output")
    include_timestamps: bool = True

    # Audio processing
    audio_normalize: bool = True
    audio_sample_rate: int = 16000

    # Recording settings
    record_source: str = "microphone"
    record_device_id: Optional[int] = None
    record_sample_rate: int = 44100
    record_channels: int = 2
    record_output_format: str = "wav"

    # Logging
    log_level: str = "INFO"

    class Config:
        arbitrary_types_allowed = True


class ConfigLoader:
    """Load and merge configuration from multiple sources."""

    @staticmethod
    def _load_defaults() -> Dict[str, Any]:
        """Get default configuration values."""
        return {
            "transcription_provider": "whisper",
            "transcription_model": "whisper-1",
            "transcription_language": "auto",
            "openai_model": "gpt-4o-mini",
            "chat_enabled": True,
            "chat_save_history": True,
            "output_formats": ["markdown", "plaintext"],
            "output_dir": "./output",
            "include_timestamps": True,
            "audio_normalize": True,
            "audio_sample_rate": 16000,
            "record_source": "microphone",
            "record_device_id": None,
            "record_sample_rate": 44100,
            "record_channels": 2,
            "record_output_format": "wav",
            "log_level": "INFO",
        }

    @staticmethod
    def _load_yaml(config_path: Path) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        if not config_path.exists():
            raise ConfigurationError(f"Config file not found: {config_path}")

        with open(config_path, 'r') as f:
            try:
                return yaml.safe_load(f) or {}
            except yaml.YAMLError as e:
                raise ConfigurationError(f"Invalid YAML in config file: {e}")

    @staticmethod
    def _load_env() -> Dict[str, Any]:
        """Load configuration from environment variables."""
        load_dotenv()

        env_config = {}

        # API Keys
        if os.getenv("TRANSCRIPTION_API_KEY"):
            env_config["transcription_api_key"] = os.getenv("TRANSCRIPTION_API_KEY")
        if os.getenv("OPENAI_API_KEY"):
            env_config["openai_api_key"] = os.getenv("OPENAI_API_KEY")

        # Other settings
        if os.getenv("TRANSCRIPTION_PROVIDER"):
            env_config["transcription_provider"] = os.getenv("TRANSCRIPTION_PROVIDER")
        if os.getenv("LOG_LEVEL"):
            env_config["log_level"] = os.getenv("LOG_LEVEL")

        return env_config

    @staticmethod
    def _merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """Merge two configuration dictionaries."""
        merged = base.copy()

        for key, value in override.items():
            if value is not None:  # Only override with non-None values
                # Handle nested dicts (like transcription, summarization sections)
                if isinstance(value, dict) and key in merged and isinstance(merged[key], dict):
                    merged[key] = ConfigLoader._merge(merged[key], value)
                else:
                    merged[key] = value

        return merged

    @staticmethod
    def _flatten_nested_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Flatten nested YAML structure into flat config."""
        flat = {}

        # Handle transcription section
        if "transcription" in config:
            trans = config["transcription"]
            if "provider" in trans:
                flat["transcription_provider"] = trans["provider"]
            if "api_key" in trans:
                flat["transcription_api_key"] = trans["api_key"]
            if "model" in trans:
                flat["transcription_model"] = trans["model"]
            if "language" in trans:
                flat["transcription_language"] = trans["language"]

        # Handle summarization section
        if "summarization" in config:
            summ = config["summarization"]
            if "api_key" in summ:
                flat["openai_api_key"] = summ["api_key"]
            if "model" in summ:
                flat["openai_model"] = summ["model"]

        # Handle chat section
        if "chat" in config:
            chat = config["chat"]
            if "enabled" in chat:
                flat["chat_enabled"] = chat["enabled"]
            if "save_history" in chat:
                flat["chat_save_history"] = chat["save_history"]

        # Handle output section
        if "output" in config:
            out = config["output"]
            if "formats" in out:
                flat["output_formats"] = out["formats"]
            if "directory" in out:
                flat["output_dir"] = out["directory"]
            if "include_timestamps" in out:
                flat["include_timestamps"] = out["include_timestamps"]

        # Handle audio section
        if "audio" in config:
            audio = config["audio"]
            if "normalize" in audio:
                flat["audio_normalize"] = audio["normalize"]
            if "sample_rate" in audio:
                flat["audio_sample_rate"] = audio["sample_rate"]

        # Handle recording section
        if "recording" in config:
            rec = config["recording"]
            if "source" in rec:
                flat["record_source"] = rec["source"]
            if "device_id" in rec:
                flat["record_device_id"] = rec["device_id"]
            if "sample_rate" in rec:
                flat["record_sample_rate"] = rec["sample_rate"]
            if "channels" in rec:
                flat["record_channels"] = rec["channels"]
            if "output_format" in rec:
                flat["record_output_format"] = rec["output_format"]

        # Copy top-level keys that aren't sections
        for key in ["audio_path", "participants", "context", "log_level"]:
            if key in config:
                flat[key] = config[key]

        return flat

    def load(self, config_path: Optional[Path] = None, cli_args: Optional[Dict[str, Any]] = None) -> Config:
        """Load configuration from all sources with priority.

        Priority (lowest to highest):
        1. Defaults
        2. YAML config file
        3. Environment variables
        4. CLI arguments

        Args:
            config_path: Optional path to YAML config file
            cli_args: Optional dictionary of CLI arguments

        Returns:
            Merged Config object

        Raises:
            ConfigurationError: If configuration is invalid
        """
        # 1. Start with defaults
        config = self._load_defaults()

        # 2. Merge YAML config if provided
        if config_path:
            yaml_config = self._load_yaml(config_path)
            flat_yaml = self._flatten_nested_config(yaml_config)
            config = self._merge(config, flat_yaml)

        # 3. Merge environment variables
        env_config = self._load_env()
        config = self._merge(config, env_config)

        # 4. Merge CLI arguments (highest priority)
        if cli_args:
            # Remove None values from CLI args
            cli_args_clean = {k: v for k, v in cli_args.items() if v is not None}
            config = self._merge(config, cli_args_clean)

        # Create and validate Config object
        try:
            return Config(**config)
        except Exception as e:
            raise ConfigurationError(f"Invalid configuration: {e}")
