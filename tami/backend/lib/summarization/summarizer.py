"""GPT-4o mini summarizer for meeting transcripts."""

import json
from typing import List

from loguru import logger
from openai import AsyncOpenAI

from lib.summarization.prompts import SUMMARY_SYSTEM_PROMPT, create_summary_prompt
from lib.utils.exceptions import APIError, APIAuthenticationError
from lib.utils.models import Summary, ActionItem, TranscriptResult


class Summarizer:
    """Generate meeting summaries using GPT-4o mini."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        """Initialize summarizer.

        Args:
            api_key: OpenAI API key
            model: Model name (default: gpt-4o-mini)
        """
        self.api_key = api_key
        self.model = model
        self.client = AsyncOpenAI(api_key=api_key)

    async def generate_summary(
        self,
        transcript: TranscriptResult,
        context: str,
        participants: List[str]
    ) -> Summary:
        """Generate summary with action items.

        Args:
            transcript: Transcription result
            context: Meeting context
            participants: List of participant names

        Returns:
            Summary object with overview, key points, and action items

        Raises:
            APIError: If summary generation fails
        """
        logger.info("Generating meeting summary with GPT-4o mini")

        # Convert transcript to text
        transcript_text = self._format_transcript(transcript)

        try:
            # Create prompt
            user_prompt = create_summary_prompt(transcript_text, context, participants)

            # Call GPT-4o mini
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )

            # Parse response
            content = response.choices[0].message.content
            summary_data = json.loads(content)

            # Convert to Summary object
            action_items = [
                ActionItem(
                    description=item.get('description', ''),
                    assignee=item.get('assignee'),
                    deadline=item.get('deadline')
                )
                for item in summary_data.get('action_items', [])
            ]

            summary = Summary(
                overview=summary_data.get('overview', ''),
                key_points=summary_data.get('key_points', []),
                action_items=action_items,
                participants=participants
            )

            logger.info(f"Summary generated: {len(summary.key_points)} key points, "
                       f"{len(summary.action_items)} action items")

            return summary

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse summary JSON: {e}")
            # Fallback: create basic summary
            return Summary(
                overview="Summary generation failed. Please review the transcript.",
                key_points=[],
                action_items=[],
                participants=participants
            )

        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            if 'authentication' in str(e).lower() or 'api key' in str(e).lower():
                raise APIAuthenticationError(f"OpenAI API authentication failed: {e}")
            raise APIError(f"Summary generation error: {e}")

    def _format_transcript(self, transcript: TranscriptResult) -> str:
        """Format transcript for summary generation.

        Args:
            transcript: Transcript result

        Returns:
            Formatted transcript text
        """
        lines = []
        for segment in transcript.segments:
            if segment.start_time > 0:
                timestamp = f"[{self._format_time(segment.start_time)}]"
                lines.append(f"{timestamp} {segment.speaker}: {segment.text}")
            else:
                lines.append(f"{segment.speaker}: {segment.text}")

        return "\n".join(lines)

    @staticmethod
    def _format_time(seconds: float) -> str:
        """Format seconds as MM:SS.

        Args:
            seconds: Time in seconds

        Returns:
            Formatted time string
        """
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"
