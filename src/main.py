"""Main entry point for the meeting transcriber."""

import asyncio
import re
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from loguru import logger
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

from src.audio.processor import AudioProcessor
from src.audio.recorder import AudioRecorder, RecordingConfig
from src.chat.chatbot import Chatbot
from src.chat.history import ChatHistoryManager
from src.chat.session import ChatSession
from src.cli.parser import parse_arguments
from src.config.loader import ConfigLoader
from src.config.validator import ConfigValidator
from src.output.factory import FormatterFactory
from src.summarization.summarizer import Summarizer
from src.transcription.factory import TranscriberFactory
from src.utils.exceptions import (
    TranscriberError,
    AudioFileError,
    APIError,
    ConfigurationError
)
from src.utils.logger import setup_logging


console = Console()


async def main() -> int:
    """Main application entry point.

    Returns:
        Exit code (0 for success, 1 for error)
    """
    try:
        # Parse CLI arguments
        parsed = parse_arguments()
        config_file = parsed['config_file']
        cli_args = parsed['cli_args']

        # Handle --list-devices (early exit)
        if cli_args.get('list_devices'):
            recorder = AudioRecorder(RecordingConfig())
            recorder.list_devices()
            return 0

        # Load configuration
        config_loader = ConfigLoader()
        config = config_loader.load(config_file, cli_args)

        # Setup logging
        setup_logging(config.log_level)

        logger.info("Meeting Transcriber started")

        # Handle recording mode
        recorded_file = None
        if cli_args.get('record'):
            console.print(f"\n[bold cyan]Meeting Transcriber - Recording Mode[/bold cyan]")
            console.print(f"Source: {cli_args.get('record_source', 'microphone')}")
            console.print(f"Context: {config.context}")
            console.print(f"Participants: {', '.join(config.participants)}\n")

            # Create recording config
            recording_config = RecordingConfig(
                source=cli_args.get('record_source', 'microphone'),
                device_id=cli_args.get('record_device_id')
            )

            # Record audio
            recorder = AudioRecorder(recording_config)

            # Generate temp output path
            temp_dir = Path(tempfile.gettempdir()) / "meeting-transcriber"
            temp_dir.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            recorded_file = temp_dir / f"recording_{timestamp}.wav"

            # Record
            config.audio_path = recorder.record(recorded_file)
        else:
            # Validate that audio path is provided when not recording
            if not config.audio_path:
                console.print("[bold red]Error:[/bold red] Either --audio or --record must be provided")
                return 1

        # Validate configuration
        ConfigValidator.validate(config)

        console.print(f"\n[bold cyan]Meeting Transcriber[/bold cyan]")
        console.print(f"Topic: {config.context}")
        console.print(f"Audio: {config.audio_path}")
        console.print(f"Participants: {', '.join(config.participants)}\n")

        # Process audio
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Processing audio...", total=None)

            audio_processor = AudioProcessor(
                normalize=config.audio_normalize,
                sample_rate=config.audio_sample_rate
            )
            processed_audio = audio_processor.process(config.audio_path)

            progress.update(task, completed=True, description="[green]Audio processed")

        # Transcribe audio
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task(f"Transcribing with {config.transcription_provider.title()}...", total=None)

            # Get API key based on provider
            if config.transcription_provider == 'whisper':
                api_key = config.openai_api_key
            else:
                api_key = config.transcription_api_key

            transcriber = TranscriberFactory.create(
                config.transcription_provider,
                api_key,
                config.transcription_model
            )

            transcript = await transcriber.transcribe(processed_audio)

            progress.update(task, completed=True, description=f"[green]Transcription complete ({transcript.language})")

        # Clean up processed audio
        AudioProcessor.cleanup(processed_audio)

        # Label speakers (simple approach: assign speakers round-robin)
        # Note: Real speaker diarization would be more sophisticated
        transcript = _label_speakers(transcript, config.participants)

        # Generate summary
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Generating summary with GPT-4o mini...", total=None)

            summarizer = Summarizer(
                api_key=config.openai_api_key,
                model=config.openai_model
            )

            summary = await summarizer.generate_summary(
                transcript=transcript,
                context=config.context,
                participants=config.participants
            )

            progress.update(task, completed=True, description="[green]Summary generated")

        # Display summary
        console.print("\n[bold]Summary:[/bold]")
        console.print(f"{summary.overview}\n")

        if summary.key_points:
            console.print("[bold]Key Points:[/bold]")
            for point in summary.key_points:
                console.print(f"  • {point}")
            console.print("")

        if summary.action_items:
            console.print("[bold]Action Items:[/bold]")
            for item in summary.action_items:
                assignee = f" ({item.assignee})" if item.assignee else ""
                console.print(f"  ☐ {item.description}{assignee}")
            console.print("")

        # Interactive chat (if enabled)
        chat_history: Optional[ChatHistoryManager] = None
        if config.chat_enabled:
            chatbot = Chatbot(
                api_key=config.openai_api_key,
                model=config.openai_model
            )

            chat_session = ChatSession(
                chatbot=chatbot,
                transcript=transcript,
                summary=summary
            )

            chat_history = await chat_session.run()

        # Generate output files
        console.print(f"\n[bold]Generating output files...[/bold]")

        for format_name in config.output_formats:
            formatter = FormatterFactory.create(format_name)

            output_content = formatter.format(
                transcript=transcript,
                summary=summary,
                chat_history=chat_history,
                metadata={
                    'context': config.context,
                    'date': datetime.now(),
                    'transcription_provider': config.transcription_provider
                }
            )

            # Generate filename
            output_filename = generate_output_filename(config.context, format_name)
            output_path = config.output_dir / output_filename

            # Write file
            output_path.write_text(output_content, encoding='utf-8')

            console.print(f"  ✓ {format_name.title()}: {output_path}")

        console.print(f"\n[bold green]✓ Transcription complete![/bold green]")
        logger.info("Transcription pipeline completed successfully")

        # Clean up recorded file if it was created
        if recorded_file and recorded_file.exists():
            try:
                recorded_file.unlink()
                logger.debug(f"Cleaned up recording: {recorded_file}")
            except Exception as e:
                logger.warning(f"Could not clean up recording file: {e}")

        return 0

    except ConfigurationError as e:
        console.print(f"\n[bold red]Configuration Error:[/bold red] {e}")
        logger.error(f"Configuration error: {e}")
        return 1

    except AudioFileError as e:
        console.print(f"\n[bold red]Audio Error:[/bold red] {e}")
        logger.error(f"Audio error: {e}")
        return 1

    except APIError as e:
        console.print(f"\n[bold red]API Error:[/bold red] {e}")
        logger.error(f"API error: {e}")
        return 1

    except TranscriberError as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}")
        logger.error(f"Transcriber error: {e}")
        return 1

    except KeyboardInterrupt:
        console.print(f"\n\n[yellow]Interrupted by user[/yellow]")
        logger.info("Interrupted by user")
        return 1

    except Exception as e:
        console.print(f"\n[bold red]Unexpected Error:[/bold red] {e}")
        logger.exception("Unexpected error")
        return 1


def _label_speakers(transcript, participants):
    """Simple speaker labeling (assigns speakers round-robin).

    Note: This is a placeholder. Real speaker diarization would be more sophisticated.

    Args:
        transcript: Transcript result
        participants: List of participant names

    Returns:
        Transcript with labeled speakers
    """
    if len(transcript.segments) == 1:
        # Single segment from Whisper - split by sentence/paragraph for demo
        segment = transcript.segments[0]

        # Split text into sentences (simple split)
        sentences = re.split(r'(?<=[.!?])\s+', segment.text)

        # Create new segments
        from src.utils.models import TranscriptSegment
        new_segments = []
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                speaker = participants[i % len(participants)]
                new_segments.append(TranscriptSegment(
                    speaker=speaker,
                    text=sentence.strip(),
                    start_time=0.0,
                    end_time=0.0
                ))

        transcript.segments = new_segments

    return transcript


def generate_output_filename(context: str, format_name: str) -> str:
    """Generate output filename.

    Args:
        context: Meeting context
        format_name: Output format

    Returns:
        Filename
    """
    date = datetime.now().strftime('%Y-%m-%d')
    slug = context.lower().replace(' ', '-')
    slug = re.sub(r'[^a-z0-9-]', '', slug)[:50]  # Limit length

    extension = 'md' if format_name == 'markdown' else 'txt'

    return f"{date}_{slug}.{extension}"


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
