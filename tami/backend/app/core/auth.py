"""Authentication middleware for Supabase JWT validation."""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from loguru import logger

from app.core.config import settings

# Dev mode user ID - matches frontend DEV_USER_ID
DEV_USER_ID = "dev-user-local-testing"

security = HTTPBearer(auto_error=False)  # Don't auto-error so we can handle dev mode


async def verify_supabase_token(token: str) -> dict:
    """Verify Supabase JWT token.

    Args:
        token: JWT token from Authorization header

    Returns:
        Decoded token payload with user info

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except JWTError as e:
        logger.error(f"JWT validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """FastAPI dependency to get current authenticated user.

    In development mode (DEBUG=True), returns dev user if no token provided.

    Returns:
        User info from JWT payload with id and email
    """
    # Dev mode bypass - return dev user if no credentials and DEBUG is on
    if credentials is None:
        if settings.DEBUG:
            logger.debug("Dev mode: using dev user for authentication")
            return {
                "id": DEV_USER_ID,
                "email": "dev@localhost.test",
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = await verify_supabase_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    return {
        "id": user_id,
        "email": payload.get("email"),
    }


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """FastAPI dependency to get current authenticated user's ID.

    Returns:
        User ID string
    """
    user = await get_current_user(credentials)
    return user["id"]
