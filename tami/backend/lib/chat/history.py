"""Chat history management."""

from datetime import datetime
from typing import List

from lib.utils.models import ChatHistory, ChatMessage


class ChatHistoryManager:
    """Manage chat history for a meeting transcript."""

    def __init__(self, transcript_context: str = ""):
        """Initialize chat history manager.

        Args:
            transcript_context: Context about the transcript
        """
        self.history = ChatHistory(transcript_context=transcript_context)

    def add_user_message(self, content: str) -> None:
        """Add a user message to history.

        Args:
            content: User message content
        """
        self.history.add_message("user", content)

    def add_assistant_message(self, content: str) -> None:
        """Add an assistant message to history.

        Args:
            content: Assistant message content
        """
        self.history.add_message("assistant", content)

    def get_messages(self) -> List[ChatMessage]:
        """Get all messages.

        Returns:
            List of ChatMessage objects
        """
        return self.history.messages

    def to_api_format(self) -> List[dict]:
        """Convert history to API format.

        Returns:
            List of message dicts for API calls
        """
        return self.history.to_dict_list()

    def format_for_output(self) -> str:
        """Format chat history for output files.

        Returns:
            Formatted chat history as markdown
        """
        if not self.history.messages:
            return ""

        lines = ["## Chat History\n"]

        for msg in self.history.messages:
            if msg.role == "user":
                lines.append(f"**Q:** {msg.content}\n")
            else:
                lines.append(f"**A:** {msg.content}\n")

        return "\n".join(lines)

    def has_messages(self) -> bool:
        """Check if there are any messages.

        Returns:
            True if there are messages
        """
        return len(self.history.messages) > 0
