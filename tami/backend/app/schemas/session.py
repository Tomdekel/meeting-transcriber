"""Pydantic schemas for sessions."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class SessionBase(BaseModel):
    """Base session schema."""
    audioFileName: str
    context: str
    language: str = "he"


class SessionCreate(SessionBase):
    """Schema for creating a session."""
    audioFileUrl: str
    userId: Optional[str] = None


class SessionUpdate(BaseModel):
    """Schema for updating a session."""
    status: Optional[str] = None
    language: Optional[str] = None


class SpeakerUpdate(BaseModel):
    """Schema for updating speaker names."""
    speakers: dict[str, str]  # {"speaker_1": "אורי", "speaker_2": "תום"}


class SessionResponse(SessionBase):
    """Schema for session response."""
    id: str
    userId: Optional[str]
    audioFileUrl: str
    status: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    """Schema for list of sessions."""
    sessions: List[SessionResponse]
    total: int
    page: int
    pageSize: int
