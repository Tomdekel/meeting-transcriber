"""Summarization service - integrates with existing meeting-transcriber code."""

import sys
from pathlib import Path
from typing import Optional, List
from loguru import logger

# Add parent directory to path to import from meeting-transcriber
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from lib.summarization.summarizer import Summarizer
from lib.utils.models import TranscriptResult, Summary


class SummarizationService:
    """Service for generating meeting summaries."""

    async def generate_summary(
        self,
        transcript: TranscriptResult,
        context: str,
        participants: List[str],
        api_key: str,
        model: str = "gpt-4o-mini"
    ) -> Summary:
        """Generate summary from transcript.

        Args:
            transcript: Transcript result
            context: Meeting context
            participants: List of participants
            api_key: OpenAI API key
            model: Model to use for summarization

        Returns:
            Summary object with overview, key points, and action items
        """
        logger.info(f"Generating summary with {model}")

        try:
            summarizer = Summarizer(api_key=api_key, model=model)
            summary = await summarizer.generate_summary(
                transcript=transcript,
                context=context,
                participants=participants
            )
            logger.info("Summary generated successfully")
            return summary

        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            raise


# Singleton instance
summarization_service = SummarizationService()
