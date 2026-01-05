"""Logging configuration."""

import sys
from loguru import logger


def setup_logging(log_level: str = "INFO") -> None:
    """Configure logging for the application.

    Args:
        log_level: Log level (DEBUG, INFO, WARNING, ERROR)
    """
    # Remove default handler
    logger.remove()

    # Add custom handler with formatting
    logger.add(
        sys.stderr,
        format="<green>{time:HH:MM:SS}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        level=log_level.upper(),
        colorize=True
    )

    # Add file handler for errors
    logger.add(
        "meeting-transcriber.log",
        format="{time:YYYY-MM-DD HH:MM:SS} | {level: <8} | {name}:{function}:{line} | {message}",
        level="ERROR",
        rotation="10 MB"
    )
