"""Transcription endpoints."""

import asyncio
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from loguru import logger

from app.db import db
from app.core.config import settings
from app.schemas.transcription import (
    TranscriptionRequest,
    TranscriptionStatusResponse,
    TranscriptResponse,
    SummaryResponse,
    TranscriptSegmentResponse,
    ActionItemResponse
)
from app.services.transcription import transcription_service
from app.services.summarization import summarization_service
from app.services.refinement import get_refinement_service

router = APIRouter()


async def process_transcription(
    session_id: str,
    audio_path: Path,
    context: str,
    participants: Optional[list[str]],
    provider: str,
    model: str,
    summary_model: str,
    api_key: str
):
    """Background task to process transcription.

    Args:
        session_id: Session ID
        audio_path: Path to audio file
        context: Meeting context
        participants: List of participants
        provider: Transcription provider
        model: Transcription model
        summary_model: Model for summarization
        api_key: API key
    """
    try:
        # Update session status to processing
        await db.session.update(
            where={"id": session_id},
            data={"status": "processing"}
        )

        logger.info(f"Processing transcription for session {session_id}")

        # Transcribe audio
        transcript_result = await transcription_service.transcribe_audio(
            audio_path=audio_path,
            provider=provider,
            model=model,
            api_key=api_key,
            participants=participants
        )

        # Refine transcript using GPT-4o (post-processing with context)
        refinement_service = get_refinement_service()
        transcript_result = await refinement_service.refine_transcript(
            transcript=transcript_result,
            context=context,
            api_key=api_key,
            model="gpt-4o"  # Use strongest model for refinement
        )

        logger.info(f"Transcript refined for session {session_id}")

        # Create transcript in database
        transcript_record = await db.transcript.create(
            data={
                "sessionId": session_id,
                "language": transcript_result.language,
                "duration": transcript_result.metadata.get("duration") if transcript_result.metadata else None
            }
        )

        # Create transcript segments
        for idx, segment in enumerate(transcript_result.segments):
            await db.transcriptsegment.create(
                data={
                    "transcriptId": transcript_record.id,
                    "speakerId": segment.speaker.lower().replace(" ", "_") if segment.speaker else f"speaker_{idx % 3 + 1}",
                    "speakerName": segment.speaker if segment.speaker and segment.speaker != "Unknown" else None,
                    "text": segment.text,
                    "startTime": segment.start_time,
                    "endTime": segment.end_time,
                    "order": idx
                }
            )

        logger.info(f"Transcript saved for session {session_id}")

        # Generate summary
        summary_result = await summarization_service.generate_summary(
            transcript=transcript_result,
            context=context,
            participants=participants or [],
            api_key=api_key,
            model=summary_model
        )

        # Create summary in database
        summary_record = await db.summary.create(
            data={
                "sessionId": session_id,
                "overview": summary_result.overview,
                "keyPoints": summary_result.key_points
            }
        )

        # Create action items
        for action in summary_result.action_items:
            await db.actionitem.create(
                data={
                    "summaryId": summary_record.id,
                    "description": action.description,
                    "assignee": action.assignee,
                    "deadline": action.deadline
                }
            )

        logger.info(f"Summary saved for session {session_id}")

        # Update session status to completed
        await db.session.update(
            where={"id": session_id},
            data={"status": "completed"}
        )

        logger.info(f"Transcription completed for session {session_id}")

    except Exception as e:
        logger.error(f"Transcription failed for session {session_id}: {e}")

        # Update session status to failed
        await db.session.update(
            where={"id": session_id},
            data={"status": "failed"}
        )


@router.post("/transcribe", response_model=TranscriptionStatusResponse)
async def transcribe(
    request: TranscriptionRequest,
    background_tasks: BackgroundTasks
):
    """Start transcription process.

    Args:
        request: Transcription request
        background_tasks: FastAPI background tasks

    Returns:
        Session ID and initial status
    """
    try:
        # Get upload directory and audio file
        upload_dir = settings.UPLOAD_DIR / request.uploadId

        if not upload_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )

        # Find the audio file
        audio_files = list(upload_dir.iterdir())
        if not audio_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No audio file found in upload"
            )

        audio_path = audio_files[0]

        # Create session in database
        session = await db.session.create(
            data={
                "audioFileName": audio_path.name,
                "audioFileUrl": str(audio_path),
                "context": request.context,
                "status": "pending",
                "userId": request.userId
            }
        )

        logger.info(f"Created session {session.id} for transcription")

        # Get API key (for now, we'll need to pass it in the request or get from user settings)
        # TODO: Get API key from user settings in database
        # For now, use the API key from environment variable
        api_key = settings.OPENAI_API_KEY or settings.SECRET_KEY  # Fallback to SECRET_KEY if not set

        # Start background transcription
        background_tasks.add_task(
            process_transcription,
            session_id=session.id,
            audio_path=audio_path,
            context=request.context,
            participants=request.participants,
            provider=request.transcriptionProvider,
            model=request.transcriptionModel,
            summary_model=request.summaryModel,
            api_key=api_key
        )

        return TranscriptionStatusResponse(
            sessionId=session.id,
            status=session.status
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription request failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription request failed: {str(e)}"
        )


@router.get("/transcribe/{session_id}/status", response_model=TranscriptionStatusResponse)
async def get_transcription_status(session_id: str):
    """Get transcription status.

    Args:
        session_id: Session ID

    Returns:
        Status and results if completed
    """
    try:
        # Get session
        session = await db.session.find_unique(
            where={"id": session_id},
            include={
                "transcript": {
                    "include": {
                        "segments": True
                    }
                },
                "summary": {
                    "include": {
                        "actionItems": True
                    }
                }
            }
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Build response
        response = TranscriptionStatusResponse(
            sessionId=session.id,
            status=session.status,
            audioFileName=session.audioFileName,
            audioFileUrl=f"/api/sessions/{session.id}/audio"
        )

        # Add transcript if available
        if session.transcript:
            response.transcript = TranscriptResponse(
                id=session.transcript.id,
                sessionId=session.id,
                language=session.transcript.language,
                duration=session.transcript.duration,
                segments=[
                    TranscriptSegmentResponse(
                        id=seg.id,
                        transcriptId=session.transcript.id,
                        speakerId=seg.speakerId,
                        speakerName=seg.speakerName,
                        text=seg.text,
                        startTime=seg.startTime,
                        endTime=seg.endTime,
                        order=seg.order
                    )
                    for seg in sorted(session.transcript.segments, key=lambda x: x.order)
                ]
            )

        # Add summary if available
        if session.summary:
            response.summary = SummaryResponse(
                id=session.summary.id,
                sessionId=session.id,
                overview=session.summary.overview,
                keyPoints=session.summary.keyPoints,
                actionItems=[
                    ActionItemResponse(
                        id=item.id,
                        summaryId=session.summary.id,
                        description=item.description,
                        assignee=item.assignee,
                        deadline=item.deadline,
                        completed=item.completed
                    )
                    for item in session.summary.actionItems
                ]
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get status failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Get status failed: {str(e)}"
        )
