"""Audio file processing and format conversion."""

import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

from loguru import logger

from lib.audio.validator import AudioValidator
from lib.utils.exceptions import AudioFileError

# Try to import pydub, but fall back to direct file pass-through if not available
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    PYDUB_AVAILABLE = False
    AudioSegment = None  # type: ignore
    logger.warning("pydub not available - audio will be sent directly to Whisper without preprocessing")


class AudioProcessor:
    """Process audio files for transcription."""

    def __init__(self, normalize: bool = True, sample_rate: int = 16000):
        """Initialize audio processor.

        Args:
            normalize: Whether to normalize audio levels
            sample_rate: Target sample rate in Hz
        """
        self.normalize = normalize
        self.sample_rate = sample_rate

    def process(self, input_path: Path) -> Path:
        """Process audio file for optimal transcription.

        Steps:
        1. Validate format
        2. Load audio
        3. Normalize volume (if enabled)
        4. Convert to mono
        5. Resample to target sample rate
        6. Export as WAV

        Args:
            input_path: Path to input audio file

        Returns:
            Path to processed WAV file in temp directory (or original if pydub unavailable)

        Raises:
            AudioFileError: If processing fails
        """
        try:
            # Validate input file
            AudioValidator.validate(input_path)

            # If pydub is not available, just validate and return original file
            if not PYDUB_AVAILABLE:
                logger.info(f"Skipping audio processing (pydub unavailable), using original file: {input_path}")
                return input_path

            AudioValidator.check_ffmpeg()

            logger.info(f"Processing audio file: {input_path}")

            # Load audio
            audio = AudioSegment.from_file(str(input_path))
            logger.debug(f"Loaded audio: {len(audio)}ms, {audio.frame_rate}Hz, {audio.channels} channels")

            # Normalize volume to -20 dBFS
            if self.normalize:
                audio = self._normalize_loudness(audio)
                logger.debug("Normalized audio levels")

            # Convert to mono if stereo
            if audio.channels > 1:
                audio = audio.set_channels(1)
                logger.debug("Converted to mono")

            # Resample to target sample rate
            if audio.frame_rate != self.sample_rate:
                audio = audio.set_frame_rate(self.sample_rate)
                logger.debug(f"Resampled to {self.sample_rate}Hz")

            # Create temp output file
            temp_dir = Path(tempfile.gettempdir()) / "meeting-transcriber"
            temp_dir.mkdir(exist_ok=True)

            output_path = temp_dir / f"{input_path.stem}_processed.wav"

            # Export as WAV
            audio.export(
                str(output_path),
                format='wav',
                parameters=[
                    '-ac', '1',  # Mono
                    '-ar', str(self.sample_rate)  # Sample rate
                ]
            )

            logger.info(f"Processed audio saved to: {output_path}")
            return output_path

        except Exception as e:
            if isinstance(e, AudioFileError):
                raise
            raise AudioFileError(f"Audio processing failed: {e}")

    def _normalize_loudness(self, audio: AudioSegment) -> AudioSegment:
        """Normalize audio to target loudness.

        Args:
            audio: Input audio segment

        Returns:
            Normalized audio segment
        """
        target_dBFS = -20.0
        change_in_dBFS = target_dBFS - audio.dBFS
        return audio.apply_gain(change_in_dBFS)

    @staticmethod
    def cleanup(processed_path: Path) -> None:
        """Clean up temporary processed audio file.

        Args:
            processed_path: Path to processed audio file
        """
        try:
            if processed_path.exists():
                processed_path.unlink()
                logger.debug(f"Cleaned up temp file: {processed_path}")
        except Exception as e:
            logger.warning(f"Could not clean up temp file: {e}")
