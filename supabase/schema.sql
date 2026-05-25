-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

create table if not exists users (
  id           text primary key default gen_random_uuid()::text,
  github_id    text unique not null,
  github_login text not null,
  is_public    boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  wakatime_api_key_encrypted text,
  wakatime_api_key_iv text
);

create table if not exists goals (
  id           text primary key default gen_random_uuid()::text,
  user_id      text not null references users(id) on delete cascade,
  title        text not null,
  target       integer not null,
  current      integer not null default 0,
  unit         text not null default 'commits',
  recurrence   text not null default 'none' check (recurrence in ('none', 'weekly', 'monthly')),
  period_start timestamptz default now(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists goals_user_period on goals(user_id, period_start);

create table if not exists metric_snapshots (
  id            text primary key default gen_random_uuid()::text,
  user_id       text not null references users(id) on delete cascade,
  snapshot_at   timestamptz default now(),
  commits       integer not null default 0,
  prs_open      integer not null default 0,
  prs_merged    integer not null default 0,
  issues_closed integer not null default 0
);

create index if not exists snapshots_user_time on metric_snapshots(user_id, snapshot_at);

-- -------------------------------------------------------
-- AI Mentor: cached insights & Claude-generated summaries
-- -------------------------------------------------------
create table if not exists ai_insights (
  id           text primary key default gen_random_uuid()::text,
  user_id      text not null,
  insight_type text not null check (insight_type in ('weekly_summary', 'pattern', 'recommendation')),
  content      jsonb not null,
  generated_at timestamptz default now(),
  expires_at   timestamptz default now() + interval '24 hours'
);

create index if not exists idx_ai_insights_user_id on ai_insights(user_id);
create index if not exists idx_ai_insights_type    on ai_insights(insight_type);

-- Unique index required by the upsert conflict target in /api/ai-insights
create unique index if not exists idx_ai_insights_user_type
  on ai_insights(user_id, insight_type);
