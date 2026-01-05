# Tami Backend - Meeting Transcriber API

FastAPI backend for the Tami meeting transcription web application.

## Features

- 🎤 Audio file upload and transcription
- 🔊 Multiple transcription providers (Whisper, Ivrit.ai)
- 📝 Automatic meeting summarization
- 💬 Interactive Q&A chat about meetings
- 👥 Speaker diarization and labeling
- 🔒 Secure API key encryption
- 📊 Session management and history

## Prerequisites

- Python 3.11 or higher
- PostgreSQL 14 or higher
- OpenAI API key (for Whisper and GPT-4o mini)

## Installation

### 1. Set up PostgreSQL

Install PostgreSQL if you haven't already:

```bash
# macOS (using Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Create database and user
psql postgres
CREATE DATABASE tami;
CREATE USER tami WITH PASSWORD 'tami';
GRANT ALL PRIVILEGES ON DATABASE tami TO tami;
\q
```

### 2. Install Python dependencies

```bash
cd tami/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SECRET_KEY`: Generate with `openssl rand -hex 32`
- `CORS_ORIGINS`: Your frontend URL(s)

### 4. Generate Prisma client and run migrations

```bash
# Generate Prisma client
prisma generate --schema=../shared/prisma/schema.prisma

# Create database tables
prisma db push --schema=../shared/prisma/schema.prisma
```

## Running the Server

### Development mode (with auto-reload)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## API Endpoints

### File Upload

**POST /api/upload**
Upload an audio file for transcription.

Request:
- Form data with `file` field (audio file)

Response:
```json
{
  "uploadId": "uuid",
  "fileName": "meeting.m4a",
  "fileSize": 1234567,
  "filePath": "/path/to/file"
}
```

### Transcription

**POST /api/transcribe**
Start transcription process.

Request:
```json
{
  "uploadId": "uuid",
  "context": "Product planning meeting",
  "participants": ["Alice", "Bob"],
  "transcriptionProvider": "whisper",
  "transcriptionModel": "whisper-1",
  "summaryModel": "gpt-4o-mini"
}
```

Response:
```json
{
  "sessionId": "uuid",
  "status": "processing"
}
```

**GET /api/transcribe/{session_id}/status**
Get transcription status and results.

### Sessions

**GET /api/sessions**
List all sessions (with pagination).

**GET /api/sessions/{session_id}**
Get session details.

**PATCH /api/sessions/{session_id}/speakers**
Update speaker names.

Request:
```json
{
  "speakers": {
    "speaker_1": "אורי",
    "speaker_2": "תום"
  }
}
```

**DELETE /api/sessions/{session_id}**
Delete a session.

### Chat

**POST /api/chat**
Ask questions about a meeting.

Request:
```json
{
  "sessionId": "uuid",
  "message": "What were the main action items?"
}
```

**GET /api/sessions/{session_id}/chat**
Get chat history for a session.

**DELETE /api/sessions/{session_id}/chat**
Clear chat history.

### Settings

**GET /api/settings/{user_id}**
Get user settings.

**PUT /api/settings/{user_id}**
Update user settings.

**POST /api/settings/test-connection**
Test API connection.

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── api/
│   │   └── routes/          # API endpoints
│   │       ├── upload.py    # File upload
│   │       ├── transcribe.py # Transcription
│   │       ├── sessions.py  # Session management
│   │       ├── chat.py      # Chat Q&A
│   │       └── settings.py  # User settings
│   ├── core/
│   │   ├── config.py        # Configuration
│   │   └── security.py      # Encryption
│   ├── db/
│   │   └── __init__.py      # Database client
│   ├── schemas/             # Pydantic models
│   │   ├── session.py
│   │   ├── transcription.py
│   │   ├── chat.py
│   │   └── settings.py
│   └── services/            # Business logic
│       ├── transcription.py # Transcription service
│       ├── summarization.py # Summary generation
│       └── chat.py          # Chat service
├── requirements.txt
├── .env.example
└── README.md
```

## Development

### Running tests

```bash
pytest
```

### Database migrations

```bash
# Create a new migration
prisma migrate dev --schema=../shared/prisma/schema.prisma --name migration_name

# Apply migrations
prisma migrate deploy --schema=../shared/prisma/schema.prisma
```

### Viewing database

```bash
# Open Prisma Studio
prisma studio --schema=../shared/prisma/schema.prisma
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://tami:tami@localhost:5432/tami` |
| `DEBUG` | Enable debug mode | `False` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `SECRET_KEY` | Secret key for encryption | Required |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `MAX_UPLOAD_SIZE` | Max file upload size (bytes) | `104857600` (100MB) |
| `DEFAULT_TRANSCRIPTION_PROVIDER` | Default transcription provider | `whisper` |
| `DEFAULT_TRANSCRIPTION_MODEL` | Default transcription model | `whisper-1` |
| `DEFAULT_SUMMARY_MODEL` | Default summary model | `gpt-4o-mini` |
| `DEFAULT_CHAT_MODEL` | Default chat model | `gpt-4o-mini` |

## Troubleshooting

### Database connection errors

Ensure PostgreSQL is running:
```bash
brew services list  # macOS
sudo service postgresql status  # Linux
```

### Prisma client not found

Regenerate the Prisma client:
```bash
prisma generate --schema=../shared/prisma/schema.prisma
```

### Import errors

Ensure you're in the virtual environment:
```bash
source venv/bin/activate
```

## License

MIT
