"""Pydantic schemas for transcription."""

from typing import Optional, List
from pydantic import BaseModel


class TranscriptSegmentBase(BaseModel):
    """Base transcript segment schema."""
    speakerId: str
    speakerName: Optional[str] = None
    text: str
    startTime: float
    endTime: float
    order: int


class TranscriptSegmentResponse(TranscriptSegmentBase):
    """Schema for transcript segment response."""
    id: str
    transcriptId: str

    class Config:
        from_attributes = True


class TranscriptBase(BaseModel):
    """Base transcript schema."""
    language: str
    duration: Optional[float] = None


class TranscriptResponse(TranscriptBase):
    """Schema for transcript response."""
    id: str
    sessionId: str
    segments: List[TranscriptSegmentResponse]

    class Config:
        from_attributes = True


class ActionItemBase(BaseModel):
    """Base action item schema."""
    description: str
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    completed: bool = False


class ActionItemResponse(ActionItemBase):
    """Schema for action item response."""
    id: str
    summaryId: str

    class Config:
        from_attributes = True


class ActionItemUpdate(BaseModel):
    """Schema for updating action item."""
    completed: Optional[bool] = None
    assignee: Optional[str] = None
    deadline: Optional[str] = None


class ActionItemCreate(BaseModel):
    """Schema for creating action item."""
    description: str
    assignee: Optional[str] = None
    deadline: Optional[str] = None


class SummaryUpdate(BaseModel):
    """Schema for updating summary."""
    overview: Optional[str] = None
    keyPoints: Optional[List[str]] = None


class SummaryBase(BaseModel):
    """Base summary schema."""
    overview: str
    keyPoints: List[str]


class SummaryResponse(SummaryBase):
    """Schema for summary response."""
    id: str
    sessionId: str
    actionItems: List[ActionItemResponse]

    class Config:
        from_attributes = True


class TranscriptionRequest(BaseModel):
    """Schema for transcription request."""
    uploadId: str
    context: str
    participants: Optional[List[str]] = None
    transcriptionProvider: str = "whisper"
    transcriptionModel: str = "whisper-1"
    summaryModel: str = "gpt-4o-mini"
    userId: Optional[str] = None


class TranscriptionStatusResponse(BaseModel):
    """Schema for transcription status response."""
    sessionId: str
    status: str
    audioFileName: Optional[str] = None
    audioFileUrl: Optional[str] = None
    transcript: Optional[TranscriptResponse] = None
    summary: Optional[SummaryResponse] = None
    error: Optional[str] = None
