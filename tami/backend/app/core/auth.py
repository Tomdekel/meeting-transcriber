"""Authentication middleware for Supabase JWT validation."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from loguru import logger

from app.core.config import settings

security = HTTPBearer()


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
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """FastAPI dependency to get current authenticated user.

    Returns:
        User info from JWT payload with id and email
    """
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
