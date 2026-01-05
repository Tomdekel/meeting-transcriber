"""Command-line argument parsing."""

import argparse
from pathlib import Path
from typing import Dict, Any


def parse_arguments() -> Dict[str, Any]:
    """Parse command-line arguments.

    Returns:
        Dictionary of arguments
    """
    parser = argparse.ArgumentParser(
        description="Meeting Transcriber - Transcribe, summarize, and chat with meeting recordings",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with Whisper
  python -m src.main --audio meeting.m4a --participants "Alice,Bob" \\
    --context "Q4 Planning" --openai-key sk-xxx

  # With config file
  python -m src.main --audio meeting.m4a --config config.yaml

  # Disable chat mode
  python -m src.main --audio meeting.m4a --participants "Alice,Bob" \\
    --context "Q4 Planning" --openai-key sk-xxx --no-chat
        """
    )

    # Audio input arguments (either --audio or --record)
    parser.add_argument(
        '--audio',
        type=Path,
        dest='audio_path',
        help='Path to audio file (.m4a, .wav, .mp3, etc.) - not needed when using --record'
    )

    parser.add_argument(
        '--participants',
        type=str,
        help='Comma-separated list of participant names (e.g., "Alice,Bob,Charlie")'
    )

    parser.add_argument(
        '--context',
        type=str,
        help='Meeting context or topic (e.g., "Q4 Planning Meeting")'
    )

    # API keys
    parser.add_argument(
        '--openai-key',
        type=str,
        dest='openai_api_key',
        help='OpenAI API key (for Whisper transcription and GPT-4o mini)'
    )

    parser.add_argument(
        '--transcription-key',
        type=str,
        dest='transcription_api_key',
        help='Transcription API key (for non-Whisper providers like Ivrit)'
    )

    # Transcription settings
    parser.add_argument(
        '--transcription-provider',
        type=str,
        choices=['whisper', 'ivrit'],
        help='Transcription provider (default: whisper)'
    )

    parser.add_argument(
        '--transcription-model',
        type=str,
        help='Transcription model name (default: whisper-1 for Whisper)'
    )

    # Chat settings
    parser.add_argument(
        '--enable-chat',
        action='store_true',
        dest='chat_enabled',
        help='Enable interactive chat mode after transcription (default: enabled)'
    )

    parser.add_argument(
        '--no-chat',
        action='store_false',
        dest='chat_enabled',
        help='Disable interactive chat mode'
    )

    parser.add_argument(
        '--no-save-chat',
        action='store_false',
        dest='chat_save_history',
        help='Don\'t save chat history to output file'
    )

    # Output settings
    parser.add_argument(
        '--output-dir',
        type=Path,
        dest='output_dir',
        help='Output directory for transcripts (default: ./output)'
    )

    parser.add_argument(
        '--output-formats',
        type=str,
        dest='output_formats',
        help='Comma-separated output formats: markdown,plaintext (default: both)'
    )

    # Configuration file
    parser.add_argument(
        '--config',
        type=Path,
        dest='config_file',
        help='Path to YAML configuration file'
    )

    # Recording options
    parser.add_argument(
        '--record',
        action='store_true',
        help='Record live audio instead of using a file'
    )

    parser.add_argument(
        '--record-source',
        type=str,
        choices=['microphone', 'system'],
        default='microphone',
        dest='record_source',
        help='Recording source: microphone (in-person) or system (Zoom via BlackHole)'
    )

    parser.add_argument(
        '--record-device',
        type=int,
        dest='record_device_id',
        help='Audio device ID to use (see --list-devices)'
    )

    parser.add_argument(
        '--list-devices',
        action='store_true',
        dest='list_devices',
        help='List available audio devices and exit'
    )

    # Logging
    parser.add_argument(
        '--log-level',
        type=str,
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        dest='log_level',
        help='Logging level (default: INFO)'
    )

    # Parse arguments
    args = parser.parse_args()

    # Convert to dictionary
    args_dict = vars(args)

    # Process participants (split comma-separated string)
    if args_dict.get('participants'):
        args_dict['participants'] = [
            p.strip() for p in args_dict['participants'].split(',')
        ]

    # Process output formats
    if args_dict.get('output_formats'):
        args_dict['output_formats'] = [
            f.strip() for f in args_dict['output_formats'].split(',')
        ]

    # Remove config_file from args_dict (handled separately)
    config_file = args_dict.pop('config_file', None)

    return {
        'config_file': config_file,
        'cli_args': args_dict
    }
