-- 001_init.sql
-- Creates the schema for Mood Map AI. Authentication is handled by Firebase;
-- this DB stores user profiles and mood check-ins only.

-- Profiles: 1:1 with Firebase UID
CREATE TABLE IF NOT EXISTS profiles (
    id              TEXT PRIMARY KEY,                          -- Firebase UID
    email           TEXT UNIQUE NOT NULL,
    display_name    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Check-ins: a single mood entry from the user
CREATE TABLE IF NOT EXISTS check_ins (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_message        TEXT NOT NULL,
    ai_reply            TEXT NOT NULL,
    mood_score          INTEGER NOT NULL CHECK (mood_score >= 0 AND mood_score <= 10),
    gossip_triggered    BOOLEAN NOT NULL DEFAULT false,
    prompt_used         TEXT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id     ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_timestamp  ON check_ins(timestamp DESC);

-- Auto-update updated_at on profile changes
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Row Level Security. The backend uses the service role key, so it bypasses RLS.
-- These policies allow the anon key to do nothing (defense in depth).
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
