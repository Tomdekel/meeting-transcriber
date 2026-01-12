"""Service for parsing transcript text files."""

import re
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass, field
from loguru import logger


@dataclass
class TranscriptSegment:
    """A single segment of transcribed audio."""
    speaker: str
    text: str
    start_time: float
    end_time: float


@dataclass
class TranscriptResult:
    """Complete transcription result."""
    segments: List[TranscriptSegment]
    language: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class TranscriptParser:
    """Parser for transcript text files."""

    def parse_text_file(self, file_path: Path) -> TranscriptResult:
        """Parse transcript text file into TranscriptResult.

        Expected format:
            [text content]
            S
            Speaker [number]
            MM:SS
            [text content]
            S
            Speaker [number]
            MM:SS
            ...

        Args:
            file_path: Path to the transcript text file

        Returns:
            TranscriptResult with parsed segments

        Raises:
            ValueError: If file format is invalid
        """
        try:
            # Read file with UTF-8 encoding (try with BOM first)
            try:
                content = file_path.read_text(encoding='utf-8-sig')
            except UnicodeDecodeError:
                content = file_path.read_text(encoding='utf-8')

            if not content.strip():
                raise ValueError("Transcript file is empty")

            # Split by "S\n" delimiter to get segments
            parts = content.split('\nS\n')

            if len(parts) < 2:
                raise ValueError("Invalid transcript format: Expected segments separated by 'S' delimiter")

            segments: List[TranscriptSegment] = []

            # Process each segment
            for idx, part in enumerate(parts):
                if not part.strip():
                    logger.warning(f"Skipping empty segment at index {idx}")
                    continue

                # Parse the segment
                lines = part.strip().split('\n')

                # Handle the first segment which has text before the first "S"
                if idx == 0:
                    # This is just text without speaker/timestamp info yet
                    # We'll combine it with the next segment
                    if len(parts) > 1:
                        # Add this text to the beginning of the next part
                        parts[1] = part.strip() + '\n' + parts[1]
                    continue

                # Expected format:
                # Line 0: Speaker X
                # Line 1: MM:SS
                # Line 2+: text

                speaker = None
                timestamp = None
                text_lines = []

                for line_idx, line in enumerate(lines):
                    line = line.strip()
                    if not line:
                        continue

                    # Try to match speaker pattern
                    speaker_match = re.match(r'Speaker\s+(\d+)', line, re.IGNORECASE)
                    if speaker_match and speaker is None:
                        speaker_num = speaker_match.group(1)
                        speaker = f"speaker_{speaker_num}"
                        continue

                    # Try to match timestamp pattern (MM:SS or M:SS)
                    timestamp_match = re.match(r'(\d+):(\d+)', line)
                    if timestamp_match and timestamp is None:
                        minutes = int(timestamp_match.group(1))
                        seconds = int(timestamp_match.group(2))
                        timestamp = minutes * 60 + seconds
                        continue

                    # Everything else is text content
                    text_lines.append(line)

                # Validate we got required fields
                if not text_lines:
                    logger.warning(f"Skipping segment {idx}: No text content found")
                    continue

                # Use fallback values if missing
                if speaker is None:
                    # Alternate between speaker_1 and speaker_2 if not specified
                    speaker = f"speaker_{(idx % 2) + 1}"
                    logger.warning(f"Segment {idx}: Missing speaker, using fallback: {speaker}")

                if timestamp is None:
                    # Use fallback timing: previous end time + 1 second
                    if segments:
                        timestamp = segments[-1].end_time + 1.0
                    else:
                        timestamp = 0.0
                    logger.warning(f"Segment {idx}: Missing timestamp, using fallback: {timestamp}s")

                # Combine text lines
                text = ' '.join(text_lines)

                # Create segment
                # end_time will be set after we know the next segment's start time
                segments.append(TranscriptSegment(
                    speaker=speaker,
                    text=text,
                    start_time=float(timestamp),
                    end_time=float(timestamp) + 5.0  # Temporary, will be updated
                ))

            if not segments:
                raise ValueError("No valid segments found in transcript file")

            # Fix end times: use next segment's start time, or add 5 seconds for last segment
            for i in range(len(segments) - 1):
                segments[i].end_time = segments[i + 1].start_time

            # Last segment gets +5 seconds
            segments[-1].end_time = segments[-1].start_time + 5.0

            # Validate timestamps are sequential
            for i in range(len(segments)):
                if segments[i].end_time <= segments[i].start_time:
                    logger.warning(
                        f"Segment {i}: end_time ({segments[i].end_time}) <= start_time ({segments[i].start_time}), "
                        f"adjusting to +5 seconds"
                    )
                    segments[i].end_time = segments[i].start_time + 5.0

            logger.info(f"Successfully parsed {len(segments)} segments from transcript file")

            # Calculate total duration for metadata
            total_duration = segments[-1].end_time if segments else 0.0

            return TranscriptResult(
                segments=segments,
                language="he",  # Default to Hebrew
                metadata={
                    "duration": total_duration,
                    "source": "text_import"
                }
            )

        except Exception as e:
            logger.error(f"Failed to parse transcript file {file_path}: {e}")
            raise ValueError(f"Failed to parse transcript file: {str(e)}")


# Create singleton instance
transcript_parser = TranscriptParser()
