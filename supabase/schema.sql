-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

create table if not exists users (
  id           text primary key default gen_random_uuid()::text,
  github_id    text unique not null,
  github_login text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

CREATE TABLE IF NOT EXISTS goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  target       INTEGER NOT NULL,
  current      INTEGER NOT NULL DEFAULT 0,
  unit         TEXT NOT NULL DEFAULT 'commits',
  recurrence   TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

create index if not exists goals_user_period on goals(user_id, period_start);

create table if not exists metric_snapshots (
  id           text primary key default gen_random_uuid()::text,
  user_id      text not null references users(id) on delete cascade,
  snapshot_at  timestamptz default now(),
  commits      integer not null default 0,
  prs_open     integer not null default 0,
  prs_merged   integer not null default 0,
  issues_closed integer not null default 0
);

create index if not exists snapshots_user_time on metric_snapshots(user_id, snapshot_at);