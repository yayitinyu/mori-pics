-- Migration: Add S3 configuration table
CREATE TABLE IF NOT EXISTS storage_configs (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only one config row
    type TEXT DEFAULT 'r2', -- 'r2' or 's3'
    endpoint TEXT,
    region TEXT,
    bucket TEXT,
    access_key_id TEXT,
    secret_access_key TEXT,
    public_domain TEXT,
    enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial row
INSERT OR IGNORE INTO storage_configs (id, type, enabled) VALUES (1, 'r2', 0);
