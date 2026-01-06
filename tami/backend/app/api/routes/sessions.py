"""Session management endpoints."""

from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, status, Query, Depends
from fastapi.responses import JSONResponse, FileResponse
from loguru import logger

from app.db import db
from app.core.auth import get_current_user
from app.schemas.session import (
    SessionResponse,
    SessionListResponse,
    SessionUpdate,
    SpeakerUpdate
)
from app.schemas.transcription import (
    ActionItemUpdate,
    ActionItemCreate,
    SummaryUpdate
)

router = APIRouter()


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """List all sessions for the authenticated user.

    Args:
        current_user: Authenticated user from JWT token
        page: Page number
        page_size: Items per page

    Returns:
        List of sessions with pagination
    """
    try:
        # Build where clause - only show user's own sessions
        where = {"userId": current_user["id"]}

        # Get total count
        total = await db.session.count(where=where)

        # Get sessions
        sessions = await db.session.find_many(
            where=where,
            skip=(page - 1) * page_size,
            take=page_size,
            order={"createdAt": "desc"}
        )

        return SessionListResponse(
            sessions=[
                SessionResponse(
                    id=s.id,
                    title=s.title,
                    userId=s.userId,
                    audioFileName=s.audioFileName,
                    audioFileUrl=s.audioFileUrl,
                    context=s.context,
                    language=s.language,
                    status=s.status,
                    createdAt=s.createdAt,
                    updatedAt=s.updatedAt
                )
                for s in sessions
            ],
            total=total,
            page=page,
            pageSize=page_size
        )

    except Exception as e:
        logger.error(f"List sessions failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"List sessions failed: {str(e)}"
        )


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get session by ID for authenticated user.

    Args:
        session_id: Session ID
        current_user: Authenticated user from JWT token

    Returns:
        Session details
    """
    try:
        session = await db.session.find_unique(
            where={"id": session_id}
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Authorization check: ensure user owns this session
        if session.userId != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        return SessionResponse(
            id=session.id,
            title=session.title,
            userId=session.userId,
            audioFileName=session.audioFileName,
            audioFileUrl=session.audioFileUrl,
            context=session.context,
            language=session.language,
            status=session.status,
            createdAt=session.createdAt,
            updatedAt=session.updatedAt
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Get session failed: {str(e)}"
        )


@router.patch("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    update_data: SessionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update session metadata (title, context, language, status).

    Args:
        session_id: Session ID
        update_data: Fields to update
        current_user: Authenticated user from JWT token

    Returns:
        Updated session
    """
    try:
        # Verify session exists
        session = await db.session.find_unique(
            where={"id": session_id}
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Authorization check: ensure user owns this session
        if session.userId != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Build update dict from non-None fields
        updates = {}
        if update_data.title is not None:
            updates["title"] = update_data.title
        if update_data.context is not None:
            updates["context"] = update_data.context
        if update_data.language is not None:
            updates["language"] = update_data.language
        if update_data.status is not None:
            updates["status"] = update_data.status

        # Update session
        updated_session = await db.session.update(
            where={"id": session_id},
            data=updates
        )

        logger.info(f"Session {session_id} updated")

        return SessionResponse(
            id=updated_session.id,
            title=updated_session.title,
            userId=updated_session.userId,
            audioFileName=updated_session.audioFileName,
            audioFileUrl=updated_session.audioFileUrl,
            context=updated_session.context,
            language=updated_session.language,
            status=updated_session.status,
            createdAt=updated_session.createdAt,
            updatedAt=updated_session.updatedAt
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update session failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update failed: {str(e)}"
        )


@router.patch("/sessions/{session_id}/speakers")
async def update_speakers(session_id: str, speaker_update: SpeakerUpdate):
    """Update speaker names.

    Args:
        session_id: Session ID
        speaker_update: Speaker name mappings

    Returns:
        Success message
    """
    try:
        # Verify session exists
        session = await db.session.find_unique(
            where={"id": session_id},
            include={"transcript": True}
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if not session.transcript:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session has no transcript yet"
            )

        # Update speaker names in transcript segments
        for speaker_id, speaker_name in speaker_update.speakers.items():
            await db.transcriptsegment.update_many(
                where={
                    "transcriptId": session.transcript.id,
                    "speakerId": speaker_id
                },
                data={
                    "speakerName": speaker_name
                }
            )

        logger.info(f"Updated speakers for session {session_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Speakers updated successfully"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update speakers failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update speakers failed: {str(e)}"
        )


@router.patch("/sessions/{session_id}/summary")
async def update_summary(session_id: str, update: SummaryUpdate):
    """Update summary overview and key points.

    Args:
        session_id: Session ID
        update: Summary updates

    Returns:
        Success message
    """
    try:
        # Get session with summary
        session = await db.session.find_unique(
            where={"id": session_id},
            include={"summary": True}
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if not session.summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session has no summary yet"
            )

        # Build update data
        update_data = {}
        if update.overview is not None:
            update_data["overview"] = update.overview
        if update.keyPoints is not None:
            update_data["keyPoints"] = update.keyPoints

        # Update summary
        await db.summary.update(
            where={"id": session.summary.id},
            data=update_data
        )

        logger.info(f"Updated summary for session {session_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Summary updated successfully"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update summary failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update summary failed: {str(e)}"
        )


@router.post("/sessions/{session_id}/action-items")
async def create_action_item(session_id: str, action_item: ActionItemCreate):
    """Create a new action item.

    Args:
        session_id: Session ID
        action_item: Action item data

    Returns:
        Created action item
    """
    try:
        # Get session with summary
        session = await db.session.find_unique(
            where={"id": session_id},
            include={"summary": True}
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if not session.summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session has no summary yet"
            )

        # Create action item
        new_action_item = await db.actionitem.create(
            data={
                "summaryId": session.summary.id,
                "description": action_item.description,
                "assignee": action_item.assignee,
                "deadline": action_item.deadline
            }
        )

        logger.info(f"Created action item for session {session_id}")

        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": "Action item created successfully",
                "id": new_action_item.id
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create action item failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Create action item failed: {str(e)}"
        )


@router.patch("/sessions/{session_id}/action-items/{action_item_id}")
async def update_action_item(
    session_id: str,
    action_item_id: str,
    update: ActionItemUpdate
):
    """Update an action item.

    Args:
        session_id: Session ID
        action_item_id: Action item ID
        update: Action item updates

    Returns:
        Success message
    """
    try:
        # Verify action item belongs to session
        action_item = await db.actionitem.find_unique(
            where={"id": action_item_id},
            include={"summary": {"include": {"session": True}}}
        )

        if not action_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action item not found"
            )

        if action_item.summary.session.id != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Action item does not belong to this session"
            )

        # Update action item
        update_data = {}
        if update.completed is not None:
            update_data["completed"] = update.completed
        if update.assignee is not None:
            update_data["assignee"] = update.assignee
        if update.deadline is not None:
            update_data["deadline"] = update.deadline

        await db.actionitem.update(
            where={"id": action_item_id},
            data=update_data
        )

        logger.info(f"Updated action item {action_item_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Action item updated successfully"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update action item failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update action item failed: {str(e)}"
        )


@router.delete("/sessions/{session_id}/action-items/{action_item_id}")
async def delete_action_item(session_id: str, action_item_id: str):
    """Delete an action item.

    Args:
        session_id: Session ID
        action_item_id: Action item ID

    Returns:
        Success message
    """
    try:
        # Verify action item belongs to session
        action_item = await db.actionitem.find_unique(
            where={"id": action_item_id},
            include={"summary": {"include": {"session": True}}}
        )

        if not action_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action item not found"
            )

        if action_item.summary.session.id != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Action item does not belong to this session"
            )

        # Delete action item
        await db.actionitem.delete(
            where={"id": action_item_id}
        )

        logger.info(f"Deleted action item {action_item_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Action item deleted successfully"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete action item failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete action item failed: {str(e)}"
        )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a session.

    Args:
        session_id: Session ID
        current_user: Authenticated user from JWT token

    Returns:
        Success message
    """
    try:
        # Verify session exists
        session = await db.session.find_unique(
            where={"id": session_id}
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Authorization check: ensure user owns this session
        if session.userId != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Delete session (cascades to transcript, summary, chat messages)
        await db.session.delete(
            where={"id": session_id}
        )

        logger.info(f"Deleted session {session_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Session deleted successfully"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete session failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete session failed: {str(e)}"
        )


@router.get("/sessions/{session_id}/audio")
async def get_session_audio(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Stream audio file for a session.

    Args:
        session_id: Session ID
        current_user: Authenticated user from JWT token

    Returns:
        Audio file stream
    """
    try:
        # Get session from database
        session = await db.session.find_unique(where={"id": session_id})

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Authorization check: ensure user owns this session
        if session.userId != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Get audio file path
        audio_path = Path(session.audioFileUrl)

        if not audio_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio file not found"
            )

        # Determine media type
        media_type = "audio/wav"
        if audio_path.suffix == ".m4a":
            media_type = "audio/mp4"
        elif audio_path.suffix == ".mp3":
            media_type = "audio/mpeg"
        elif audio_path.suffix == ".webm":
            media_type = "audio/webm"

        # Return file as streaming response
        return FileResponse(
            path=str(audio_path),
            media_type=media_type,
            filename=session.audioFileName
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get audio: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audio: {str(e)}"
        )
