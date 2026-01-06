-- ============================================================================
-- Tami - Row Level Security Policies for Supabase - VERSION 2
-- Fixed for TEXT ID columns (Prisma String type with @default(uuid()))
-- ============================================================================
-- IMPORTANT: This version uses auth.uid()::text casting because:
--   1. Prisma String type creates TEXT columns in PostgreSQL
--   2. Supabase auth.uid() returns UUID type
--   3. We must cast UUID to TEXT for comparison
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
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ============================================================================
-- UserSettings Table Policies
-- ============================================================================
CREATE POLICY "Users can view own settings" ON "UserSettings"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own settings" ON "UserSettings"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own settings" ON "UserSettings"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own settings" ON "UserSettings"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- ============================================================================
-- Session Table Policies
-- ============================================================================
CREATE POLICY "Users can view own sessions" ON "Session"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own sessions" ON "Session"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own sessions" ON "Session"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own sessions" ON "Session"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- ============================================================================
-- Transcript Table Policies (via Session ownership)
-- ============================================================================
CREATE POLICY "Users can view own transcripts" ON "Transcript"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own transcripts" ON "Transcript"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own transcripts" ON "Transcript"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own transcripts" ON "Transcript"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Transcript"."sessionId"
      AND "Session"."userId" = auth.uid()::text
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
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own transcript segments" ON "TranscriptSegment"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own transcript segments" ON "TranscriptSegment"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own transcript segments" ON "TranscriptSegment"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Transcript"
      INNER JOIN "Session" ON "Session".id = "Transcript"."sessionId"
      WHERE "Transcript".id = "TranscriptSegment"."transcriptId"
      AND "Session"."userId" = auth.uid()::text
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
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own summaries" ON "Summary"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own summaries" ON "Summary"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own summaries" ON "Summary"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Summary"."sessionId"
      AND "Session"."userId" = auth.uid()::text
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
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own action items" ON "ActionItem"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own action items" ON "ActionItem"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own action items" ON "ActionItem"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Summary"
      INNER JOIN "Session" ON "Session".id = "Summary"."sessionId"
      WHERE "Summary".id = "ActionItem"."summaryId"
      AND "Session"."userId" = auth.uid()::text
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
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own chat messages" ON "ChatMessage"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own chat messages" ON "ChatMessage"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own chat messages" ON "ChatMessage"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "ChatMessage"."sessionId"
      AND "Session"."userId" = auth.uid()::text
    )
  );

-- ============================================================================
-- Verification Queries (Run these after applying policies)
-- ============================================================================
-- After enabling RLS, verify policies are active:
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- You should see 30 policies (User has 2, all others have 4 each)
