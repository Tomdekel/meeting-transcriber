# Tami SaaS Deployment Guide

This guide will help you deploy Tami as a production SaaS application.

## Prerequisites

- Supabase account (free tier available)
- Vercel account (free tier available)
- GitHub repository
- Domain name (optional)

## Phase 1: Infrastructure Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - Project name: `tami-production`
   - Database password: (generate strong password)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 1.2 Configure Google OAuth in Supabase

1. In Supabase dashboard, go to **Authentication > Providers**
2. Find **Google** and enable it
3. Get Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google+ API
   - Go to Credentials > Create Credentials > OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase Google provider settings
5. Save configuration

### 1.3 Create Supabase Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **New Bucket**
3. Bucket name: `meeting-audio-files`
4. **Public bucket**: OFF (keep private)
5. File size limit: 100MB
6. Allowed MIME types: `audio/*`
7. Create bucket

### 1.4 Get Supabase Credentials

From your Supabase project settings:
1. Go to **Settings > API**
2. Copy these values (you'll need them for Vercel):
   - Project URL (e.g., `https://abcdefgh.supabase.co`)
   - Anon (public) key
   - Service role (secret) key
3. Go to **Settings > API > JWT Settings**
4. Copy JWT Secret

### 1.5 Run Database Migration (Create Tables First!)

**IMPORTANT**: Create tables BEFORE applying RLS policies

```bash
cd /Users/tomdekel/meeting-transcriber/tami/shared

# Set your Supabase database URL (get from Step 1.4)
export DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres"

# Generate Prisma client
npx prisma generate

# Create all tables in Supabase
npx prisma db push
```

You should see output like:
```
✔ Generated Prisma Client
🚀 Your database is now in sync with your Prisma schema.
```

### 1.6 Set Up Row Level Security (RLS)

**NOW** apply RLS policies (after tables exist):

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the **entire contents** of `SUPABASE_RLS_POLICIES.sql` from root directory
4. Review the query and click **Run**

The SQL file includes:

- ✅ Complete policies for ALL 8 tables (no "similar policies" shortcuts)
- ✅ Proper `WITH CHECK` clauses for INSERT operations
- ✅ Correct UUID type comparison (no `::text` casts)
- ✅ All CRUD operations covered (SELECT, INSERT, UPDATE, DELETE)
- ✅ Cascading ownership checks for related tables
- ✅ Verification queries included

**Key fixes from initial version:**
- Removed incorrect `::text` casting (auth.uid() is already UUID)
- Added explicit `WITH CHECK` for all INSERT policies
- Created complete policies for TranscriptSegment, ActionItem, etc.
- Fixed UserSettings and ChatMessage to use proper operation types

5. Verify RLS is enabled: Run this query in SQL Editor:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see ~32 policies (4 per table × 8 tables)

### 1.7 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New > Project**
3. Import your GitHub repository
4. **Root Directory**: Leave empty (monorepo detected automatically)
5. **Framework Preset**: Next.js
6. Click **Deploy** (it will fail first time - that's OK, we'll configure it next)

## Phase 2: Configure Environment Variables

### 2.1 Frontend Environment Variables (Vercel)

In Vercel project settings:
1. Go to **Settings > Environment Variables**
2. Add these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
```

### 2.2 Backend Environment Variables (Vercel)

Add these to the same Vercel project:

```bash
# Database
DATABASE_URL=postgresql://postgres:YOUR-DB-PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Security (generate with: openssl rand -hex 32)
SECRET_KEY=your-generated-secret-key
ENCRYPTION_KEY=your-generated-encryption-key

# CORS
CORS_ORIGINS=https://your-app.vercel.app

# API Keys (optional)
OPENAI_API_KEY=
IVRIT_API_KEY=
IVRIT_ENDPOINT_ID=
```

## Phase 3: Database Migration

Run database migration to apply schema changes:

```bash
cd tami/shared
DATABASE_URL="postgresql://..." npx prisma migrate dev --name add_auth_support
npx prisma generate
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

## Phase 4: Deploy

### 4.1 Redeploy in Vercel

1. Go to your Vercel project
2. Click **Deployments**
3. Click on the failed deployment > **Redeploy**
4. Wait for deployment to complete

### 4.2 Verify Deployment

1. Visit your Vercel URL
2. You should see the Tami landing page
3. Click "Sign in with Google"
4. Complete OAuth flow
5. You should be redirected to `/transcribe`
6. Try uploading an audio file

## Phase 5: Post-Launch

### 5.1 Configure Supabase Email Templates

1. Go to Supabase **Authentication > Email Templates**
2. Customize confirmation, recovery, and invite emails with your branding

### 5.2 Set Up Monitoring

- **Vercel**: Built-in analytics in dashboard
- **Supabase**: Database health in dashboard
- **UptimeRobot**: Set up free uptime monitoring

### 5.3 Custom Domain (Optional)

1. Buy domain from Namecheap, Google Domains, etc.
2. In Vercel: **Settings > Domains**
3. Add your domain
4. Update DNS records as instructed
5. Update `CORS_ORIGINS` and `NEXT_PUBLIC_API_URL` in Vercel env vars
6. Update Google OAuth redirect URLs

## Troubleshooting

### Issue: 401 Unauthorized on API calls

- Check that `SUPABASE_JWT_SECRET` is correctly set in backend env vars
- Verify user is logged in (check browser dev tools > Application > Cookies)
- Check that auth interceptor is working (Network tab should show Authorization header)

### Issue: CORS errors

- Verify `CORS_ORIGINS` includes your Vercel domain
- Check Vercel deployment logs for backend errors
- Ensure both frontend and backend are deployed

### Issue: Database connection failed

- Verify `DATABASE_URL` is correct
- Check Supabase project is not paused
- Ensure database migrations have been run

### Issue: File upload fails

- Check Supabase Storage bucket exists and is named correctly
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check file size is under 100MB

## Cost Estimates

**Free Tier (0-500 users):**
- Supabase: Free (500MB DB, 1GB storage, 2GB bandwidth)
- Vercel: Free (100GB bandwidth, serverless functions)
- **Total: $0/month**

**Growing (500-5000 users):**
- Supabase Pro: $25/month (8GB DB, 100GB storage)
- Vercel Pro: $20/month (1TB bandwidth)
- **Total: $45/month**

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase database logs
3. Review browser console for frontend errors
4. Verify all environment variables are set correctly
