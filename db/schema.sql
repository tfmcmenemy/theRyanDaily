-- Updates posted by your sister
CREATE TABLE IF NOT EXISTS updates (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions from family/friends on a specific update
CREATE TABLE IF NOT EXISTS questions (
  id            SERIAL PRIMARY KEY,
  update_id     INTEGER NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  asker_name    TEXT,
  asker_contact TEXT,
  question      TEXT NOT NULL,
  answer        TEXT,
  asked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_questions_update_id ON questions(update_id);

-- Optional: contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id            SERIAL PRIMARY KEY,
  name          TEXT,
  email         TEXT,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: gallery (store URLs for now)
CREATE TABLE IF NOT EXISTS gallery_items (
  id            SERIAL PRIMARY KEY,
  image_url     TEXT NOT NULL,
  caption       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
