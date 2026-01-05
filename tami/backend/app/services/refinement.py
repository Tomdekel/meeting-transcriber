"""Transcript refinement service - uses GPT-4o to improve transcription quality."""

import sys
from pathlib import Path
from typing import Optional, List
from loguru import logger
from openai import AsyncOpenAI

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from src.utils.models import TranscriptResult, TranscriptSegment


class TranscriptRefinementService:
    """Service for refining transcripts using GPT-4o."""

    def __init__(self):
        """Initialize refinement service."""
        pass

    async def refine_transcript(
        self,
        transcript: TranscriptResult,
        context: str,
        api_key: str,
        model: str = "gpt-4o"
    ) -> TranscriptResult:
        """Refine transcript using GPT-4o based on user context.

        This post-processing step improves transcription quality by:
        - Fixing transcription errors
        - Correcting names and technical terms
        - Identifying speakers and assigning names from context
        - Improving punctuation and capitalization
        - Using context to disambiguate unclear words

        Args:
            transcript: Original transcript from Whisper
            context: User-provided context about the meeting
            api_key: OpenAI API key
            model: Model to use for refinement (default: gpt-4o)

        Returns:
            Refined TranscriptResult with improved text and speaker names

        Raises:
            Exception: If refinement fails
        """
        if not context or not context.strip():
            logger.info("No context provided, skipping transcript refinement")
            return transcript

        logger.info(f"Refining transcript with {model} using context: {context[:100]}...")

        try:
            client = AsyncOpenAI(api_key=api_key)

            # Build the full transcript text for refinement
            full_transcript = self._format_transcript_for_refinement(transcript)

            # Refine the entire transcript at once for better context understanding
            refined_transcript_text = await self._refine_full_transcript(
                client=client,
                transcript_text=full_transcript,
                context=context,
                model=model
            )

            # Parse the refined transcript back into segments
            refined_segments = self._parse_refined_transcript(
                refined_text=refined_transcript_text,
                original_segments=transcript.segments
            )

            logger.info(f"Transcript refinement complete. Refined {len(refined_segments)} segments.")

            return TranscriptResult(
                segments=refined_segments,
                language=transcript.language,
                metadata=transcript.metadata
            )

        except Exception as e:
            logger.error(f"Transcript refinement failed: {e}")
            logger.warning("Falling back to original transcript")
            # Don't fail the whole process - just return original transcript
            return transcript

    async def _refine_full_transcript(
        self,
        client: AsyncOpenAI,
        transcript_text: str,
        context: str,
        model: str
    ) -> str:
        """Refine the full transcript using GPT-4o.

        Args:
            client: OpenAI client
            transcript_text: Full transcript text
            context: Meeting context
            model: Model to use

        Returns:
            Refined transcript text with speaker labels
        """
        system_prompt = """You are an expert transcript editor specializing in fixing audio transcription errors using provided context.

Your job is to:
1. **Use the provided meeting context to fix transcription errors** - Names, technical terms, topics discussed
2. Fix mishearings, wrong words, and punctuation based on context
3. Correct names and domain-specific language using the context clues
4. Identify speakers and assign real names when you have HIGH CONFIDENCE based on context
5. Improve clarity while preserving ALL original content - DO NOT add new information
6. Keep Hebrew/English text intact and properly formatted

CRITICAL RULES:
- **Use context to correct errors** - The context tells you what the meeting is about
- **Fix errors, don't invent** - Only correct what's clearly wrong based on context
- **Don't summarize or add** - Keep all original details, just fix transcription mistakes
- **Use context for speaker names** - If context mentions "Tom and Sarah discussing project X", use those names
- Output format: "Speaker Name: text here"
- Each speaker turn on a new line
- Use "Speaker 1", "Speaker 2" as defaults if names unclear
- ONLY replace speaker labels with real names if HIGHLY CONFIDENT (80%+) based on context"""

        user_prompt = f"""Meeting Context (USE THIS TO FIX ERRORS):
{context}

Original Transcript (may contain speech-to-text errors):
{transcript_text}

Instructions:
1. **Read the context CAREFULLY** - It tells you what this meeting is about, who the participants are, and what topics are discussed
2. **Use the context to correct transcription errors** - If context says "discussing React components" and transcript says "reacting components", fix it
3. **Use context for speaker identification** - If context mentions participant names, use them to identify speakers in the transcript
4. **Fix errors WITHOUT adding new information** - Only correct clear mistakes based on context
5. **Preserve all original details** - Don't summarize, don't paraphrase, just fix errors
6. Maintain conversation flow and structure

Return the corrected transcript in this exact format:
Speaker Name: corrected text here
Speaker Name: corrected text here

Corrected transcript:"""

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,  # Low temperature for consistent corrections
                max_tokens=4000  # Allow for longer transcripts
            )

            refined_text = response.choices[0].message.content.strip()
            return refined_text

        except Exception as e:
            logger.error(f"Failed to refine transcript: {e}")
            raise

    def _parse_refined_transcript(
        self,
        refined_text: str,
        original_segments: List[TranscriptSegment]
    ) -> List[TranscriptSegment]:
        """Parse the refined transcript back into segments.

        Args:
            refined_text: Refined transcript from GPT-4o
            original_segments: Original segments for timing info

        Returns:
            List of refined transcript segments
        """
        import re

        # Split by lines and parse "Speaker: text" format
        lines = refined_text.strip().split('\n')

        refined_segments = []

        # Calculate timing: distribute time evenly across segments
        total_duration = original_segments[-1].end_time if original_segments else 0

        for idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            # Match "Speaker Name: text" pattern
            match = re.match(r'^([^:]+):\s*(.+)$', line)

            if match:
                speaker_name = match.group(1).strip()
                text = match.group(2).strip()

                # Estimate timing based on segment position
                # This is approximate since we don't have real timestamps
                segment_duration = total_duration / max(len(lines), 1)
                start_time = idx * segment_duration
                end_time = (idx + 1) * segment_duration

                refined_segments.append(
                    TranscriptSegment(
                        speaker=speaker_name,
                        text=text,
                        start_time=start_time,
                        end_time=end_time
                    )
                )
            else:
                # If parsing fails, skip the line
                logger.warning(f"Failed to parse line: {line}")

        # If parsing failed completely, return original segments
        if not refined_segments:
            logger.warning("Refinement parsing failed completely, returning original segments")
            return original_segments

        return refined_segments

    def _format_transcript_for_refinement(self, transcript: TranscriptResult) -> str:
        """Format transcript for refinement prompt.

        Args:
            transcript: Transcript to format

        Returns:
            Formatted transcript text
        """
        lines = []
        for segment in transcript.segments:
            lines.append(f"{segment.speaker}: {segment.text}")
        return "\n".join(lines)


# Singleton instance
_refinement_service = None


def get_refinement_service() -> TranscriptRefinementService:
    """Get or create the refinement service singleton."""
    global _refinement_service
    if _refinement_service is None:
        _refinement_service = TranscriptRefinementService()
    return _refinement_service
