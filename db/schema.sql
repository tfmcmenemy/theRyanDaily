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

-- Gallery images stored in Spaces
CREATE TABLE IF NOT EXISTS gallery_images (
  id            SERIAL PRIMARY KEY,
  title         TEXT,
  caption       TEXT,
  spaces_key    TEXT NOT NULL UNIQUE,
  public_url    TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    INTEGER,
  width         INTEGER,
  height        INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_created_at
  ON gallery_images (created_at DESC);

-- Images attached to updates
CREATE TABLE IF NOT EXISTS update_images (
  id            SERIAL PRIMARY KEY,
  update_id     INTEGER NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  spaces_key    TEXT NOT NULL UNIQUE,
  public_url    TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    INTEGER,
  width         INTEGER,
  height        INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_update_images_update_id
  ON update_images (update_id);

CREATE INDEX IF NOT EXISTS idx_update_images_created_at
  ON update_images (created_at DESC);

-- Page view analytics
CREATE TABLE IF NOT EXISTS page_views (
  id            SERIAL PRIMARY KEY,
  path          TEXT NOT NULL,
  ip            TEXT,
  country       TEXT,
  region        TEXT,
  city          TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at
  ON page_views (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_views_path
  ON page_views (path);
