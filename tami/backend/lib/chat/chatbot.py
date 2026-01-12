"""GPT-4o mini chatbot for Q&A about transcripts."""

from typing import List, Dict

from loguru import logger
from openai import AsyncOpenAI

from lib.utils.exceptions import APIError
from lib.utils.models import TranscriptResult, Summary


class Chatbot:
    """Interactive Q&A about meeting transcripts using GPT-4o mini."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        """Initialize chatbot.

        Args:
            api_key: OpenAI API key
            model: Model name (default: gpt-4o-mini)
        """
        self.api_key = api_key
        self.model = model
        self.client = AsyncOpenAI(api_key=api_key)
        self.conversation_history: List[Dict[str, str]] = []
        self.system_prompt = ""

    def set_context(self, transcript: TranscriptResult, summary: Summary) -> None:
        """Set the context for the chatbot.

        Args:
            transcript: Meeting transcript
            summary: Meeting summary
        """
        # Format transcript text
        transcript_text = self._format_transcript(transcript)

        # Format summary
        summary_text = self._format_summary(summary)

        # Create system prompt with full context
        self.system_prompt = f"""You are a helpful assistant analyzing a meeting transcript. Answer questions about the meeting based on the information provided.

Meeting Summary:
{summary_text}

Full Transcript:
{transcript_text}

Answer questions accurately based on the transcript. If information is not in the transcript, say so clearly."""

        # Initialize conversation with system prompt
        self.conversation_history = [
            {"role": "system", "content": self.system_prompt}
        ]

        logger.debug("Chatbot context set with transcript and summary")

    async def chat(self, user_question: str) -> str:
        """Answer a user question about the transcript.

        Args:
            user_question: User's question

        Returns:
            Assistant's response

        Raises:
            APIError: If chat fails
        """
        try:
            # Add user question to history
            self.conversation_history.append({
                "role": "user",
                "content": user_question
            })

            # Call GPT-4o mini
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=self.conversation_history,
                temperature=0.7,
                max_tokens=500
            )

            # Extract assistant response
            assistant_message = response.choices[0].message.content

            # Add to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_message
            })

            return assistant_message

        except Exception as e:
            logger.error(f"Chat failed: {e}")
            raise APIError(f"Chat error: {e}")

    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get conversation history (excluding system prompt).

        Returns:
            List of user/assistant messages
        """
        # Skip system prompt (first message)
        return self.conversation_history[1:]

    def _format_transcript(self, transcript: TranscriptResult) -> str:
        """Format transcript for context.

        Args:
            transcript: Transcript result

        Returns:
            Formatted transcript text
        """
        lines = []
        for segment in transcript.segments:
            lines.append(f"{segment.speaker}: {segment.text}")
        return "\n".join(lines)

    def _format_summary(self, summary: Summary) -> str:
        """Format summary for context.

        Args:
            summary: Meeting summary

        Returns:
            Formatted summary text
        """
        lines = [
            f"Overview: {summary.overview}",
            "",
            "Key Points:"
        ]

        for point in summary.key_points:
            lines.append(f"- {point}")

        if summary.action_items:
            lines.append("")
            lines.append("Action Items:")
            for item in summary.action_items:
                assignee = f" ({item.assignee})" if item.assignee else ""
                deadline = f" - Due: {item.deadline}" if item.deadline else ""
                lines.append(f"- {item.description}{assignee}{deadline}")

        return "\n".join(lines)
