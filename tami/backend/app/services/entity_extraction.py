"""Entity extraction service using GPT-4o-mini."""

import json
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from loguru import logger
from openai import AsyncOpenAI


# Default entity types to extract
DEFAULT_ENTITY_TYPES = [
    "person",
    "organization",
    "project",
    "date",
    "time",
    "price",
    "location",
    "deliverable",
    "decision"
]

# Entity type descriptions for the prompt
ENTITY_TYPE_DESCRIPTIONS = {
    "person": "Names of people mentioned (e.g., 'John Smith', 'Sarah')",
    "organization": "Companies, teams, departments (e.g., 'Google', 'Marketing Team')",
    "project": "Project names, codenames (e.g., 'Project Alpha', 'Q4 Launch')",
    "date": "Specific dates or deadlines (e.g., 'January 15', 'next Monday')",
    "time": "Time references (e.g., 'in two weeks', '3pm', 'end of month')",
    "price": "Prices, costs, budgets (e.g., '$50,000', '100K ILS')",
    "location": "Places mentioned (e.g., 'Tel Aviv', 'conference room B')",
    "deliverable": "Deliverables, artifacts (e.g., 'design document', 'prototype')",
    "decision": "Decisions made (e.g., 'decided to postpone launch')"
}


class EntityMetadata(BaseModel):
    """Metadata for an extracted entity."""
    currency: Optional[str] = None  # For price entities
    role: Optional[str] = None  # For person entities
    amount: Optional[float] = None  # For price entities
    date_iso: Optional[str] = None  # For date/time entities


class ExtractedEntity(BaseModel):
    """An entity extracted from text."""
    entity: str  # The raw extracted value
    type: str  # Entity type
    normalized_form: str  # Normalized version for deduplication
    context: Optional[str] = None  # Surrounding text
    metadata: EntityMetadata = EntityMetadata()


class EntityExtractionService:
    """Service for extracting entities from transcripts using GPT-4o-mini."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        """Initialize entity extraction service.

        Args:
            api_key: OpenAI API key
            model: Model to use for extraction (default: gpt-4o-mini)
        """
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    def _build_extraction_prompt(
        self,
        text: str,
        context: str,
        entity_types: List[str]
    ) -> str:
        """Build the extraction prompt.

        Args:
            text: Transcript text to extract from
            context: Meeting context
            entity_types: Types of entities to extract

        Returns:
            Formatted prompt
        """
        type_descriptions = "\n".join([
            f"- {t}: {ENTITY_TYPE_DESCRIPTIONS.get(t, t)}"
            for t in entity_types
        ])

        return f"""Extract entities from the following meeting transcript.

Meeting Context: {context}

Entity Types to Extract:
{type_descriptions}

Instructions:
1. Extract all mentioned entities of the specified types
2. For each entity, provide:
   - entity: The exact text as mentioned
   - type: One of the entity types listed above
   - normalized_form: A normalized/canonical version for deduplication (lowercase, trim whitespace)
   - context: A short phrase showing how it was mentioned
   - metadata: Additional info (currency/amount for prices, date_iso for dates, role for people)
3. Be thorough - extract ALL mentions, even if the same entity appears multiple times
4. For Hebrew text, preserve Hebrew characters in the entity and normalized_form

Transcript:
{text}

Respond with a JSON array of entities. Example format:
[
  {{
    "entity": "John Smith",
    "type": "person",
    "normalized_form": "john smith",
    "context": "John Smith will lead the project",
    "metadata": {{"role": "project lead"}}
  }},
  {{
    "entity": "$50,000",
    "type": "price",
    "normalized_form": "50000 usd",
    "context": "budget of $50,000",
    "metadata": {{"currency": "USD", "amount": 50000}}
  }}
]

Return ONLY the JSON array, no other text."""

    async def extract_entities(
        self,
        transcript_text: str,
        context: str = "",
        entity_types: Optional[List[str]] = None
    ) -> List[ExtractedEntity]:
        """Extract entities from transcript text.

        Args:
            transcript_text: The full transcript text
            context: Meeting context for better extraction
            entity_types: Types of entities to extract (default: all types)

        Returns:
            List of extracted entities
        """
        if entity_types is None:
            entity_types = DEFAULT_ENTITY_TYPES

        logger.info(f"Extracting entities of types: {entity_types}")

        # Truncate very long transcripts to avoid token limits
        max_chars = 15000  # Approximately 4k tokens
        if len(transcript_text) > max_chars:
            logger.warning(f"Transcript too long ({len(transcript_text)} chars), truncating")
            transcript_text = transcript_text[:max_chars] + "..."

        prompt = self._build_extraction_prompt(transcript_text, context, entity_types)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting structured information from text. "
                                   "You always respond with valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=4000
            )

            content = response.choices[0].message.content.strip()

            # Parse JSON response
            # Handle potential markdown code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            entities_data = json.loads(content)

            # Convert to ExtractedEntity objects
            entities = []
            for entity_dict in entities_data:
                try:
                    metadata = EntityMetadata(**entity_dict.get("metadata", {}))
                    entity = ExtractedEntity(
                        entity=entity_dict["entity"],
                        type=entity_dict["type"],
                        normalized_form=entity_dict.get("normalized_form", entity_dict["entity"].lower().strip()),
                        context=entity_dict.get("context"),
                        metadata=metadata
                    )
                    entities.append(entity)
                except Exception as e:
                    logger.warning(f"Failed to parse entity: {entity_dict}, error: {e}")
                    continue

            logger.info(f"Extracted {len(entities)} entities")
            return entities

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse entity extraction response: {e}")
            return []
        except Exception as e:
            logger.error(f"Entity extraction failed: {e}")
            return []

    async def extract_and_deduplicate(
        self,
        transcript_text: str,
        context: str = "",
        entity_types: Optional[List[str]] = None
    ) -> Dict[str, List[ExtractedEntity]]:
        """Extract entities and group by type with deduplication.

        Args:
            transcript_text: The full transcript text
            context: Meeting context
            entity_types: Types of entities to extract

        Returns:
            Dict mapping entity type to list of unique entities
        """
        entities = await self.extract_entities(transcript_text, context, entity_types)

        # Group and deduplicate by type and normalized_form
        grouped: Dict[str, Dict[str, ExtractedEntity]] = {}
        for entity in entities:
            if entity.type not in grouped:
                grouped[entity.type] = {}

            key = entity.normalized_form
            if key not in grouped[entity.type]:
                grouped[entity.type][key] = entity

        # Convert back to lists
        result = {
            entity_type: list(entities_dict.values())
            for entity_type, entities_dict in grouped.items()
        }

        return result


def get_entity_extraction_service(api_key: str, model: str = "gpt-4o-mini") -> EntityExtractionService:
    """Factory function to create an EntityExtractionService.

    Args:
        api_key: OpenAI API key
        model: Model to use

    Returns:
        EntityExtractionService instance
    """
    return EntityExtractionService(api_key, model)
