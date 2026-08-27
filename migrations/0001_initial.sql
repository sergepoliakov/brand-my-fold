CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'preview',
  ends_at TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO auctions (id, status, ends_at, updated_at)
VALUES ('main', 'preview', NULL, datetime('now'));

CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 10),
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  starting_price_usdt REAL NOT NULL CHECK (starting_price_usdt > 0),
  current_price_usdt REAL NOT NULL CHECK (current_price_usdt > 0),
  bid_count INTEGER NOT NULL DEFAULT 0 CHECK (bid_count >= 0),
  leading_bid_id TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  spot_id INTEGER NOT NULL REFERENCES spots(id),
  amount_usdt REAL NOT NULL CHECK (amount_usdt > 0),
  deposit_usdt REAL NOT NULL CHECK (deposit_usdt >= 10),
  brand TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  x_handle TEXT,
  artwork_key TEXT,
  artwork_approved INTEGER NOT NULL DEFAULT 0 CHECK (artwork_approved IN (0, 1)),
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'bsc', 'solana')),
  status TEXT NOT NULL,
  upload_token_hash TEXT NOT NULL,
  tx_hash TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS bids_spot_created_idx ON bids (spot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bids_status_idx ON bids (status);

CREATE TABLE IF NOT EXISTS payments (
  tx_hash TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL UNIQUE REFERENCES bids(id),
  network TEXT NOT NULL,
  amount_usdt REAL NOT NULL,
  sender_address TEXT,
  block_number INTEGER,
  verified_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY,
  x_handle TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
  event_name TEXT NOT NULL,
  anonymous_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS experiment_events_lookup_idx ON experiment_events (variant, event_name, created_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
