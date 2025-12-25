-- Migration: Add url_style to storage_configs
ALTER TABLE storage_configs ADD COLUMN url_style TEXT DEFAULT 'path';
