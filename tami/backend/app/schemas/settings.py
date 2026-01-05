"""Pydantic schemas for user settings."""

from typing import Optional
from pydantic import BaseModel


class UserSettingsBase(BaseModel):
    """Base user settings schema."""
    transcriptionProvider: str = "whisper"
    transcriptionModel: str = "whisper-1"
    summaryModel: str = "gpt-4o-mini"
    chatModel: str = "gpt-4o-mini"


class UserSettingsCreate(UserSettingsBase):
    """Schema for creating user settings."""
    userId: str
    openaiApiKey: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings."""
    openaiApiKey: Optional[str] = None
    transcriptionProvider: Optional[str] = None
    transcriptionModel: Optional[str] = None
    summaryModel: Optional[str] = None
    chatModel: Optional[str] = None


class UserSettingsResponse(UserSettingsBase):
    """Schema for user settings response."""
    id: str
    userId: str
    # Note: API key is never sent to frontend

    class Config:
        from_attributes = True


class TestConnectionRequest(BaseModel):
    """Schema for testing API connection."""
    provider: str
    apiKey: str
    model: Optional[str] = None


class TestConnectionResponse(BaseModel):
    """Schema for test connection response."""
    success: bool
    message: str
