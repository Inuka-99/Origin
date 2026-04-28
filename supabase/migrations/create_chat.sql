-- ============================================================
-- Chat: channels, members, messages
--
-- Two channel kinds:
--   'dm'     — exactly two members, no name, derived display
--              from the other participant.
--   'group'  — any number of members, has a name.
--
-- Realtime is delivered via Supabase broadcast channels named
-- "chat:<channel_id>", not via Postgres logical replication, so
-- this schema doesn't need to expose every field as REPLICA.
--
-- File attachments live in the Supabase Storage bucket
-- `chat-attachments` (created out-of-band in the Dashboard). We
-- just store a URL + metadata on the message row.
-- ============================================================

-- ---- channels ------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_channels (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('dm', 'group')),
  name        TEXT,
  created_by  TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chat_channels_group_has_name
    CHECK (kind <> 'group' OR (name IS NOT NULL AND length(trim(name)) > 0))
);

-- ---- channel_members ----------------------------------------
CREATE TABLE IF NOT EXISTS chat_channel_members (
  channel_id    UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_read_at  TIMESTAMPTZ,
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user
  ON chat_channel_members (user_id);

-- ---- messages -----------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id       UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT,
  attachment_url   TEXT,
  attachment_name  TEXT,
  attachment_type  TEXT,
  attachment_size  BIGINT,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  edited_at        TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ,
  -- A message must have either text content or an attachment.
  CONSTRAINT chat_messages_has_payload
    CHECK (
      (content IS NOT NULL AND length(trim(content)) > 0)
      OR attachment_url IS NOT NULL
    )
);

-- Hot path: list latest messages in a channel.
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
  ON chat_messages (channel_id, created_at DESC);

-- For "what new messages does this user have"
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
  ON chat_messages (sender_id);

-- ---- updated_at trigger on channels (so channel list can sort
-- by recent activity without a join). -----------------------
CREATE OR REPLACE FUNCTION chat_touch_channel_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_channels
     SET updated_at = NEW.created_at
   WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_messages_touch_channel ON chat_messages;
CREATE TRIGGER chat_messages_touch_channel
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION chat_touch_channel_on_message();
