"""Supabase Storage service for audio files."""

import httpx
from pathlib import Path
from loguru import logger

from app.core.config import settings


class SupabaseStorage:
    """Service for uploading/downloading files from Supabase Storage."""

    BUCKET_NAME = "meeting-audio-files"

    def __init__(self):
        self.base_url = f"{settings.SUPABASE_URL}/storage/v1"
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY

    async def upload_file(
        self,
        file_path: Path,
        storage_path: str,
        content_type: str = "audio/mpeg"
    ) -> str:
        """Upload file to Supabase Storage.

        Args:
            file_path: Local file path to upload
            storage_path: Path in storage bucket (e.g., "user_id/session_id/file.mp3")
            content_type: MIME type of the file

        Returns:
            Storage path (to be stored in database)

        Raises:
            httpx.HTTPStatusError: If upload fails
        """
        async with httpx.AsyncClient() as client:
            with open(file_path, "rb") as f:
                response = await client.post(
                    f"{self.base_url}/object/{self.BUCKET_NAME}/{storage_path}",
                    headers={
                        "Authorization": f"Bearer {self.service_key}",
                        "Content-Type": content_type
                    },
                    content=f.read(),
                    timeout=60.0
                )
                response.raise_for_status()

        logger.info(f"Uploaded file to Supabase Storage: {storage_path}")
        return storage_path

    async def get_signed_url(self, storage_path: str, expires_in: int = 3600) -> str:
        """Get signed URL for private file access.

        Args:
            storage_path: Path in storage bucket
            expires_in: Expiry time in seconds (default: 1 hour)

        Returns:
            Signed URL for accessing the file

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/object/sign/{self.BUCKET_NAME}/{storage_path}",
                headers={"Authorization": f"Bearer {self.service_key}"},
                json={"expiresIn": expires_in}
            )
            response.raise_for_status()
            data = response.json()

            signed_url = f"{settings.SUPABASE_URL}/storage/v1{data['signedURL']}"
            logger.debug(f"Generated signed URL for {storage_path}")
            return signed_url

    async def delete_file(self, storage_path: str):
        """Delete file from Supabase Storage.

        Args:
            storage_path: Path in storage bucket

        Raises:
            httpx.HTTPStatusError: If deletion fails
        """
        async with httpx.AsyncClient() as client:
            await client.delete(
                f"{self.base_url}/object/{self.BUCKET_NAME}/{storage_path}",
                headers={"Authorization": f"Bearer {self.service_key}"}
            )

        logger.info(f"Deleted file from Supabase Storage: {storage_path}")


# Global storage service instance
storage_service = SupabaseStorage()
