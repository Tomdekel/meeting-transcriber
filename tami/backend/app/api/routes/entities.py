"""Entity management endpoints."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from loguru import logger

from app.db import db
from app.core.auth import get_current_user_id


router = APIRouter()


# Schemas
class EntityResponse(BaseModel):
    """Response schema for an entity."""
    id: str
    userId: str
    type: str
    value: str
    normalizedValue: Optional[str]
    firstSeenAt: str
    lastSeenAt: str
    mentionCount: int

    class Config:
        from_attributes = True


class EntityMentionResponse(BaseModel):
    """Response schema for an entity mention."""
    id: str
    entityId: str
    sessionId: str
    context: Optional[str]
    createdAt: str

    class Config:
        from_attributes = True


class EntityWithMentionsResponse(EntityResponse):
    """Entity response with mentions included."""
    mentions: List[EntityMentionResponse] = []


class EntityListResponse(BaseModel):
    """Response for listing entities."""
    entities: List[EntityResponse]
    total: int


@router.get("/entities", response_model=EntityListResponse)
async def list_entities(
    user_id: str = Query(..., alias="userId", description="User ID"),
    type: Optional[str] = Query(None, description="Filter by entity type"),
    search: Optional[str] = Query(None, description="Search in entity values"),
    limit: int = Query(50, ge=1, le=100, description="Max entities to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    """List user's entities with optional filtering.

    Args:
        user_id: User ID
        type: Optional entity type filter
        search: Optional search query
        limit: Max results
        offset: Pagination offset

    Returns:
        List of entities
    """
    try:
        # Build where clause
        where: dict = {"userId": user_id}

        if type:
            where["type"] = type

        if search:
            where["value"] = {"contains": search, "mode": "insensitive"}

        # Get total count
        total = await db.entity.count(where=where)

        # Get entities
        entities = await db.entity.find_many(
            where=where,
            order={"mentionCount": "desc"},
            take=limit,
            skip=offset
        )

        return EntityListResponse(
            entities=[
                EntityResponse(
                    id=e.id,
                    userId=e.userId,
                    type=e.type,
                    value=e.value,
                    normalizedValue=e.normalizedValue,
                    firstSeenAt=e.firstSeenAt.isoformat(),
                    lastSeenAt=e.lastSeenAt.isoformat(),
                    mentionCount=e.mentionCount
                )
                for e in entities
            ],
            total=total
        )

    except Exception as e:
        logger.error(f"Failed to list entities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list entities: {str(e)}"
        )


@router.get("/entities/{entity_id}", response_model=EntityWithMentionsResponse)
async def get_entity(
    entity_id: str,
    user_id: str = Query(..., alias="userId", description="User ID")
):
    """Get a specific entity with its mentions.

    Args:
        entity_id: Entity ID
        user_id: User ID for authorization

    Returns:
        Entity with mentions
    """
    try:
        entity = await db.entity.find_unique(
            where={"id": entity_id},
            include={"mentions": True}
        )

        if not entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entity not found"
            )

        if entity.userId != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this entity"
            )

        return EntityWithMentionsResponse(
            id=entity.id,
            userId=entity.userId,
            type=entity.type,
            value=entity.value,
            normalizedValue=entity.normalizedValue,
            firstSeenAt=entity.firstSeenAt.isoformat(),
            lastSeenAt=entity.lastSeenAt.isoformat(),
            mentionCount=entity.mentionCount,
            mentions=[
                EntityMentionResponse(
                    id=m.id,
                    entityId=m.entityId,
                    sessionId=m.sessionId,
                    context=m.context,
                    createdAt=m.createdAt.isoformat()
                )
                for m in entity.mentions
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get entity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get entity: {str(e)}"
        )


@router.get("/entities/search", response_model=EntityListResponse)
async def search_entities(
    user_id: str = Query(..., alias="userId", description="User ID"),
    q: str = Query(..., min_length=1, description="Search query"),
    types: Optional[List[str]] = Query(None, description="Filter by entity types"),
    limit: int = Query(20, ge=1, le=50, description="Max results")
):
    """Search entities by value.

    Args:
        user_id: User ID
        q: Search query
        types: Optional list of entity types to filter
        limit: Max results

    Returns:
        Matching entities
    """
    try:
        # Build where clause
        where: dict = {
            "userId": user_id,
            "value": {"contains": q, "mode": "insensitive"}
        }

        if types:
            where["type"] = {"in": types}

        # Get total count
        total = await db.entity.count(where=where)

        # Search entities
        entities = await db.entity.find_many(
            where=where,
            order={"mentionCount": "desc"},
            take=limit
        )

        return EntityListResponse(
            entities=[
                EntityResponse(
                    id=e.id,
                    userId=e.userId,
                    type=e.type,
                    value=e.value,
                    normalizedValue=e.normalizedValue,
                    firstSeenAt=e.firstSeenAt.isoformat(),
                    lastSeenAt=e.lastSeenAt.isoformat(),
                    mentionCount=e.mentionCount
                )
                for e in entities
            ],
            total=total
        )

    except Exception as e:
        logger.error(f"Failed to search entities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search entities: {str(e)}"
        )


@router.get("/sessions/{session_id}/entities", response_model=EntityListResponse)
async def get_session_entities(
    session_id: str,
    user_id: str = Query(..., alias="userId", description="User ID"),
    type: Optional[str] = Query(None, description="Filter by entity type")
):
    """Get entities mentioned in a specific session.

    Args:
        session_id: Session ID
        user_id: User ID for authorization
        type: Optional entity type filter

    Returns:
        Entities mentioned in the session
    """
    try:
        # Verify session ownership
        session = await db.session.find_unique(where={"id": session_id})
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        if session.userId != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this session"
            )

        # Build where clause for mentions
        mention_where: dict = {"sessionId": session_id}
        if type:
            mention_where["entity"] = {"type": type}

        # Get mentions with entities
        mentions = await db.entitymention.find_many(
            where=mention_where,
            include={"entity": True}
        )

        # Deduplicate entities
        entities_dict = {}
        for mention in mentions:
            if mention.entity.id not in entities_dict:
                entities_dict[mention.entity.id] = mention.entity

        entities = list(entities_dict.values())

        return EntityListResponse(
            entities=[
                EntityResponse(
                    id=e.id,
                    userId=e.userId,
                    type=e.type,
                    value=e.value,
                    normalizedValue=e.normalizedValue,
                    firstSeenAt=e.firstSeenAt.isoformat(),
                    lastSeenAt=e.lastSeenAt.isoformat(),
                    mentionCount=e.mentionCount
                )
                for e in entities
            ],
            total=len(entities)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session entities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session entities: {str(e)}"
        )


@router.delete("/entities/{entity_id}")
async def delete_entity(
    entity_id: str,
    user_id: str = Query(..., alias="userId", description="User ID")
):
    """Delete an entity and all its mentions.

    Args:
        entity_id: Entity ID
        user_id: User ID for authorization

    Returns:
        Success message
    """
    try:
        entity = await db.entity.find_unique(where={"id": entity_id})

        if not entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entity not found"
            )

        if entity.userId != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this entity"
            )

        # Delete entity (mentions cascade)
        await db.entity.delete(where={"id": entity_id})

        return {"message": "Entity deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete entity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete entity: {str(e)}"
        )
