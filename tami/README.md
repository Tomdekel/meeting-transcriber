# Tami - Meeting Transcriber Web UI

A modern web application for transcribing, summarizing, and chatting with meeting recordings. Built with Next.js, FastAPI, and PostgreSQL, featuring Monday.com-inspired design and full Hebrew RTL support.

## ✨ Features

- 📤 **File Upload**: Drag-and-drop or file selection for audio files
- 🎤 **Transcription**: Multiple providers (Whisper, Ivrit.ai) with Hebrew support
- 👥 **Speaker Management**: Automatic speaker detection with editable names
- 📝 **Smart Summaries**: AI-generated meeting summaries with key points and action items
- 💬 **Interactive Chat**: Q&A about meeting content using GPT-4o mini
- ⚙️ **Settings**: API key management and model selection
- 🌐 **RTL Support**: Full Hebrew right-to-left layout
- 🎨 **Modern Design**: Monday.com-inspired UI with Tailwind CSS

## 🏗️ Architecture

```
tami/
├── frontend/          # Next.js 14 application
├── backend/           # FastAPI backend
├── shared/           # Shared Prisma schema
└── docker-compose.yml # PostgreSQL setup
```

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui components
- React Query (@tanstack/react-query)
- Zustand (state management)

**Backend:**
- FastAPI
- Python 3.11+
- Prisma ORM
- PostgreSQL
- OpenAI API (Whisper, GPT-4o mini)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- Docker and Docker Compose (for PostgreSQL)
- OpenAI API key

### 1. Clone and Navigate

```bash
cd tami
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432.

### 3. Set up Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your configuration

# Generate Prisma client and create database tables
prisma generate --schema=../shared/prisma/schema.prisma
prisma db push --schema=../shared/prisma/schema.prisma

# Start the server
uvicorn app.main:app --reload
```

Backend will be available at http://localhost:8000

### 4. Set up Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local and add backend URL

# Start development server
npm run dev
```

Frontend will be available at http://localhost:3000

## 📖 Documentation

- [Backend README](./backend/README.md) - FastAPI backend documentation
- [Frontend README](./frontend/README.md) - Next.js frontend documentation
- [API Documentation](http://localhost:8000/docs) - Interactive API docs (when backend is running)

## 🎯 Usage

### 1. Upload Audio File

- Drag and drop or select an audio file (.m4a, .mp3, .wav, etc.)
- Add meeting context (e.g., "Q4 Planning Meeting")
- Click "Transcribe"

### 2. View Results

- **Transcript**: Full conversation with speaker labels
- **Summary**: Overview, key points, and action items
- **Chat**: Ask questions about the meeting

### 3. Edit Speakers

- Click on speaker names (Speaker 1, Speaker 2, etc.)
- Assign real names (e.g., "אורי", "תום")
- Changes apply to entire transcript

### 4. Configure Settings

- Add OpenAI API key
- Select models (transcription, summary, chat)
- Choose between best quality and budget options
- All models support Hebrew

## 🌍 Hebrew Support

Tami is designed for Hebrew meetings:

- **RTL Layout**: Full right-to-left support
- **Hebrew Fonts**: Rubik font for optimal Hebrew rendering
- **Hebrew Models**: All AI models selected support Hebrew excellently
- **Bidirectional Text**: Proper handling of mixed Hebrew/English content

## 🔐 Security

- API keys are encrypted using AES-256 before storage
- Keys never sent to frontend
- All API calls authenticated
- File upload size limits enforced
- Rate limiting on API endpoints

## 🧪 Development

### Running Tests

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

### Database Management

View database with Prisma Studio:
```bash
cd backend
prisma studio --schema=../shared/prisma/schema.prisma
```

Create database migration:
```bash
prisma migrate dev --schema=../shared/prisma/schema.prisma --name migration_name
```

## 📊 Model Options

### Transcription Models

| Provider | Model | Hebrew Support | Cost |
|----------|-------|----------------|------|
| OpenAI | whisper-1 | ✅ Excellent | $0.006/min |
| Ivrit.ai | ivrit-v2 | ✅ Native | TBD |

### Summary/Chat Models

| Provider | Model | Hebrew Support | Cost (per 1M tokens) |
|----------|-------|----------------|---------------------|
| OpenAI | gpt-4o-mini | ✅ Excellent | $0.15 / $0.60 |
| OpenAI | gpt-4o | ✅ Excellent | $5 / $15 |
| Anthropic | claude-haiku-4 | ✅ Very Good | $0.80 / $4 |
| Anthropic | claude-sonnet-4-5 | ✅ Very Good | $3 / $15 |

**Recommended**: Whisper + GPT-4o mini (best value)

## 🛣️ Roadmap

### Phase 1: Core Backend ✅
- [x] FastAPI setup
- [x] Database schema
- [x] File upload endpoint
- [x] Transcription integration
- [x] API endpoints

### Phase 2: Frontend Foundation (Current)
- [ ] Next.js setup
- [ ] Monday.com design system
- [ ] RTL support
- [ ] Basic components
- [ ] File upload UI

### Phase 3: Transcription Flow
- [ ] Upload page
- [ ] Status polling
- [ ] Results display
- [ ] Speaker editor

### Phase 4: Summary & Chat
- [ ] Summary display
- [ ] Action items
- [ ] Chat interface
- [ ] Chat history

### Phase 5: Settings & Models
- [ ] Settings page
- [ ] API key management
- [ ] Model selection
- [ ] Connection testing

### Phase 6: Polish & Testing
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsive
- [ ] User testing
- [ ] Performance optimization

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💡 Support

For issues and questions:
- Open an issue on GitHub
- Check the [Backend README](./backend/README.md) for backend-specific issues
- Check the [Frontend README](./frontend/README.md) for frontend-specific issues
