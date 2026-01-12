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
from app.services.entity_extraction import get_entity_extraction_service
from app.services.billing import billing_service

router = APIRouter()


async def process_transcription(
    session_id: str,
    audio_path: Path,
    context: str,
    participants: Optional[list[str]],
    provider: str,
    model: str,
    summary_model: str,
    api_key: str,
    auto_detect_language: bool = True
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
        auto_detect_language: Enable automatic language detection and routing
    """
    detected_language = None

    try:
        # Update session status to processing
        await db.session.update(
            where={"id": session_id},
            data={"status": "processing"}
        )

        logger.info(f"Processing transcription for session {session_id}")

        # Determine file type (audio or text import)
        file_ext = audio_path.suffix.lower()
        is_text_import = file_ext == ".txt"

        if is_text_import:
            # Text import: parse transcript file directly
            logger.info(f"Processing text import for session {session_id}")
            from app.services.transcript_parser import transcript_parser

            transcript_result = transcript_parser.parse_text_file(audio_path)
            detected_language = "he"  # Default to Hebrew for text imports

            # Update session with detected language
            await db.session.update(
                where={"id": session_id},
                data={"detectedLanguage": detected_language}
            )

            # Set OpenAI key for summarization (used later in the function)
            openai_key = settings.OPENAI_API_KEY or api_key

            logger.info(f"Text import complete. {len(transcript_result.segments)} segments parsed")

        # Check if we should use automatic language detection and routing
        elif auto_detect_language and provider == "auto":
            logger.info("Using automatic language detection and ASR routing")

            # Use auto-routing: detect language and route to appropriate provider
            openai_key = settings.OPENAI_API_KEY or api_key
            ivrit_key = settings.IVRIT_API_KEY
            ivrit_endpoint = settings.IVRIT_ENDPOINT_ID

            transcript_result, detected_language = await transcription_service.transcribe_with_auto_routing(
                audio_path=audio_path,
                openai_api_key=openai_key,
                ivrit_api_key=ivrit_key,
                ivrit_endpoint_id=ivrit_endpoint,
                participants=participants
            )

            # Update session with detected language
            await db.session.update(
                where={"id": session_id},
                data={"detectedLanguage": detected_language}
            )

            logger.info(f"Auto-routing complete. Detected language: {detected_language}")

        else:
            # Use explicitly specified provider
            logger.info(f"Using explicit provider: {provider}")

            # Get endpoint_id from settings if using Ivrit provider
            endpoint_id = settings.IVRIT_ENDPOINT_ID if provider.lower() == "ivrit" else None

            transcript_result = await transcription_service.transcribe_audio(
                audio_path=audio_path,
                provider=provider,
                model=model,
                api_key=api_key,
                participants=participants,
                endpoint_id=endpoint_id
            )

            detected_language = transcript_result.language

        # Refine transcript using GPT-4o (post-processing with context)
        # Only run if enabled - this feature is experimental and can corrupt output
        if settings.ENABLE_TRANSCRIPT_REFINEMENT:
            openai_key = settings.OPENAI_API_KEY
            if openai_key:
                refinement_service = get_refinement_service()
                transcript_result = await refinement_service.refine_transcript(
                    transcript=transcript_result,
                    context=context,
                    api_key=openai_key,
                    model="gpt-4o"
                )
                logger.info(f"Transcript refined for session {session_id}")
            else:
                logger.warning("Refinement enabled but no OpenAI API key - skipping")
        else:
            logger.info("Transcript refinement disabled, using original transcript")

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
                    "speakerId": segment.speaker.lower().replace(" ", "_") if segment.speaker else f"speaker_{(idx % 10) + 1}",
                    "speakerName": segment.speaker if segment.speaker and segment.speaker != "Unknown" else None,
                    "text": segment.text,
                    "startTime": segment.start_time,
                    "endTime": segment.end_time,
                    "order": idx
                }
            )

        logger.info(f"Transcript saved for session {session_id}")

        # Generate summary
        # Always use OpenAI API key for summarization, regardless of transcription provider
        summary_result = await summarization_service.generate_summary(
            transcript=transcript_result,
            context=context,
            participants=participants or [],
            api_key=openai_key,
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

        # Extract entities from transcript
        try:
            # Get user ID from session
            session_data = await db.session.find_unique(where={"id": session_id})
            user_id = session_data.userId if session_data else None

            if user_id:
                # Build full transcript text
                transcript_text = " ".join([seg.text for seg in transcript_result.segments])

                # Extract entities
                entity_service = get_entity_extraction_service(openai_key)
                extracted_entities = await entity_service.extract_and_deduplicate(
                    transcript_text=transcript_text,
                    context=context
                )

                # Save entities and create mentions
                for entity_type, entities in extracted_entities.items():
                    for entity in entities:
                        # Upsert entity (create or update mention count)
                        existing = await db.entity.find_first(
                            where={
                                "userId": user_id,
                                "type": entity_type,
                                "normalizedValue": entity.normalized_form
                            }
                        )

                        if existing:
                            # Update existing entity
                            entity_record = await db.entity.update(
                                where={"id": existing.id},
                                data={"mentionCount": existing.mentionCount + 1}
                            )
                        else:
                            # Create new entity
                            entity_record = await db.entity.create(
                                data={
                                    "userId": user_id,
                                    "type": entity_type,
                                    "value": entity.entity,
                                    "normalizedValue": entity.normalized_form
                                }
                            )

                        # Create mention
                        await db.entitymention.create(
                            data={
                                "entityId": entity_record.id,
                                "sessionId": session_id,
                                "context": entity.context
                            }
                        )

                        # Create auto-tags for person, organization, project entities
                        if entity_type in ["person", "organization", "project"]:
                            tag_source = f"auto:{entity_type}"
                            tag_name = entity.entity[:50]  # Limit tag name length

                            # Upsert auto-tag
                            existing_tag = await db.tag.find_first(
                                where={"userId": user_id, "name": tag_name}
                            )

                            if not existing_tag:
                                new_tag = await db.tag.create(
                                    data={
                                        "userId": user_id,
                                        "name": tag_name,
                                        "source": tag_source,
                                        "isVisible": False,  # Auto-tags are hidden by default
                                        "color": "#9CA3AF"  # Gray for auto-tags
                                    }
                                )
                                tag_id = new_tag.id
                            else:
                                tag_id = existing_tag.id

                            # Link tag to session (if not already linked)
                            existing_session_tag = await db.sessiontag.find_first(
                                where={"sessionId": session_id, "tagId": tag_id}
                            )
                            if not existing_session_tag:
                                await db.sessiontag.create(
                                    data={
                                        "sessionId": session_id,
                                        "tagId": tag_id
                                    }
                                )

                logger.info(f"Entities extracted and saved for session {session_id}")

        except Exception as entity_error:
            # Entity extraction failure shouldn't fail the whole transcription
            logger.error(f"Entity extraction failed for session {session_id}: {entity_error}")

        # Update session status to completed
        await db.session.update(
            where={"id": session_id},
            data={"status": "completed"}
        )

        # Record usage for billing
        try:
            session_data = await db.session.find_unique(where={"id": session_id})
            if session_data:
                duration_minutes = (transcript_result.metadata.get("duration", 0) / 60.0) if transcript_result.metadata else 0.0
                if duration_minutes > 0:
                    await billing_service.record_usage(
                        user_id=session_data.userId,
                        session_id=session_id,
                        duration_minutes=duration_minutes
                    )
                    logger.info(f"Recorded {duration_minutes:.2f} minutes of usage for session {session_id}")
        except Exception as billing_error:
            # Billing failure shouldn't fail the transcription
            logger.error(f"Failed to record usage for session {session_id}: {billing_error}")

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
        # NOTE: Usage limits disabled for early users - everything is free for now
        # When ready to enable billing, uncomment the following:
        # can_proceed, error_message = await billing_service.check_usage_limits(request.userId)
        # if not can_proceed:
        #     raise HTTPException(
        #         status_code=status.HTTP_402_PAYMENT_REQUIRED,
        #         detail=error_message
        #     )

        # Debug: log the userId being used
        logger.info(f"Transcription request - userId: {request.userId}, uploadId: {request.uploadId}")

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

        # Get API key based on provider
        # TODO: Get API key from user settings in database
        # For now, use the API key from environment variable based on provider
        if request.transcriptionProvider.lower() == "ivrit":
            api_key = settings.IVRIT_API_KEY or settings.SECRET_KEY
        else:
            api_key = settings.OPENAI_API_KEY or settings.SECRET_KEY

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
            api_key=api_key,
            auto_detect_language=request.autoDetectLanguage
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
            audioFileUrl=f"/api/sessions/{session.id}/audio",
            detectedLanguage=getattr(session, 'detectedLanguage', None)
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
