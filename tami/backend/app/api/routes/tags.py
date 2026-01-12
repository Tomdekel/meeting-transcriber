"""Tag management endpoints."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from loguru import logger

from app.db import db


router = APIRouter()


# Schemas
class TagCreate(BaseModel):
    """Schema for creating a tag."""
    name: str
    color: Optional[str] = "#6B7280"


class TagUpdate(BaseModel):
    """Schema for updating a tag."""
    name: Optional[str] = None
    color: Optional[str] = None
    isVisible: Optional[bool] = None


class TagResponse(BaseModel):
    """Response schema for a tag."""
    id: str
    userId: str
    name: str
    color: Optional[str]
    source: str
    isVisible: bool
    createdAt: str
    sessionCount: int = 0

    class Config:
        from_attributes = True


class TagListResponse(BaseModel):
    """Response for listing tags."""
    tags: List[TagResponse]
    total: int


class SessionTagResponse(BaseModel):
    """Response for a session tag."""
    id: str
    sessionId: str
    tagId: str
    tagName: str
    tagColor: Optional[str]
    createdAt: str


@router.get("/tags", response_model=TagListResponse)
async def list_tags(
    user_id: str = Query(..., alias="userId", description="User ID"),
    include_hidden: bool = Query(False, alias="includeHidden", description="Include auto-generated hidden tags"),
    source: Optional[str] = Query(None, description="Filter by source (manual, auto:person, etc.)")
):
    """List user's tags.

    Args:
        user_id: User ID
        include_hidden: Whether to include hidden auto-generated tags
        source: Optional source filter

    Returns:
        List of tags
    """
    try:
        # Build where clause
        where: dict = {"userId": user_id}

        if not include_hidden:
            where["isVisible"] = True

        if source:
            where["source"] = source

        # Get tags with session count
        tags = await db.tag.find_many(
            where=where,
            include={"sessions": True},
            order={"name": "asc"}
        )

        return TagListResponse(
            tags=[
                TagResponse(
                    id=t.id,
                    userId=t.userId,
                    name=t.name,
                    color=t.color,
                    source=t.source,
                    isVisible=t.isVisible,
                    createdAt=t.createdAt.isoformat(),
                    sessionCount=len(t.sessions) if t.sessions else 0
                )
                for t in tags
            ],
            total=len(tags)
        )

    except Exception as e:
        logger.error(f"Failed to list tags: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tags: {str(e)}"
        )


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag: TagCreate,
    user_id: str = Query(..., alias="userId", description="User ID")
):
    """Create a new tag.

    Args:
        tag: Tag creation data
        user_id: User ID

    Returns:
        Created tag
    """
    try:
        # Check if tag already exists
        existing = await db.tag.find_first(
            where={"userId": user_id, "name": tag.name}
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tag with this name already exists"
            )

        # Create tag
        new_tag = await db.tag.create(
            data={
                "userId": user_id,
                "name": tag.name,
                "color": tag.color,
                "source": "manual",
                "isVisible": True
            }
        )

        return TagResponse(
            id=new_tag.id,
            userId=new_tag.userId,
            name=new_tag.name,
            color=new_tag.color,
            source=new_tag.source,
            isVisible=new_tag.isVisible,
            createdAt=new_tag.createdAt.isoformat(),
            sessionCount=0
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create tag: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tag: {str(e)}"
        )


@router.patch("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    tag_update: TagUpdate,
    user_id: str = Query(..., alias="userId", description="User ID")
):
    """Update a tag.

    Can be used to:
    - Rename a tag
    - Change tag color
    - Promote an auto-tag to visible

    Args:
        tag_id: Tag ID
        tag_update: Update data
        user_id: User ID

    Returns:
        Updated tag
    """
    try:
        # Get existing tag
        tag = await db.tag.find_unique(
            where={"id": tag_id},
            include={"sessions": True}
        )

        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )

        if tag.userId != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this tag"
            )

        # Build update data
        update_data = {}
        if tag_update.name is not None:
            # Check for name conflict
            existing = await db.tag.find_first(
                where={
                    "userId": user_id,
                    "name": tag_update.name,
                    "id": {"not": tag_id}
                }
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Tag with this name already exists"
                )
            update_data["name"] = tag_update.name

        if tag_update.color is not None:
            update_data["color"] = tag_update.color

        if tag_update.isVisible is not None:
            update_data["isVisible"] = tag_update.isVisible

        if not update_data:
            # No changes
            return TagResponse(
                id=tag.id,
                userId=tag.userId,
                name=tag.name,
                color=tag.color,
                source=tag.source,
                isVisible=tag.isVisible,
                createdAt=tag.createdAt.isoformat(),
                sessionCount=len(tag.sessions) if tag.sessions else 0
            )

        # Update tag
        updated = await db.tag.update(
            where={"id": tag_id},
            data=update_data,
            include={"sessions": True}
        )

        return TagResponse(
            id=updated.id,
            userId=updated.userId,
            name=updated.name,
            color=updated.color,
            source=updated.source,
            isVisible=updated.isVisible,
            createdAt=updated.createdAt.isoformat(),
            sessionCount=len(updated.sessions) if updated.sessions else 0
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update tag: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tag: {str(e)}"
        )


@router.delete("/tags/{tag_id}")
async def delete_tag(
    tag_id: str,
    user_id: str = Query(..., alias="userId", description="User ID")
):
    """Delete a tag.

    Args:
        tag_id: Tag ID
        user_id: User ID

    Returns:
        Success message
    """
    try:
        tag = await db.tag.find_unique(where={"id": tag_id})

        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )

        if tag.userId != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this tag"
            )

        # Delete tag (session associations cascade)
        await db.tag.delete(where={"id": tag_id})

        return {"message": "Tag deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete tag: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tag: {str(e)}"
        )


# Session-Tag association endpoints

@router.post("/sessions/{session_id}/tags", response_model=SessionTagResponse, status_code=status.HTTP_201_CREATED)
async def add_tag_to_session(
    session_id: str,
    tag_id: str = Query(..., alias="tagId", description="Tag ID to add"),
    user_id: str = Query(..., alias="userId", description="User ID")
):
    """Add a tag to a session.

    Args:
        session_id: Session ID
        tag_id: Tag ID to add
        user_id: User ID

    Returns:
        Created session-tag association
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
                detail="Not authorized to modify this session"
            )

        # Verify tag ownership
        tag = await db.tag.find_unique(where={"id": tag_id})
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )
        if tag.userId != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to use this tag"
            )

        # Check if association already exists
        existing = await db.sessiontag.find_first(
            where={"sessionId": session_id, "tagId": tag_id}
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Session already has this tag"
            )

        # Create association
        session_tag = await db.sessiontag.create(
            data={
                "sessionId": session_id,
                "tagId": tag_id
            }
        )

        return SessionTagResponse(
            id=session_tag.id,
            sessionId=session_tag.sessionId,
            tagId=session_tag.tagId,
            tagName=tag.name,
            tagColor=tag.color,
            createdAt=session_tag.createdAt.isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add tag to session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add tag to session: {str(e)}"
        )


@router.delete("/sessions/{session_id}/tags/{tag_id}")
async def remove_tag_from_session(
    session_id: str,
    tag_id: str,
    user_id: str = Query(..., alias="userId", description="User ID")
):
    """Remove a tag from a session.

    Args:
        session_id: Session ID
        tag_id: Tag ID to remove
        user_id: User ID

    Returns:
        Success message
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
                detail="Not authorized to modify this session"
            )

        # Find and delete association
        session_tag = await db.sessiontag.find_first(
            where={"sessionId": session_id, "tagId": tag_id}
        )
        if not session_tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session does not have this tag"
            )

        await db.sessiontag.delete(where={"id": session_tag.id})

        return {"message": "Tag removed from session successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove tag from session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove tag from session: {str(e)}"
        )


@router.get("/sessions/{session_id}/tags", response_model=TagListResponse)
async def get_session_tags(
    session_id: str,
    user_id: str = Query(..., alias="userId", description="User ID"),
    include_hidden: bool = Query(False, alias="includeHidden", description="Include hidden auto-generated tags")
):
    """Get all tags for a session.

    Args:
        session_id: Session ID
        user_id: User ID
        include_hidden: Include hidden auto-tags

    Returns:
        List of tags for the session
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

        # Get session tags
        session_tags = await db.sessiontag.find_many(
            where={"sessionId": session_id},
            include={"tag": True}
        )

        tags = []
        for st in session_tags:
            if not include_hidden and not st.tag.isVisible:
                continue
            tags.append(
                TagResponse(
                    id=st.tag.id,
                    userId=st.tag.userId,
                    name=st.tag.name,
                    color=st.tag.color,
                    source=st.tag.source,
                    isVisible=st.tag.isVisible,
                    createdAt=st.tag.createdAt.isoformat(),
                    sessionCount=0  # Not calculating here for performance
                )
            )

        return TagListResponse(tags=tags, total=len(tags))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session tags: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session tags: {str(e)}"
        )
