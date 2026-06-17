-- ============================================================
-- AIUB Shoutbox — Phase 3 Migration: Admin System
-- Run in Supabase SQL editor AFTER schema.sql
-- ============================================================

-- Add is_admin column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- ADMIN RLS POLICIES
-- ============================================================

-- Admins can update any user (ban/unban, grant admin)
CREATE POLICY "users_admin_update" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Admins can select all reports
CREATE POLICY "reports_admin_select" ON public.reports
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Admins can update report status
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Admins can soft-delete any message
CREATE POLICY "messages_admin_update" ON public.messages
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- ADMIN FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_reports(
  p_status TEXT DEFAULT 'pending',
  p_limit  INT  DEFAULT 50
)
RETURNS TABLE (
  report_id               UUID,
  report_reason           TEXT,
  report_details          TEXT,
  report_status           TEXT,
  report_created_at       TIMESTAMPTZ,
  message_id              UUID,
  message_content         TEXT,
  message_created_at      TIMESTAMPTZ,
  reporter_nickname       TEXT,
  message_author_nickname TEXT,
  message_author_id       UUID
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.reason,
    r.details,
    r.status,
    r.created_at,
    m.id,
    m.content,
    m.created_at,
    u_reporter.nickname,
    u_author.nickname,
    m.user_id
  FROM public.reports r
  JOIN public.messages m       ON r.message_id   = m.id
  JOIN public.users u_reporter ON r.reporter_id  = u_reporter.id
  JOIN public.users u_author   ON m.user_id      = u_author.id
  WHERE r.status = p_status
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  total_users     BIGINT,
  total_messages  BIGINT,
  pending_reports BIGINT,
  banned_users    BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM public.users),
    (SELECT COUNT(*)::BIGINT FROM public.messages WHERE is_deleted = FALSE),
    (SELECT COUNT(*)::BIGINT FROM public.reports  WHERE status = 'pending'),
    (SELECT COUNT(*)::BIGINT FROM public.users    WHERE is_banned = TRUE);
END;
$$;

-- Drop old conflicting UPDATE policy if it exists (schema.sql has one without admin override)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_update_own'
  ) THEN
    DROP POLICY "messages_update_own" ON public.messages;
  END IF;
END;
$$;

-- Re-enable select on reports for own reports (may not exist yet)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'reports_own_select'
  ) THEN
    EXECUTE 'CREATE POLICY "reports_own_select" ON public.reports FOR SELECT USING (reporter_id = auth.uid())';
  END IF;
END;
$$;
