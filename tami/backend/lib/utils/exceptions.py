"""Custom exceptions for the meeting transcriber."""


class TranscriberError(Exception):
    """Base exception for all transcription errors."""
    pass


class AudioFileError(TranscriberError):
    """Audio file issues: not found, unsupported format, corrupted."""
    pass


class APIError(TranscriberError):
    """Base for API-related errors."""
    pass


class APIAuthenticationError(APIError):
    """Invalid API key or authentication failure."""
    pass


class APIRateLimitError(APIError):
    """Rate limit exceeded."""
    pass


class APINetworkError(APIError):
    """Network connectivity issues."""
    pass


class ConfigurationError(TranscriberError):
    """Invalid configuration."""
    pass


class OutputError(TranscriberError):
    """Output generation or file writing issues."""
    pass
