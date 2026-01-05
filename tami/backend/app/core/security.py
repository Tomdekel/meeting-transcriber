"""Security utilities for API key encryption and authentication."""

import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from loguru import logger

from app.core.config import settings


class EncryptionService:
    """Service for encrypting and decrypting sensitive data like API keys."""

    def __init__(self):
        """Initialize encryption service with key from settings."""
        if settings.ENCRYPTION_KEY and settings.ENCRYPTION_KEY.strip():
            # Use provided key
            key = settings.ENCRYPTION_KEY.strip().encode()
        else:
            # Generate a key from the SECRET_KEY
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"tami-meeting-transcriber",  # In production, use a random salt stored securely
                iterations=100000,
            )
            derived_key = kdf.derive(settings.SECRET_KEY.encode())
            key = base64.urlsafe_b64encode(derived_key)

        self.cipher = Fernet(key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string.

        Args:
            plaintext: The string to encrypt

        Returns:
            Encrypted string (base64 encoded)
        """
        if not plaintext:
            return ""

        try:
            encrypted = self.cipher.encrypt(plaintext.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a string.

        Args:
            ciphertext: The encrypted string (base64 encoded)

        Returns:
            Decrypted plaintext string
        """
        if not ciphertext:
            return ""

        try:
            encrypted = base64.urlsafe_b64decode(ciphertext.encode())
            decrypted = self.cipher.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise


# Singleton instance (lazy-loaded)
_encryption_service = None


def _get_encryption_service() -> EncryptionService:
    """Get or create the encryption service singleton."""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key for storage.

    Args:
        api_key: The API key to encrypt

    Returns:
        Encrypted API key
    """
    return _get_encryption_service().encrypt(api_key)


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an API key from storage.

    Args:
        encrypted_key: The encrypted API key

    Returns:
        Decrypted API key
    """
    return _get_encryption_service().decrypt(encrypted_key)
