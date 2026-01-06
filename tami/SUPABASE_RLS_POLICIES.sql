-- ============================================================================
-- Tami - Complete Row Level Security Policies for Supabase
-- ============================================================================
-- IMPORTANT: This assumes:
--   1. Using Supabase Auth (auth.uid() returns UUID)
--   2. User.id and Session.userId are UUID columns (NOT text)
--   3. Prisma schema uses @default(uuid())
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transcript" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranscriptSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Summary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- User Table Policies
-- ============================================================================
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users are created by Supabase Auth, so no INSERT policy needed for app
-- If you need users to be able to create their own records:
-- CREATE POLICY "Users can create own profile" ON "User"
--   FOR INSERT
--   WITH CHECK (auth.uid() = id);

-- ============================================================================
-- UserSettings Table Policies
-- ============================================================================
CREATE POLICY "Users can view own settings" ON "UserSettings"
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own settings" ON "UserSettings"
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own settings" ON "UserSettings"
  FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can delete own settings" ON "UserSettings"
  FOR DELETE
  USING (auth.uid() = "userId");

-- ============================================================================
-- Session Table Policies
-- ============================================================================
CREATE POLICY "Users can view own sessions" ON "Session"
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can create own sessions" ON "Session"
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own sessions" ON "Session"
  FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can delete own sessions" ON "Session"
  FOR DELETE
  USING (auth.uid() = "userId");

-- ============================================================================
-- Transcript Table Policies (via Session ownership)
-- ============================================================================
CREATE POLICY "Users can view own transcripts" ON "Transcript"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create own transcripts" ON "Transcript"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can update own transcripts" ON "Transcript"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transcripts" ON "Transcript"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

-- ============================================================================
-- TranscriptSegment Table Policies (via Transcript -> Session ownership)
-- ============================================================================
CREATE POLICY "Users can view own transcript segments" ON "TranscriptSegment"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create own transcript segments" ON "TranscriptSegment"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can update own transcript segments" ON "TranscriptSegment"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transcript segments" ON "TranscriptSegment"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()
    )
  );

-- ============================================================================
-- Summary Table Policies (via Session ownership)
-- ============================================================================
CREATE POLICY "Users can view own summaries" ON "Summary"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create own summaries" ON "Summary"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can update own summaries" ON "Summary"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can delete own summaries" ON "Summary"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

-- ============================================================================
-- ActionItem Table Policies (via Summary -> Session ownership)
-- ============================================================================
CREATE POLICY "Users can view own action items" ON "ActionItem"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create own action items" ON "ActionItem"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can update own action items" ON "ActionItem"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can delete own action items" ON "ActionItem"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()
    )
  );

-- ============================================================================
-- ChatMessage Table Policies (via Session ownership)
-- ============================================================================
CREATE POLICY "Users can view own chat messages" ON "ChatMessage"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create own chat messages" ON "ChatMessage"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can update own chat messages" ON "ChatMessage"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can delete own chat messages" ON "ChatMessage"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()
    )
  );

-- ============================================================================
-- Verification Queries (Run these to test your policies)
-- ============================================================================
-- After enabling RLS, verify policies are active:
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- To test as a specific user (replace with actual user ID):
-- SET request.jwt.claim.sub = 'user-uuid-here';
-- SELECT * FROM "Session"; -- Should only show that user's sessions
