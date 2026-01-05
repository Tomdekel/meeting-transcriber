"""Pydantic schemas for chat."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ChatMessageBase(BaseModel):
    """Base chat message schema."""
    role: str  # "user" or "assistant"
    content: str


class ChatMessageCreate(BaseModel):
    """Schema for creating a chat message."""
    sessionId: str
    message: str


class ChatMessageResponse(ChatMessageBase):
    """Schema for chat message response."""
    id: str
    sessionId: str
    createdAt: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """Schema for chat history response."""
    messages: List[ChatMessageResponse]
    sessionId: str


class ChatStreamResponse(BaseModel):
    """Schema for streaming chat response."""
    role: str
    content: str
    done: bool
