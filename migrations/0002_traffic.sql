CREATE TABLE IF NOT EXISTS traffic_sessions (
  session_id TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  country_code TEXT,
  region TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  source TEXT NOT NULL DEFAULT 'Direct',
  referrer_host TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS traffic_sessions_last_seen_idx ON traffic_sessions (last_seen DESC);
CREATE INDEX IF NOT EXISTS traffic_sessions_country_idx ON traffic_sessions (country_code, last_seen DESC);
CREATE INDEX IF NOT EXISTS traffic_sessions_source_idx ON traffic_sessions (source, last_seen DESC);
