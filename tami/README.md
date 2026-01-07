# Tami - תמי | Hebrew Meeting Transcriber

A modern web application for recording, transcribing, and summarizing meetings in Hebrew. Built with Next.js, FastAPI, Supabase, and deployed on Vercel.

**Live Demo:** [https://frontend-delta-ten-62.vercel.app](https://frontend-delta-ten-62.vercel.app)

## Features

- **Live Recording**: Record meetings directly in the browser
  - Room mode: Record via microphone for in-person meetings
  - Online mode: Capture system audio from Zoom/Meet calls
- **File Upload**: Upload existing audio recordings (MP3, M4A, WAV, WebM)
- **Hebrew Transcription**: Powered by Ivrit.ai for accurate Hebrew speech-to-text
- **AI Summaries**: GPT-4o mini generates meeting summaries, key points, and action items
- **Interactive Chat**: Ask questions about your meeting content
- **Speaker Diarization**: Automatic speaker detection with editable names
- **RTL Design**: Full Hebrew right-to-left layout with modern UI

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                             │
│                    (Next.js 14 on Vercel)                           │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Record     │  │   Upload     │  │   Session    │               │
│  │   Meeting    │  │   Audio      │  │   View       │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│         └────────────┬────┴────────────────┘                        │
│                      │                                               │
└──────────────────────┼───────────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         BACKEND API                                   │
│                    (FastAPI on Vercel)                               │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │  /upload   │  │/transcribe │  │ /sessions  │  │   /chat    │     │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │
│        │               │               │               │             │
└────────┼───────────────┼───────────────┼───────────────┼─────────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Supabase   │  │  Ivrit.ai   │  │  Supabase   │  │   OpenAI    │
│  Storage    │  │ Transcribe  │  │  Postgres   │  │   GPT-4o    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

## Full Pipeline

### 1. Recording/Upload Flow

```
User starts recording
        │
        ▼
┌───────────────────────┐
│  Browser MediaRecorder │
│  (WebM/Opus format)    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  POST /api/upload     │
│  - Validates file     │
│  - Uploads to Supabase│
│    Storage bucket     │
│  - Returns uploadId   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ POST /api/transcribe  │
│  - Creates session    │
│  - Queues job         │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Background Worker    │
│  (Cron job)           │
│  - Fetches audio      │
│  - Calls Ivrit.ai API │
│  - Processes result   │
│  - Calls GPT-4o mini  │
│  - Saves transcript   │
│  - Saves summary      │
└───────────────────────┘
```

### 2. Transcription Pipeline

```
Audio File (WebM/MP3/M4A)
        │
        ▼
┌───────────────────────┐
│   Ivrit.ai Whisper    │
│   - Hebrew-optimized  │
│   - Speaker diarize   │
│   - Timestamps        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   GPT-4o Refinement   │
│   - Fix transcription │
│     errors            │
│   - Context-aware     │
│   - Hebrew cleanup    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   GPT-4o mini Summary │
│   - Overview          │
│   - Key points        │
│   - Action items      │
│   - Decisions         │
└───────────────────────┘
```

### 3. Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE POSTGRES                        │
│                                                              │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │   Session   │──────│ Transcript  │──────│   Segment   │ │
│  │             │      │             │      │   (lines)   │ │
│  └─────────────┘      └─────────────┘      └─────────────┘ │
│        │                                                    │
│        │              ┌─────────────┐      ┌─────────────┐ │
│        └──────────────│   Summary   │──────│ ActionItem  │ │
│                       │             │      │             │ │
│                       └─────────────┘      └─────────────┘ │
│                                                             │
│  ┌─────────────┐      ┌─────────────┐                      │
│  │    User     │──────│   Job       │  (background tasks)  │
│  │ (Supabase   │      │   Queue     │                      │
│  │    Auth)    │      │             │                      │
│  └─────────────┘      └─────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Supabase Auth
- **State**: React hooks
- **HTTP**: Axios
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11
- **Database**: Supabase PostgreSQL (via Prisma)
- **Storage**: Supabase Storage
- **Auth**: Supabase JWT verification
- **Deployment**: Vercel Serverless Functions

### External Services
- **Transcription**: Ivrit.ai (Hebrew Whisper)
- **AI/LLM**: OpenAI GPT-4o, GPT-4o mini
- **Auth & DB**: Supabase
- **Hosting**: Vercel

## Project Structure

```
tami/
├── frontend/                 # Next.js application
│   ├── app/                  # App Router pages
│   │   ├── conversations/    # Main conversation flow
│   │   │   ├── new/          # New recording/upload
│   │   │   └── page.tsx      # List all conversations
│   │   ├── session/[id]/     # Session detail view
│   │   ├── login/            # Auth pages
│   │   ├── signup/
│   │   └── page.tsx          # Landing page
│   ├── components/           # React components
│   ├── lib/                  # Utilities
│   │   ├── api.ts            # API client
│   │   ├── auth-context.tsx  # Auth provider
│   │   └── supabase.ts       # Supabase client
│   └── package.json
│
├── backend/                  # FastAPI application
│   ├── api/                  # Vercel serverless handlers
│   │   └── index.py          # Main entry point
│   ├── app/                  # Application code
│   │   ├── main.py           # FastAPI app
│   │   ├── routers/          # API routes
│   │   │   ├── upload.py
│   │   │   ├── transcription.py
│   │   │   ├── sessions.py
│   │   │   └── chat.py
│   │   └── services/         # Business logic
│   │       ├── ivrit_transcription.py
│   │       ├── transcript_refinement.py
│   │       └── summary.py
│   ├── lib/                  # Shared utilities
│   │   ├── prisma.py         # Database client
│   │   └── supabase.py       # Supabase client
│   ├── requirements.txt
│   └── vercel.json
│
├── shared/                   # Shared resources
│   └── prisma/
│       └── schema.prisma     # Database schema
│
└── README.md
```

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000  # Optional, auto-detects in prod
```

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# AI Services
OPENAI_API_KEY=sk-...
IVRIT_API_KEY=...
RUNPOD_API_KEY=...

# Security
JWT_SECRET=your-jwt-secret
```

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- OpenAI API key
- Ivrit.ai API key

### 1. Clone Repository
```bash
git clone https://github.com/Tomdekel/meeting-transcriber.git
cd meeting-transcriber/tami
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
prisma generate --schema=../shared/prisma/schema.prisma

# Start server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Deployment

### Vercel Deployment

Both frontend and backend are deployed on Vercel:

**Frontend:**
```bash
cd frontend
vercel deploy --prod
```

**Backend:**
```bash
cd backend
vercel deploy --prod
```

### Production URLs
- Frontend: https://frontend-delta-ten-62.vercel.app
- Backend: https://backend-seven-brown-94.vercel.app

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload audio file |
| `/api/transcribe` | POST | Start transcription job |
| `/api/transcribe/{id}/status` | GET | Get job status |
| `/api/sessions` | GET | List user sessions |
| `/api/sessions/{id}` | GET | Get session details |
| `/api/sessions/{id}` | PATCH | Update session |
| `/api/sessions/{id}` | DELETE | Delete session |
| `/api/sessions/{id}/speakers` | PATCH | Update speaker names |
| `/api/chat` | POST | Send chat message |
| `/api/cron/process-jobs` | POST | Process pending jobs |

## Database Schema

```prisma
model Session {
  id            String      @id @default(uuid())
  userId        String
  title         String?
  audioFileName String
  audioFileUrl  String
  context       String
  language      String      @default("he")
  status        String      @default("pending")
  transcript    Transcript?
  summary       Summary?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model Transcript {
  id        String    @id @default(uuid())
  sessionId String    @unique
  session   Session   @relation(...)
  language  String
  duration  Float?
  segments  Segment[]
}

model Summary {
  id          String       @id @default(uuid())
  sessionId   String       @unique
  session     Session      @relation(...)
  overview    String
  keyPoints   String[]
  actionItems ActionItem[]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

For issues and questions, open a GitHub issue or contact the maintainers.
