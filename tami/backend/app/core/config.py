"""Application configuration."""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(env_file='.env', case_sensitive=True)

    # Application
    APP_NAME: str = "Tami - Meeting Transcriber"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql://tami:tami@localhost:5432/tami"

    # File Upload
    UPLOAD_DIR: Path = Path("./uploads")
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: set[str] = {".m4a", ".mp3", ".wav", ".webm", ".mpga", ".mpeg", ".flac", ".ogg"}

    # Security
    SECRET_KEY: str = "change-this-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ENCRYPTION_KEY: Optional[str] = None  # For encrypting API keys, will be generated if not set

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # CORS - production origins
    CORS_ORIGINS: str = "http://localhost:3000"  # Comma-separated in production

    # Session
    SESSION_CLEANUP_DAYS: int = 30  # Delete sessions older than 30 days

    # Transcription
    DEFAULT_TRANSCRIPTION_PROVIDER: str = "ivrit"  # Changed from "whisper" to "ivrit"
    DEFAULT_TRANSCRIPTION_MODEL: str = "ivrit-ai/whisper-large-v3-turbo-ct2"

    # Ivrit Configuration
    IVRIT_API_KEY: Optional[str] = None
    IVRIT_ENDPOINT_ID: Optional[str] = None

    # Summarization
    DEFAULT_SUMMARY_MODEL: str = "gpt-4o-mini"

    # Chat
    DEFAULT_CHAT_MODEL: str = "gpt-4o-mini"

    # API Keys (for development - in production, users set this in settings)
    OPENAI_API_KEY: Optional[str] = None

    # Recording
    MAX_RECORDING_DURATION: int = 7200  # 2 hours in seconds
    RECORDING_CHUNK_SIZE: int = 1024 * 1024  # 1MB chunks


settings = Settings()

# Ensure upload directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
