"""Recording endpoints for live audio capture."""

import uuid
import subprocess
from pathlib import Path
from typing import Dict
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse
from loguru import logger
from datetime import datetime

router = APIRouter()

# In-memory store for active recording sessions
# In production, use Redis or similar
active_recordings: Dict[str, dict] = {}


@router.post("/record/start")
async def start_recording() -> JSONResponse:
    """Start a new recording session.

    Returns:
        Recording session ID and metadata
    """
    try:
        # Generate recording ID
        recording_id = str(uuid.uuid4())

        # Create recording directory
        from app.core.config import settings
        recording_dir = settings.UPLOAD_DIR / recording_id
        recording_dir.mkdir(parents=True, exist_ok=True)

        # Initialize recording session
        active_recordings[recording_id] = {
            "id": recording_id,
            "status": "recording",
            "start_time": datetime.now().isoformat(),
            "chunks_received": 0,
            "total_size": 0
        }

        logger.info(f"Started recording session: {recording_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "recordingId": recording_id,
                "status": "recording",
                "message": "Recording started"
            }
        )

    except Exception as e:
        logger.error(f"Failed to start recording: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start recording: {str(e)}"
        )


@router.post("/record/{recording_id}/chunk")
async def upload_chunk(recording_id: str, request: Request) -> JSONResponse:
    """Upload audio chunk for active recording.

    Args:
        recording_id: Recording session ID
        request: FastAPI request containing binary chunk data

    Returns:
        Chunk acknowledgment
    """
    if recording_id not in active_recordings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording session not found"
        )

    session = active_recordings[recording_id]

    if session["status"] != "recording":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recording session is not active"
        )

    try:
        # Read chunk data from request body
        chunk_data = await request.body()

        if not chunk_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty chunk data"
            )

        # Append chunk to file
        from app.core.config import settings
        recording_dir = settings.UPLOAD_DIR / recording_id
        chunk_file = recording_dir / f"chunk_{session['chunks_received']:04d}.webm"

        with open(chunk_file, 'wb') as f:
            f.write(chunk_data)

        # Update session
        session['chunks_received'] += 1
        session['total_size'] += len(chunk_data)

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "chunkNumber": session['chunks_received'],
                "totalSize": session['total_size']
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload chunk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload chunk: {str(e)}"
        )


@router.post("/record/{recording_id}/stop")
async def stop_recording(recording_id: str) -> JSONResponse:
    """Stop recording and merge chunks into single file.

    Args:
        recording_id: Recording session ID

    Returns:
        Final recording metadata and upload ID
    """
    # Check if session exists in memory
    session = active_recordings.get(recording_id)

    # Fallback: check if recording directory exists
    from app.core.config import settings
    recording_dir = settings.UPLOAD_DIR / recording_id

    if not session and not recording_dir.exists():
        logger.error(f"Recording session not found: {recording_id}")
        logger.error(f"Active recordings: {list(active_recordings.keys())}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording session not found"
        )

    # If session not in memory but directory exists, reconstruct it
    if not session and recording_dir.exists():
        logger.warning(f"Reconstructing session {recording_id} from filesystem")
        chunk_files = list(recording_dir.glob("chunk_*.webm"))
        session = {
            "id": recording_id,
            "status": "recording",
            "start_time": datetime.now().isoformat(),
            "chunks_received": len(chunk_files),
            "total_size": sum(f.stat().st_size for f in chunk_files)
        }
        active_recordings[recording_id] = session

    try:
        output_file = recording_dir / "recording.wav"

        # Get all chunk files
        chunk_files = sorted(recording_dir.glob("chunk_*.webm"))

        if not chunk_files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No audio chunks received"
            )

        # Validate chunk count
        if len(chunk_files) != session['chunks_received']:
            logger.warning(f"Chunk count mismatch: found {len(chunk_files)}, expected {session['chunks_received']}")

        # Merge chunks with ffmpeg
        # Create concat file with ABSOLUTE paths
        concat_file = recording_dir / "concat.txt"
        with open(concat_file, 'w') as f:
            for chunk in chunk_files:
                f.write(f"file '{chunk.absolute()}'\n")  # Use absolute path

        # Run ffmpeg to merge and convert to WAV
        result = subprocess.run(
            [
                'ffmpeg',
                '-y',  # Overwrite output file
                '-f', 'concat',
                '-safe', '0',
                '-i', str(concat_file),
                '-ar', '44100',  # Sample rate
                '-ac', '2',  # Stereo
                '-c:a', 'pcm_s16le',  # WAV codec
                '-loglevel', 'warning',  # More verbose logging
                str(output_file)
            ],
            capture_output=True,
            text=True,
            cwd=str(recording_dir)  # Run in chunk directory
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg failed with code {result.returncode}")
            logger.error(f"FFmpeg stderr: {result.stderr}")
            logger.error(f"FFmpeg stdout: {result.stdout}")
            logger.error(f"Concat file contents:\n{concat_file.read_text()}")
            raise Exception(f"Failed to merge audio chunks: {result.stderr}")

        # Clean up chunks
        for chunk in chunk_files:
            chunk.unlink()
        concat_file.unlink()

        # Update session
        session['status'] = 'completed'
        session['end_time'] = datetime.now().isoformat()
        session['file_path'] = str(output_file)
        session['file_size'] = output_file.stat().st_size

        logger.info(f"Recording completed: {recording_id}")

        # Calculate duration
        start_time = datetime.fromisoformat(session['start_time'])
        end_time = datetime.fromisoformat(session['end_time'])
        duration = (end_time - start_time).total_seconds()

        # Return as upload ID (compatible with existing transcription flow)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "uploadId": recording_id,
                "fileName": output_file.name,
                "fileSize": session['file_size'],
                "filePath": str(output_file),
                "duration": duration
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop recording: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop recording: {str(e)}"
        )
    finally:
        # Clean up session
        if recording_id in active_recordings:
            del active_recordings[recording_id]


@router.delete("/record/{recording_id}")
async def cancel_recording(recording_id: str) -> JSONResponse:
    """Cancel an active recording.

    Args:
        recording_id: Recording session ID

    Returns:
        Success message
    """
    if recording_id not in active_recordings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording session not found"
        )

    try:
        from app.core.config import settings
        # Clean up files
        recording_dir = settings.UPLOAD_DIR / recording_id
        if recording_dir.exists():
            for file in recording_dir.iterdir():
                file.unlink()
            recording_dir.rmdir()

        # Remove session
        del active_recordings[recording_id]

        logger.info(f"Recording cancelled: {recording_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Recording cancelled"}
        )

    except Exception as e:
        logger.error(f"Failed to cancel recording: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel recording: {str(e)}"
        )


@router.get("/record/{recording_id}/status")
async def get_recording_status(recording_id: str) -> JSONResponse:
    """Get recording session status.

    Args:
        recording_id: Recording session ID

    Returns:
        Recording status and metadata
    """
    if recording_id not in active_recordings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording session not found"
        )

    session = active_recordings[recording_id]

    # Calculate duration
    start_time = datetime.fromisoformat(session['start_time'])
    if session['status'] == 'recording':
        duration = (datetime.now() - start_time).total_seconds()
    else:
        end_time = datetime.fromisoformat(session['end_time'])
        duration = (end_time - start_time).total_seconds()

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "recordingId": recording_id,
            "status": session['status'],
            "duration": duration,
            "chunksReceived": session['chunks_received'],
            "totalSize": session['total_size']
        }
    )
