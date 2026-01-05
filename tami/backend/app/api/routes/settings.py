"""User settings endpoints."""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from loguru import logger

from app.db import db
from app.core.security import encrypt_api_key, decrypt_api_key
from app.schemas.settings import (
    UserSettingsResponse,
    UserSettingsUpdate,
    TestConnectionRequest,
    TestConnectionResponse
)
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from src.transcription.whisper import WhisperTranscriber
# from src.transcription.ivrit import IvritTranscriber  # TODO: Implement

router = APIRouter()


@router.get("/settings/{user_id}", response_model=UserSettingsResponse)
async def get_settings(user_id: str):
    """Get user settings.

    Args:
        user_id: User ID

    Returns:
        User settings (API key is not included)
    """
    try:
        # Get or create user
        user = await db.user.find_unique(
            where={"id": user_id},
            include={"settings": True}
        )

        if not user:
            # Create user if doesn't exist
            user = await db.user.create(
                data={"id": user_id}
            )

        # Get or create settings
        if not user.settings:
            settings = await db.usersettings.create(
                data={"userId": user_id}
            )
        else:
            settings = user.settings

        return UserSettingsResponse(
            id=settings.id,
            userId=settings.userId,
            transcriptionProvider=settings.transcriptionProvider,
            transcriptionModel=settings.transcriptionModel,
            summaryModel=settings.summaryModel,
            chatModel=settings.chatModel
        )

    except Exception as e:
        logger.error(f"Get settings failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Get settings failed: {str(e)}"
        )


@router.put("/settings/{user_id}")
async def update_settings(user_id: str, update: UserSettingsUpdate):
    """Update user settings.

    Args:
        user_id: User ID
        update: Settings to update

    Returns:
        Success message
    """
    try:
        # Get or create user
        user = await db.user.find_unique(
            where={"id": user_id},
            include={"settings": True}
        )

        if not user:
            user = await db.user.create(
                data={"id": user_id}
            )

        # Prepare update data
        update_data = {}

        if update.transcriptionProvider is not None:
            update_data["transcriptionProvider"] = update.transcriptionProvider

        if update.transcriptionModel is not None:
            update_data["transcriptionModel"] = update.transcriptionModel

        if update.summaryModel is not None:
            update_data["summaryModel"] = update.summaryModel

        if update.chatModel is not None:
            update_data["chatModel"] = update.chatModel

        if update.openaiApiKey is not None:
            # Encrypt API key before storing
            update_data["openaiApiKey"] = encrypt_api_key(update.openaiApiKey)

        # Update or create settings
        if user.settings:
            await db.usersettings.update(
                where={"userId": user_id},
                data=update_data
            )
        else:
            await db.usersettings.create(
                data={
                    "userId": user_id,
                    **update_data
                }
            )

        logger.info(f"Updated settings for user {user_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Settings updated successfully"}
        )

    except Exception as e:
        logger.error(f"Update settings failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update settings failed: {str(e)}"
        )


@router.post("/settings/test-connection", response_model=TestConnectionResponse)
async def test_connection(request: TestConnectionRequest):
    """Test API connection with provided credentials.

    Args:
        request: Test connection request

    Returns:
        Test result
    """
    try:
        if request.provider.lower() == "whisper":
            transcriber = WhisperTranscriber(
                api_key=request.apiKey,
                model=request.model or "whisper-1"
            )
            transcriber.validate_config()
            return TestConnectionResponse(
                success=True,
                message="Whisper API connection successful"
            )

        # elif request.provider.lower() == "ivrit":
        #     transcriber = IvritTranscriber(
        #         api_key=request.apiKey,
        #         model=request.model or "ivrit-v2"
        #     )
        #     transcriber.validate_config()
        #     return TestConnectionResponse(
        #         success=True,
        #         message="Ivrit API connection successful"
        #     )

        else:
            return TestConnectionResponse(
                success=False,
                message=f"Unsupported provider: {request.provider}"
            )

    except Exception as e:
        logger.error(f"Test connection failed: {e}")
        return TestConnectionResponse(
            success=False,
            message=f"Connection test failed: {str(e)}"
        )
