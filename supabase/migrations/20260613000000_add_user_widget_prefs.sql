-- Migration: Add user_widget_prefs column to users table
-- Stores per-user dashboard widget visibility as JSONB.
-- Absent keys default to visible (handled in application layer).

ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_widget_prefs JSONB;
