# Meeting Transcriber

A powerful CLI tool and web app for recording and transcribing meetings, generating AI-powered summaries with action items, and interacting with transcripts through natural language chat. Record directly from your microphone or capture system audio from Zoom, Teams, and other apps!

## Features

- **🎙️ Live Meeting Recording**: Record directly from microphone or system audio (Zoom, Teams)
- **Audio Transcription**: Support for multiple formats (.m4a, .wav, .mp3, etc.)
- **Multiple Providers**: Whisper API (OpenAI), with support for Ivrit.ai coming soon
- **AI Summarization**: Automatic summary generation with GPT-4o mini
- **Action Item Extraction**: Intelligent extraction of tasks, assignees, and deadlines
- **Interactive Chat**: Ask questions about the meeting using natural language
- **Multiple Output Formats**: Markdown and plain text
- **Flexible Configuration**: CLI arguments, YAML config file, or environment variables

## Requirements

- Python 3.8+
- FFmpeg (for audio processing)
- OpenAI API key

## Installation

### 1. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)

### 2. Clone and Setup

```bash
cd meeting-transcriber
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure API Keys

**Option A: Environment Variables** (recommended)

Copy the example file and add your API key:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

**Option B: Configuration File**

```bash
cp config.example.yaml config.yaml
# Edit config.yaml and add your API keys
```

## Usage

### Basic Usage

```bash
python -m src.main \
  --audio meeting.m4a \
  --participants "Alice,Bob,Charlie" \
  --context "Q4 Planning Meeting" \
  --openai-key sk-your-api-key
```

### With Configuration File

```bash
python -m src.main \
  --audio meeting.m4a \
  --participants "Alice,Bob,Charlie" \
  --context "Q4 Planning Meeting" \
  --config config.yaml
```

### Disable Chat Mode

```bash
python -m src.main \
  --audio meeting.m4a \
  --participants "Alice,Bob" \
  --context "Team Sync" \
  --openai-key sk-xxx \
  --no-chat
```

### Custom Output Directory

```bash
python -m src.main \
  --audio meeting.m4a \
  --participants "Alice,Bob" \
  --context "Sprint Planning" \
  --openai-key sk-xxx \
  --output-dir ./my-transcripts
```

## 🎙️ Live Meeting Recording

Record meetings directly from your microphone or capture system audio (Zoom, Teams, etc.) and automatically transcribe them!

### List Available Audio Devices

First, check which audio devices are available:

```bash
python -m src.main --list-devices
```

Output:
```
Available Audio Devices:

  [0] MacBook Air Microphone (Microphone)
      Channels: 1, Sample Rate: 48000Hz

  [1] BlackHole 2ch (System Audio)
      Channels: 2, Sample Rate: 48000Hz
```

### In-Person Meeting Recording (Microphone)

Record from your microphone for in-person meetings:

```bash
python -m src.main \
  --record \
  --participants "Alice,Bob,Charlie" \
  --context "Team Standup" \
  --openai-key sk-xxx
```

**How it works:**
1. Press Enter when ready to start
2. Speak naturally - the recording timer displays in real-time
3. Press Enter again to stop recording
4. Audio is automatically transcribed → summarized → ready for chat

### Zoom/Online Meeting Recording (System Audio)

Capture system audio from Zoom, Teams, or any other app using BlackHole:

```bash
python -m src.main \
  --record \
  --record-source system \
  --participants "Alice,Bob,Charlie,David" \
  --context "Client Demo" \
  --openai-key sk-xxx
```

**How it works:**
1. BlackHole captures your system audio output
2. Everything you hear in the meeting is recorded
3. Press Enter to stop when meeting ends
4. Automatic transcription + summary generation

### Recording with Specific Device

If you have multiple microphones or audio devices:

```bash
python -m src.main \
  --record \
  --record-device 2 \
  --participants "Alice,Bob" \
  --context "Interview" \
  --openai-key sk-xxx
```

### Recording with Configuration File

Set default recording preferences in `config.yaml`:

```yaml
recording:
  source: microphone     # or 'system' for BlackHole
  device_id: null        # null = auto-detect, or specify device ID
  sample_rate: 44100     # CD quality
  channels: 2            # Stereo
  output_format: wav
```

Then simply run:

```bash
python -m src.main \
  --record \
  --participants "Alice,Bob" \
  --context "Weekly Sync" \
  --config config.yaml
```

## 🎧 BlackHole Setup (macOS System Audio)

To record Zoom meetings or other system audio on macOS, install BlackHole:

### 1. Install BlackHole

```bash
brew install blackhole-2ch
```

### 2. Configure Audio MIDI Setup

1. Open **Audio MIDI Setup** (Applications → Utilities → Audio MIDI Setup)
2. Click the **+** button at bottom left → Select **Create Multi-Output Device**
3. Name it "BlackHole + Speakers"
4. Check both:
   - ✅ **BlackHole 2ch**
   - ✅ **Your Speakers/Headphones** (e.g., "MacBook Air Speakers")
5. Right-click the Multi-Output Device → **Use This Device For Sound Output**

### 3. Configure Zoom/Meeting App

**For Zoom:**
1. Zoom → Settings → Audio
2. Set **Speaker** to "BlackHole + Speakers"
3. This routes audio to both your speakers AND the recording

**For other apps:** Similar setting - output to the Multi-Output Device

### 4. Start Recording

```bash
python -m src.main \
  --record \
  --record-source system \
  --participants "Alice,Bob,Charlie" \
  --context "Team Retro" \
  --openai-key sk-xxx
```

### 5. Restore Normal Audio

After recording, switch audio output back to your normal speakers/headphones in System Settings → Sound.

### Troubleshooting BlackHole

**"BlackHole audio device not found"**
- Solution: Run `brew install blackhole-2ch` and restart your terminal

**"No audio being recorded"**
- Check that Multi-Output Device is selected as system output
- Verify Zoom/app is outputting to BlackHole + Speakers
- Test with `--list-devices` to confirm BlackHole appears

**"Can't hear audio during Zoom call"**
- Make sure you checked BOTH BlackHole and your Speakers in Multi-Output Device
- The Multi-Output sends audio to both simultaneously

## Command-Line Options

### Audio Input (choose one)

- `--audio PATH`: Path to audio file **OR**
- `--record`: Record live audio from microphone/system

### Required Arguments

- `--participants "Name1,Name2"`: Comma-separated list of participant names
- `--context "Topic"`: Meeting context or topic

### Recording Options

- `--record`: Enable live recording mode
- `--record-source {microphone,system}`: Recording source (default: microphone)
- `--record-device ID`: Specific audio device ID (use --list-devices to see options)
- `--list-devices`: List available audio devices and exit

### API Keys

- `--openai-key KEY`: OpenAI API key (for Whisper + GPT-4o mini)
- `--transcription-key KEY`: Transcription API key (for Ivrit or other providers)

### Transcription Settings

- `--transcription-provider {whisper,ivrit}`: Provider to use (default: whisper)
- `--transcription-model MODEL`: Model name (default: whisper-1)

### Chat Settings

- `--enable-chat`: Enable interactive chat (enabled by default)
- `--no-chat`: Disable interactive chat
- `--no-save-chat`: Don't save chat history to output file

### Output Settings

- `--output-dir PATH`: Output directory (default: ./output)
- `--output-formats "markdown,plaintext"`: Comma-separated formats

### Other Options

- `--config PATH`: Path to YAML configuration file
- `--log-level {DEBUG,INFO,WARNING,ERROR}`: Set logging level

## Configuration File

Create a `config.yaml` file for reusable settings:

```yaml
transcription:
  provider: whisper
  api_key: ${OPENAI_API_KEY}
  model: whisper-1
  language: auto

summarization:
  api_key: ${OPENAI_API_KEY}
  model: gpt-4o-mini

chat:
  enabled: true
  save_history: true

output:
  formats:
    - markdown
    - plaintext
  directory: ./output

audio:
  normalize: true
  sample_rate: 16000

log_level: INFO
```

## Output Format

### Markdown Example

```markdown
# Meeting Transcript
**Date:** 2026-01-03 14:30
**Topic:** Q4 Planning Meeting
**Participants:** Alice, Bob, Charlie

---

## Summary
Discussion of Q4 goals and resource allocation...

### Key Points
- Increased budget for engineering team
- New product launch planned for November

### Action Items
- [ ] Alice - Prepare Q4 budget proposal - Due: 2026-01-15
- [ ] Bob - Draft product roadmap

---

## Full Transcript

### Alice [00:00:15]
Let's start by discussing our Q4 priorities...

---

## Chat History

**Q:** What were the main concerns raised?
**A:** The main concerns were budget constraints and timeline feasibility...
```

## Interactive Chat

After transcription, you'll enter an interactive chat mode where you can ask questions:

```
=== Interactive Chat Mode ===
Ask questions about the meeting (type 'exit' to finish)

[You] > What action items were assigned to Alice?

[Assistant]
Alice was assigned the following action items:
- Prepare Q4 budget proposal (Due: 2026-01-15)
- Coordinate with the design team on new features

[You] > exit
```

## Project Structure

```
meeting-transcriber/
├── src/
│   ├── main.py              # Main entry point
│   ├── cli/                 # CLI parsing
│   ├── config/              # Configuration management
│   ├── audio/               # Audio processing
│   ├── transcription/       # Transcription providers
│   ├── summarization/       # Summary generation
│   ├── chat/                # Interactive chat
│   ├── output/              # Output formatters
│   └── utils/               # Utilities and models
├── config.example.yaml      # Example configuration
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Supported Audio Formats

- .m4a
- .wav
- .mp3
- .flac
- .ogg
- .webm
- .mpga
- .mpeg

## Troubleshooting

### FFmpeg Not Found

```
Error: ffmpeg is not installed
```

**Solution:** Install FFmpeg following the installation instructions above.

### API Authentication Error

```
Error: OpenAI API authentication failed
```

**Solution:** Check that your API key is correct and starts with `sk-`.

### Audio File Not Found

```
Error: Audio file not found
```

**Solution:** Check the path to your audio file and ensure it exists.

## 🌐 Tami Web Application

A full-featured web interface is available in the `tami/` directory! Features include:

- **Live Recording**: Record meetings directly in your browser with microphone permission
- **File Upload**: Drag-and-drop audio files for transcription
- **Real-time Status**: Watch transcription progress with live updates
- **Interactive UI**: Beautiful Hebrew RTL interface
- **Session Management**: Browse past meetings and transcripts
- **Chat Interface**: Ask questions about any meeting
- **Speaker Editing**: Rename speakers after transcription
- **Action Items**: Mark action items as complete, add new ones

### Quick Start (Tami Web App)

```bash
# Backend
cd tami/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd tami/frontend
npm install
npm run dev

# Visit http://localhost:3000
```

See `tami/README.md` for full documentation.

## Roadmap

### Phase 2: Ivrit.ai Support (Coming Soon)
- [ ] Ivrit.ai API integration
- [ ] Hebrew language optimization
- [ ] Custom speaker diarization

### Future Enhancements
- [x] **Web interface** ✅ (See Tami Web App above!)
- [x] **Live meeting recording** ✅
- [ ] Real speaker diarization (automatic speaker detection)
- [ ] Remove BlackHole dependency (Phase 8 - CoreAudio tap)
- [ ] Batch processing of multiple files
- [ ] Caching of transcription results
- [ ] Additional output formats (HTML, PDF)
- [ ] Custom summary prompts

## API Costs

**Whisper API:**
- ~$0.006 per minute of audio

**GPT-4o mini:**
- ~$0.15 per 1M input tokens
- ~$0.60 per 1M output tokens

For a 30-minute meeting:
- Transcription: ~$0.18
- Summary + Chat (estimated): ~$0.02-0.10
- **Total: ~$0.20-0.30 per meeting**

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For issues or questions, please open an issue on the GitHub repository.

## Acknowledgments

- OpenAI for Whisper and GPT-4o mini APIs
- Built with Python, Click, Rich, and other open-source libraries
