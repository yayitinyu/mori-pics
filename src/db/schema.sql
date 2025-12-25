-- mori-pics D1 Database Schema
-- Run with: npx wrangler d1 execute mori-pics-db --file=./src/db/schema.sql

-- Users table (simple mode: single admin)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'guest')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Images table
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT NOT NULL,
    original_name TEXT,
    url TEXT NOT NULL,
    size INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER,
    mime_type TEXT,
    tags TEXT DEFAULT '[]',
    description TEXT DEFAULT '',
    is_public INTEGER DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Daily statistics table
CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    upload_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    upload_size INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_is_public ON images(is_public);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);

-- Storage Configuration (Single Row)
CREATE TABLE IF NOT EXISTS storage_configs (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    type TEXT DEFAULT 'r2',
    endpoint TEXT,
    region TEXT,
    bucket TEXT,
    access_key_id TEXT,
    secret_access_key TEXT,
    public_domain TEXT,
    url_style TEXT DEFAULT 'path',
    enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO storage_configs (id, type, enabled) VALUES (1, 'r2', 0);
