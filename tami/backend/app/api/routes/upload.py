"""File upload endpoint."""

import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from loguru import logger
import aiofiles

from app.core.config import settings
from app.core.auth import get_current_user

router = APIRouter()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...)
    # TODO: Re-enable authentication when auth system is ready
    # current_user: dict = Depends(get_current_user)
) -> JSONResponse:
    """Upload an audio file.

    Args:
        file: The audio file to upload

    Returns:
        Upload ID and file metadata

    Raises:
        HTTPException: If file validation fails or upload fails
    """
    try:
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # Generate unique upload ID
        upload_id = str(uuid.uuid4())

        # Create upload directory if it doesn't exist
        upload_dir = settings.UPLOAD_DIR / upload_id
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Save file
        file_path = upload_dir / file.filename
        logger.info(f"Uploading file: {file.filename} -> {file_path}")

        # Read and save file in chunks
        async with aiofiles.open(file_path, 'wb') as f:
            total_size = 0
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                total_size += len(chunk)

                # Check file size limit
                if total_size > settings.MAX_UPLOAD_SIZE:
                    # Clean up
                    await file.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
                    )

                await f.write(chunk)

        logger.info(f"File uploaded successfully: {upload_id} ({total_size / 1024 / 1024:.2f}MB)")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "uploadId": upload_id,
                "fileName": file.filename,
                "fileSize": total_size,
                "filePath": str(file_path)
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )


@router.delete("/upload/{upload_id}")
async def delete_upload(upload_id: str) -> JSONResponse:
    """Delete an uploaded file.

    Args:
        upload_id: The upload ID

    Returns:
        Success message
    """
    try:
        upload_dir = settings.UPLOAD_DIR / upload_id

        if not upload_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )

        # Delete all files in the upload directory
        for file_path in upload_dir.iterdir():
            file_path.unlink()

        # Delete the directory
        upload_dir.rmdir()

        logger.info(f"Upload deleted: {upload_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Upload deleted successfully"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )
