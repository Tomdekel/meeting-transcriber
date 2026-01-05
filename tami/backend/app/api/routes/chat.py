"""Chat endpoints for Q&A about meetings."""

from typing import List
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from loguru import logger

from app.db import db
from app.core.config import settings
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatHistoryResponse,
    ChatStreamResponse
)
from app.services.chat import chat_service
from src.utils.models import TranscriptResult, TranscriptSegment, Summary as SummaryModel, ActionItem

router = APIRouter()


@router.post("/chat")
async def chat(message_request: ChatMessageCreate):
    """Send a chat message about a meeting session.

    Args:
        message_request: Chat message request

    Returns:
        Assistant's response
    """
    try:
        # Get session with transcript and summary
        session = await db.session.find_unique(
            where={"id": message_request.sessionId},
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
                },
                "chatMessages": {
                    "order_by": {
                        "createdAt": "asc"
                    }
                }
            }
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if not session.transcript or not session.summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session transcription not complete"
            )

        # Convert database models to service models
        transcript = TranscriptResult(
            segments=[
                TranscriptSegment(
                    speaker=seg.speakerName or seg.speakerId,
                    text=seg.text,
                    start_time=seg.startTime,
                    end_time=seg.endTime
                )
                for seg in sorted(session.transcript.segments, key=lambda x: x.order)
            ],
            language=session.transcript.language,
            metadata={}
        )

        # Extract unique participants from transcript
        participants = list(set([
            seg.speakerName or seg.speakerId
            for seg in session.transcript.segments
        ]))

        summary = SummaryModel(
            overview=session.summary.overview,
            key_points=session.summary.keyPoints,
            action_items=[
                ActionItem(
                    description=item.description,
                    assignee=item.assignee,
                    deadline=item.deadline
                )
                for item in session.summary.actionItems
            ],
            participants=participants
        )

        # Get conversation history
        conversation_history = [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in session.chatMessages
        ]

        # TODO: Get API key from user settings (for now use environment variable)
        api_key = settings.OPENAI_API_KEY or settings.SECRET_KEY

        # Get chat response
        response = await chat_service.chat(
            user_question=message_request.message,
            transcript=transcript,
            summary=summary,
            context=session.context,
            participants=participants,
            api_key=api_key,
            model=settings.DEFAULT_CHAT_MODEL,
            conversation_history=conversation_history
        )

        # Save user message
        await db.chatmessage.create(
            data={
                "sessionId": session.id,
                "role": "user",
                "content": message_request.message
            }
        )

        # Save assistant response
        assistant_message = await db.chatmessage.create(
            data={
                "sessionId": session.id,
                "role": "assistant",
                "content": response
            }
        )

        logger.info(f"Chat message processed for session {session.id}")

        return ChatMessageResponse(
            id=assistant_message.id,
            sessionId=session.id,
            role="assistant",
            content=response,
            createdAt=assistant_message.createdAt
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}"
        )


@router.get("/sessions/{session_id}/chat", response_model=ChatHistoryResponse)
async def get_chat_history(session_id: str):
    """Get chat history for a session.

    Args:
        session_id: Session ID

    Returns:
        Chat message history
    """
    try:
        # Get session
        session = await db.session.find_unique(
            where={"id": session_id},
            include={
                "chatMessages": {
                    "order_by": {
                        "createdAt": "asc"
                    }
                }
            }
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        return ChatHistoryResponse(
            sessionId=session.id,
            messages=[
                ChatMessageResponse(
                    id=msg.id,
                    sessionId=session.id,
                    role=msg.role,
                    content=msg.content,
                    createdAt=msg.createdAt
                )
                for msg in session.chatMessages
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get chat history failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Get chat history failed: {str(e)}"
        )


@router.delete("/sessions/{session_id}/chat")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session.

    Args:
        session_id: Session ID

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

        # Delete all chat messages
        await db.chatmessage.delete_many(
            where={"sessionId": session_id}
        )

        logger.info(f"Cleared chat history for session {session_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Chat history cleared"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear chat history failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clear chat history failed: {str(e)}"
        )
