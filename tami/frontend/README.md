# Tami Frontend

Modern Next.js frontend for the Tami meeting transcription application with Monday.com-inspired design and full Hebrew RTL support.

## Features

- 🎨 Monday.com-inspired design language
- 🌐 Full Hebrew RTL (right-to-left) support
- 📤 Drag-and-drop file upload
- ⚡ Real-time transcription status updates
- 💬 Interactive chat interface
- 📱 Responsive design for mobile and desktop
- ♿ Accessible UI components

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with RTL support
- **State Management**: Zustand
- **Data Fetching**: Axios + React Query
- **Components**: Custom components with shadcn/ui patterns
- **Animations**: Framer Motion

## Prerequisites

- Node.js 18+ and npm
- Backend API running on http://localhost:8000 (or configure different URL)

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local if needed
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development

```bash
# Start development server
npm run dev
```

Visit http://localhost:3000

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout with RTL support
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles + Monday.com tokens
│   ├── transcribe/
│   │   └── page.tsx         # Upload & transcription page
│   ├── session/
│   │   └── [id]/
│   │       └── page.tsx     # Session detail view (TODO)
│   └── settings/
│       └── page.tsx         # Settings page (TODO)
├── components/
│   ├── FileUpload.tsx       # Drag-drop file upload
│   ├── TranscriptViewer.tsx # Transcript display (TODO)
│   ├── SpeakerEditor.tsx    # Speaker name editor (TODO)
│   ├── ChatBox.tsx          # Chat interface (TODO)
│   ├── SummaryCard.tsx      # Summary display (TODO)
│   └── ActionItems.tsx      # Action items list (TODO)
├── lib/
│   ├── api.ts               # API client
│   └── utils.ts             # Utility functions
├── public/                  # Static assets
├── package.json
├── tailwind.config.ts       # Tailwind + RTL configuration
├── tsconfig.json
└── next.config.js
```

## Key Components

### FileUpload

Drag-and-drop or click-to-select file upload component.

```tsx
import FileUpload from "@/components/FileUpload";

<FileUpload
  onUpload={(file) => console.log(file)}
  maxSize={100 * 1024 * 1024} // 100MB
/>
```

### API Client

TypeScript API client for backend communication.

```tsx
import { uploadFile, startTranscription } from "@/lib/api";

// Upload file
const uploadResponse = await uploadFile(file);

// Start transcription
const result = await startTranscription({
  uploadId: uploadResponse.uploadId,
  context: "Meeting context",
});
```

## Styling Guide

### Monday.com Design Tokens

```css
/* Primary Colors */
--primary: #0085FF (Monday blue)
--success: #00CA72
--warning: #FFCB00
--error: #E44258

/* Neutral Colors */
--background: #F6F7FB
--surface: #FFFFFF
--text-primary: #323338
--text-secondary: #676879
```

### CSS Classes

```tsx
// Buttons
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>

// Cards
<div className="card">Card content</div>

// Inputs
<input className="input" />
```

### RTL Support

Use logical properties for RTL support:

```tsx
// ❌ Don't use
className="ml-4"  // margin-left

// ✅ Use instead
className="ms-4"  // margin-inline-start (right in RTL, left in LTR)
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |
| `NEXT_PUBLIC_USER_ID` | User ID for testing | `test-user-1` |

## Fonts

- **Inter**: Primary font for English and UI elements
- **Rubik**: Hebrew font with excellent rendering
- **JetBrains Mono**: Monospace font for code

Fonts are loaded via `next/font/google` for optimal performance.

## RTL (Right-to-Left) Support

The application is fully RTL-compatible:

- HTML `dir="rtl"` attribute
- Tailwind RTL plugin for automatic direction flipping
- Logical CSS properties (start/end instead of left/right)
- Proper text alignment for Hebrew content
- Mirrored icons and layouts where appropriate

## To-Do

### Phase 3: Transcription Flow
- [ ] Session detail page
- [ ] Status polling component
- [ ] TranscriptViewer component
- [ ] SpeakerEditor component

### Phase 4: Summary & Chat
- [ ] SummaryCard component
- [ ] ActionItems component
- [ ] ChatBox component with streaming
- [ ] Chat history display

### Phase 5: Settings
- [ ] Settings page
- [ ] API key management UI
- [ ] Model selection dropdowns
- [ ] Connection test interface

### Phase 6: Polish
- [ ] Error boundaries
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Mobile navigation
- [ ] Accessibility improvements
- [ ] Performance optimization

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT
