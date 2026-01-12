"""Search endpoints using PostgreSQL Full-Text Search."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from loguru import logger

from app.db import db


router = APIRouter()


# Schemas
class SessionSearchResult(BaseModel):
    """Search result for a session."""
    id: str
    title: Optional[str]
    context: str
    status: str
    createdAt: str
    rank: float = 0.0
    matchType: str = "session"  # "session" or "transcript"
    highlightedText: Optional[str] = None


class EntitySearchResult(BaseModel):
    """Search result for an entity."""
    id: str
    type: str
    value: str
    mentionCount: int


class TranscriptSearchResult(BaseModel):
    """Search result for a transcript segment."""
    id: str
    sessionId: str
    sessionTitle: Optional[str]
    text: str
    speakerName: Optional[str]
    startTime: float
    endTime: float
    rank: float = 0.0


class GlobalSearchResponse(BaseModel):
    """Response for global search."""
    sessions: List[SessionSearchResult]
    entities: List[EntitySearchResult]
    totalSessions: int
    totalEntities: int


class SessionSearchResponse(BaseModel):
    """Response for in-session search."""
    segments: List[TranscriptSearchResult]
    total: int


@router.get("/search", response_model=GlobalSearchResponse)
async def global_search(
    user_id: str = Query(..., alias="userId", description="User ID"),
    q: str = Query(..., min_length=1, description="Search query"),
    types: Optional[List[str]] = Query(
        None,
        description="Types to search: sessions, entities"
    ),
    limit: int = Query(20, ge=1, le=50, description="Max results per type")
):
    """Global search across sessions and entities.

    Uses PostgreSQL full-text search for sessions and text matching for entities.

    Args:
        user_id: User ID
        q: Search query
        types: Types to search (default: all)
        limit: Max results per type

    Returns:
        Search results from sessions and entities
    """
    if types is None:
        types = ["sessions", "entities"]

    sessions = []
    entities = []
    total_sessions = 0
    total_entities = 0

    try:
        # Search sessions using FTS
        if "sessions" in types:
            # Use raw SQL for FTS query
            search_query = " | ".join(q.split())  # OR search for multiple terms

            # Search in sessions (title, context) and transcript segments
            session_results = await db.query_raw(
                f'''
                SELECT DISTINCT ON (s.id)
                    s.id,
                    s.title,
                    s.context,
                    s.status,
                    s."createdAt",
                    ts_rank(s."searchVector", to_tsquery('simple', $1)) as rank
                FROM "Session" s
                WHERE s."userId" = $2
                  AND s."searchVector" @@ to_tsquery('simple', $1)
                ORDER BY s.id, rank DESC
                LIMIT $3
                ''',
                search_query, user_id, limit
            )

            for row in session_results:
                sessions.append(SessionSearchResult(
                    id=row['id'],
                    title=row['title'],
                    context=row['context'],
                    status=row['status'],
                    createdAt=row['createdAt'].isoformat() if row['createdAt'] else '',
                    rank=float(row['rank']) if row['rank'] else 0.0,
                    matchType="session"
                ))

            # Also search in transcript segments
            segment_results = await db.query_raw(
                f'''
                SELECT DISTINCT ON (s.id)
                    s.id as session_id,
                    s.title,
                    s.context,
                    s.status,
                    s."createdAt",
                    ts."text" as matched_text,
                    ts_rank(ts."searchVector", to_tsquery('simple', $1)) as rank
                FROM "TranscriptSegment" ts
                JOIN "Transcript" t ON ts."transcriptId" = t.id
                JOIN "Session" s ON t."sessionId" = s.id
                WHERE s."userId" = $2
                  AND ts."searchVector" @@ to_tsquery('simple', $1)
                ORDER BY s.id, rank DESC
                LIMIT $3
                ''',
                search_query, user_id, limit
            )

            # Merge segment results (avoid duplicates)
            seen_ids = {s.id for s in sessions}
            for row in segment_results:
                if row['session_id'] not in seen_ids:
                    sessions.append(SessionSearchResult(
                        id=row['session_id'],
                        title=row['title'],
                        context=row['context'],
                        status=row['status'],
                        createdAt=row['createdAt'].isoformat() if row['createdAt'] else '',
                        rank=float(row['rank']) if row['rank'] else 0.0,
                        matchType="transcript",
                        highlightedText=row['matched_text'][:200] if row['matched_text'] else None
                    ))
                    seen_ids.add(row['session_id'])

            # Sort by rank and limit
            sessions = sorted(sessions, key=lambda x: x.rank, reverse=True)[:limit]
            total_sessions = len(sessions)

        # Search entities
        if "entities" in types:
            entity_results = await db.entity.find_many(
                where={
                    "userId": user_id,
                    "value": {"contains": q, "mode": "insensitive"}
                },
                order={"mentionCount": "desc"},
                take=limit
            )

            entities = [
                EntitySearchResult(
                    id=e.id,
                    type=e.type,
                    value=e.value,
                    mentionCount=e.mentionCount
                )
                for e in entity_results
            ]
            total_entities = len(entities)

        return GlobalSearchResponse(
            sessions=sessions,
            entities=entities,
            totalSessions=total_sessions,
            totalEntities=total_entities
        )

    except Exception as e:
        logger.error(f"Global search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/sessions/{session_id}/search", response_model=SessionSearchResponse)
async def search_in_session(
    session_id: str,
    user_id: str = Query(..., alias="userId", description="User ID"),
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(50, ge=1, le=100, description="Max results")
):
    """Search within a specific session's transcript.

    Args:
        session_id: Session ID
        user_id: User ID for authorization
        q: Search query
        limit: Max results

    Returns:
        Matching transcript segments
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

        # Get transcript
        transcript = await db.transcript.find_first(
            where={"sessionId": session_id}
        )

        if not transcript:
            return SessionSearchResponse(segments=[], total=0)

        # Search using FTS
        search_query = " | ".join(q.split())

        segment_results = await db.query_raw(
            f'''
            SELECT
                ts.id,
                ts."transcriptId",
                ts."speakerId",
                ts."speakerName",
                ts.text,
                ts."startTime",
                ts."endTime",
                ts."order",
                ts_rank(ts."searchVector", to_tsquery('simple', $1)) as rank
            FROM "TranscriptSegment" ts
            WHERE ts."transcriptId" = $2
              AND ts."searchVector" @@ to_tsquery('simple', $1)
            ORDER BY ts."order"
            LIMIT $3
            ''',
            search_query, transcript.id, limit
        )

        segments = [
            TranscriptSearchResult(
                id=row['id'],
                sessionId=session_id,
                sessionTitle=session.title,
                text=row['text'],
                speakerName=row['speakerName'],
                startTime=float(row['startTime']) if row['startTime'] else 0.0,
                endTime=float(row['endTime']) if row['endTime'] else 0.0,
                rank=float(row['rank']) if row['rank'] else 0.0
            )
            for row in segment_results
        ]

        return SessionSearchResponse(
            segments=segments,
            total=len(segments)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/search/suggestions")
async def get_search_suggestions(
    user_id: str = Query(..., alias="userId", description="User ID"),
    q: str = Query(..., min_length=1, description="Partial query"),
    limit: int = Query(5, ge=1, le=10, description="Max suggestions")
):
    """Get search suggestions based on partial query.

    Returns suggestions from entities and session titles.

    Args:
        user_id: User ID
        q: Partial search query
        limit: Max suggestions

    Returns:
        List of suggestions
    """
    try:
        suggestions = []

        # Get matching entities
        entities = await db.entity.find_many(
            where={
                "userId": user_id,
                "value": {"startsWith": q, "mode": "insensitive"}
            },
            order={"mentionCount": "desc"},
            take=limit
        )

        for e in entities:
            suggestions.append({
                "text": e.value,
                "type": "entity",
                "entityType": e.type
            })

        # Get matching session titles
        sessions = await db.session.find_many(
            where={
                "userId": user_id,
                "title": {"contains": q, "mode": "insensitive"}
            },
            take=limit - len(suggestions) if len(suggestions) < limit else 0
        )

        for s in sessions:
            if s.title:
                suggestions.append({
                    "text": s.title,
                    "type": "session"
                })

        return {"suggestions": suggestions[:limit]}

    except Exception as e:
        logger.error(f"Search suggestions failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get suggestions: {str(e)}"
        )
