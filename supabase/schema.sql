-- ============================================================
-- AIUB Shoutbox — Complete Database Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.users (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL UNIQUE,
  nickname        TEXT        NOT NULL UNIQUE,
  nickname_color  TEXT        NOT NULL DEFAULT '#60A5FA',
  avatar_seed     TEXT        NOT NULL DEFAULT '',
  is_banned       BOOLEAN     NOT NULL DEFAULT FALSE,
  ban_reason      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  parent_id   UUID        REFERENCES public.messages(id) ON DELETE CASCADE,
  is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji       TEXT        NOT NULL CHECK (emoji IN ('👍', '🔥', '😂', '💀', '❤️')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_reaction UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE public.reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reporter_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason      TEXT        NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'personal_info', 'other')),
  details     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_report UNIQUE (message_id, reporter_id)
);

CREATE TABLE public.online_presence (
  user_id    UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_typing  BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_messages_created_at   ON public.messages(created_at DESC);
CREATE INDEX idx_messages_parent_id    ON public.messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_messages_user_id      ON public.messages(user_id);
CREATE INDEX idx_messages_content_trgm ON public.messages USING GIN(content gin_trgm_ops);
CREATE INDEX idx_reactions_message_id  ON public.reactions(message_id);
CREATE INDEX idx_reactions_user_id     ON public.reactions(user_id);
CREATE INDEX idx_reports_message_id    ON public.reports(message_id);
CREATE INDEX idx_presence_last_seen    ON public.online_presence(last_seen DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_presence ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_select_public"  ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert_own"     ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own"     ON public.users FOR UPDATE USING (auth.uid() = id);

-- Messages
CREATE POLICY "messages_select_public" ON public.messages FOR SELECT USING (true);
CREATE POLICY "messages_insert_auth"   ON public.messages FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_banned = FALSE)
);
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE USING (auth.uid() = user_id);

-- Reactions
CREATE POLICY "reactions_select_public" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_auth"   ON public.reactions FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_banned = FALSE)
);
CREATE POLICY "reactions_delete_own" ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- Reports
CREATE POLICY "reports_insert_auth"  ON public.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);
CREATE POLICY "reports_select_own"   ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- Online presence
CREATE POLICY "presence_select_public" ON public.online_presence FOR SELECT USING (true);
CREATE POLICY "presence_all_own"       ON public.online_presence FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Rate limit: max p_limit messages per p_window_seconds
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id        UUID,
  p_limit          INT  DEFAULT 5,
  p_window_seconds INT  DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.messages
  WHERE user_id = p_user_id
    AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL
    AND is_deleted = FALSE;
  RETURN v_count < p_limit;
END;
$$;

-- Online count: users seen in last 2 minutes
CREATE OR REPLACE FUNCTION public.get_online_count()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.online_presence
  WHERE last_seen > NOW() - INTERVAL '2 minutes';
  RETURN v_count;
END;
$$;

-- Upsert online presence
CREATE OR REPLACE FUNCTION public.upsert_presence(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.online_presence (user_id, last_seen)
  VALUES (p_user_id, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET last_seen = NOW(), is_typing = FALSE;
END;
$$;

-- Paginated messages with user info and aggregated reactions
CREATE OR REPLACE FUNCTION public.get_messages(
  p_limit  INT         DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NOW(),
  p_search TEXT        DEFAULT NULL
)
RETURNS TABLE (
  id             UUID,
  content        TEXT,
  parent_id      UUID,
  created_at     TIMESTAMPTZ,
  user_id        UUID,
  nickname       TEXT,
  nickname_color TEXT,
  reply_count    BIGINT,
  reactions      JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.parent_id,
    m.created_at,
    m.user_id,
    u.nickname,
    u.nickname_color,
    (SELECT COUNT(*) FROM public.messages r WHERE r.parent_id = m.id AND r.is_deleted = FALSE)::BIGINT,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('emoji', rx.emoji, 'count', rx.cnt, 'user_ids', rx.user_ids)
      ) FILTER (WHERE rx.emoji IS NOT NULL),
      '[]'::jsonb
    )
  FROM public.messages m
  JOIN public.users u ON m.user_id = u.id
  LEFT JOIN (
    SELECT message_id, emoji,
           COUNT(*)::BIGINT AS cnt,
           jsonb_agg(user_id) AS user_ids
    FROM public.reactions
    GROUP BY message_id, emoji
  ) rx ON rx.message_id = m.id
  WHERE m.parent_id IS NULL
    AND m.is_deleted = FALSE
    AND m.created_at < p_before
    AND (p_search IS NULL OR m.content ILIKE '%' || p_search || '%')
  GROUP BY m.id, u.nickname, u.nickname_color
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Replies for a message
CREATE OR REPLACE FUNCTION public.get_replies(p_parent_id UUID)
RETURNS TABLE (
  id             UUID,
  content        TEXT,
  parent_id      UUID,
  created_at     TIMESTAMPTZ,
  user_id        UUID,
  nickname       TEXT,
  nickname_color TEXT,
  reactions      JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.parent_id,
    m.created_at,
    m.user_id,
    u.nickname,
    u.nickname_color,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('emoji', rx.emoji, 'count', rx.cnt, 'user_ids', rx.user_ids)
      ) FILTER (WHERE rx.emoji IS NOT NULL),
      '[]'::jsonb
    )
  FROM public.messages m
  JOIN public.users u ON m.user_id = u.id
  LEFT JOIN (
    SELECT message_id, emoji,
           COUNT(*)::BIGINT AS cnt,
           jsonb_agg(user_id) AS user_ids
    FROM public.reactions
    GROUP BY message_id, emoji
  ) rx ON rx.message_id = m.id
  WHERE m.parent_id = p_parent_id
    AND m.is_deleted = FALSE
  GROUP BY m.id, u.nickname, u.nickname_color
  ORDER BY m.created_at ASC;
END;
$$;

-- Trending keywords from last hour
CREATE OR REPLACE FUNCTION public.get_trending_topics(p_limit INT DEFAULT 5)
RETURNS TABLE (keyword TEXT, count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT word, COUNT(*) AS cnt
  FROM (
    SELECT LOWER(REGEXP_SPLIT_TO_TABLE(content, '[^a-zA-Z0-9]+')) AS word
    FROM public.messages
    WHERE created_at > NOW() - INTERVAL '2 hours'
      AND is_deleted = FALSE
  ) words
  WHERE LENGTH(word) >= 4
    AND word NOT IN (
      'that','this','with','have','will','your','from','they',
      'know','want','been','good','much','some','time','very',
      'when','come','here','just','like','long','make','many',
      'over','such','take','than','them','well','were','what',
      'also','back','even','most','tell','does','into','only',
      'then','able','give','look','more','need','same','about',
      'after','again','could','every','first','great','other',
      'place','right','still','there','think','those','three',
      'under','where','which','while','would','their','these'
    )
  GROUP BY word
  ORDER BY cnt DESC
  LIMIT p_limit;
END;
$$;

-- Trigger: update user last_seen on message insert
CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users SET last_seen = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_last_seen
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_user_last_seen();

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_presence;

ALTER TABLE public.messages        REPLICA IDENTITY FULL;
ALTER TABLE public.reactions       REPLICA IDENTITY FULL;
ALTER TABLE public.online_presence REPLICA IDENTITY FULL;
