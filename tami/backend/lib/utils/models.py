"""Data models for the meeting transcriber."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class TranscriptSegment:
    """A single segment of transcribed audio."""
    speaker: str
    text: str
    start_time: float
    end_time: float


@dataclass
class TranscriptResult:
    """Complete transcription result."""
    segments: List[TranscriptSegment]
    language: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ActionItem:
    """An action item extracted from the meeting."""
    description: str
    assignee: Optional[str] = None
    deadline: Optional[str] = None


@dataclass
class Summary:
    """Meeting summary with key points and action items."""
    overview: str
    key_points: List[str]
    action_items: List[ActionItem]
    participants: List[str]


@dataclass
class ChatMessage:
    """A single message in the chat history."""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class ChatHistory:
    """Chat history for a meeting transcript."""
    messages: List[ChatMessage] = field(default_factory=list)
    transcript_context: str = ""

    def add_message(self, role: str, content: str) -> None:
        """Add a message to the chat history."""
        self.messages.append(ChatMessage(role=role, content=content))

    def to_dict_list(self) -> List[Dict[str, str]]:
        """Convert to list of dicts for API calls."""
        return [{"role": msg.role, "content": msg.content} for msg in self.messages]
