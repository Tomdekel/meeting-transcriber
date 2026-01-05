# Tami - Testing Guide

Complete guide to setting up and testing both backend and frontend together.

## Prerequisites

- ✅ Python 3.11+ installed
- ✅ Node.js 18+ and npm installed
- ✅ Docker and Docker Compose installed
- ✅ OpenAI API key ready

## Step 1: Start PostgreSQL Database

```bash
cd /Users/tomdekel/meeting-transcriber/tami

# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker-compose ps
```

You should see:
```
NAME                SERVICE    STATUS
tami-postgres       postgres   running
```

## Step 2: Set Up Backend

### 2.1 Create Virtual Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows
```

### 2.2 Install Dependencies

```bash
pip install -r requirements.txt
```

This may take a few minutes.

### 2.3 Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use any text editor
```

Update these values in `.env`:
```bash
DATABASE_URL=postgresql://tami:tami@localhost:5432/tami
SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32
DEBUG=True
```

### 2.4 Initialize Database

```bash
# Generate Prisma client
prisma generate --schema=../shared/prisma/schema.prisma

# Create database tables
prisma db push --schema=../shared/prisma/schema.prisma
```

You should see:
```
✔ Database schema created successfully
```

### 2.5 Start Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend is now running at: **http://localhost:8000**

Test it:
```bash
# In a new terminal
curl http://localhost:8000/health
```

Should return: `{"status":"healthy"}`

## Step 3: Set Up Frontend

**Open a new terminal** (keep backend running)

### 3.1 Install Dependencies

```bash
cd /Users/tomdekel/meeting-transcriber/tami/frontend

# Dependencies are already installed, but if needed:
npm install
```

### 3.2 Configure Environment

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit if needed (default should work)
nano .env.local
```

Default values:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USER_ID=test-user-1
```

### 3.3 Start Frontend Server

```bash
npm run dev
```

Frontend is now running at: **http://localhost:3000**

## Step 4: Test the Application

### 4.1 Open the Application

1. Open your browser
2. Go to: **http://localhost:3000**
3. You should see the Tami home page in Hebrew

### 4.2 Test File Upload

1. Click **"התחל תמלול"** (Start Transcription)
2. You should see the upload page
3. Try uploading a test audio file:
   - You can use `/Users/tomdekel/meeting-transcriber/src/transcription/Ori AUI 2.m4a`
   - Or any other audio file (.m4a, .mp3, .wav, etc.)

### 4.3 Expected Behavior

**Upload Flow:**
1. Drag-and-drop or click to select audio file
2. File info appears (name, size)
3. Enter meeting context in the text area
4. Click **"התחל תמלול"** button
5. Progress bar shows upload progress
6. After upload, you're redirected to session page (in progress)

**Note:** The session page is not yet built (Phase 3), so you might see a 404 error after successful upload. This is expected.

### 4.4 Check Backend Logs

In the backend terminal, you should see:
```
INFO:     POST /api/upload HTTP/1.1" 200 OK
INFO:     POST /api/transcribe HTTP/1.1" 200 OK
INFO:     Created session {session_id} for transcription
INFO:     Processing transcription for session {session_id}
```

### 4.5 Verify in Database

```bash
# Open Prisma Studio (in backend directory with venv activated)
cd backend
prisma studio --schema=../shared/prisma/schema.prisma
```

This opens a web UI at http://localhost:5555 where you can:
- View all sessions
- See transcription progress
- Check transcript segments
- View summaries and chat messages

## Step 5: API Testing (Optional)

### 5.1 Interactive API Docs

Visit: **http://localhost:8000/docs**

This opens Swagger UI where you can:
- See all API endpoints
- Test endpoints directly
- View request/response schemas

### 5.2 Test API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# List sessions
curl http://localhost:8000/api/sessions

# Get specific session (replace SESSION_ID)
curl http://localhost:8000/api/sessions/SESSION_ID
```

## Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError: No module named 'prisma'`

**Solution:**
```bash
cd backend
source venv/bin/activate
pip install prisma
prisma generate --schema=../shared/prisma/schema.prisma
```

**Problem:** `Database connection error`

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart if needed
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

**Problem:** `Import errors from src module`

**Solution:**
The backend services import from the existing CLI tool at `../src`. Make sure the path is correct:
```bash
# From backend directory
ls ../../src  # Should show: audio, chat, cli, etc.
```

### Frontend Issues

**Problem:** `Module not found` errors

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Problem:** API connection refused

**Solution:**
1. Check backend is running: `curl http://localhost:8000/health`
2. Check `.env.local` has correct API URL
3. Check CORS settings in `backend/app/core/config.py`

**Problem:** Next.js build errors

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Database Issues

**Problem:** Port 5432 already in use

**Solution:**
```bash
# Find process using port
lsof -i :5432

# Stop existing PostgreSQL
brew services stop postgresql  # macOS
sudo service postgresql stop   # Linux

# Or use different port in docker-compose.yml
```

## Current Limitations

### What Works
✅ Backend API fully functional
✅ File upload endpoint
✅ Transcription with Whisper
✅ Summary generation with GPT-4o mini
✅ Speaker labeling
✅ Database storage
✅ Frontend home page
✅ Upload UI with drag-and-drop
✅ Context input form

### What's Not Yet Implemented (Phase 3-6)
❌ Session detail page to view results
❌ TranscriptViewer component
❌ SpeakerEditor to rename speakers
❌ ChatBox for Q&A
❌ SummaryCard display
❌ Settings page for API keys
❌ Real-time status polling

## Next Steps

After confirming everything works:

### Phase 3: Build Session Detail Page
- Display transcription results
- Show transcript with speaker labels
- Allow editing speaker names
- Show transcription status

### Phase 4: Add Summary & Chat
- Display meeting summary
- Show action items
- Implement chat interface
- Save chat history

### Phase 5: Settings Page
- API key management UI
- Model selection
- Test connection feature

### Phase 6: Polish
- Error handling
- Loading states
- Mobile responsive
- Accessibility
- Performance

## Testing Checklist

- [ ] PostgreSQL starts successfully
- [ ] Backend starts without errors
- [ ] Health check endpoint responds
- [ ] API docs accessible at /docs
- [ ] Frontend starts successfully
- [ ] Home page loads in Hebrew
- [ ] Upload page accessible
- [ ] File upload UI works
- [ ] File validation works (try invalid file)
- [ ] Context input works
- [ ] Submit button triggers upload
- [ ] Backend receives upload
- [ ] Session created in database
- [ ] Transcription starts (check logs)

## Running in Production

**Backend:**
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

Or deploy to:
- Backend: Railway, Render, AWS, Google Cloud
- Frontend: Vercel, Netlify
- Database: Neon, Supabase, AWS RDS

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review backend logs for errors
3. Check browser console for frontend errors
4. Verify database connection with Prisma Studio
5. Test API endpoints with curl or /docs

## Summary

You now have:
- ✅ Complete backend with FastAPI + PostgreSQL
- ✅ Complete frontend foundation with Next.js + RTL
- ✅ File upload flow working end-to-end
- ✅ Integration between frontend and backend
- ✅ Monday.com-inspired design in Hebrew

Ready to build Phase 3: Session detail page! 🚀
