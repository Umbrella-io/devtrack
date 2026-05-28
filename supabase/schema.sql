-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

create table if not exists users (
  id           text primary key default gen_random_uuid()::text,
  github_id    text unique not null,
  github_login text not null,
  is_public    boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  wakatime_api_key_encrypted text,
  wakatime_api_key_iv text,
  is_sponsor   boolean default false
);

create table if not exists goals (
  id           text primary key default gen_random_uuid()::text,
  user_id      text not null references users(id) on delete cascade,
  title        text not null,
  target       integer not null,
  current      integer not null default 0,
  unit         text not null default 'commits',
  deadline     timestamptz,
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

create table if not exists user_github_achievements (
  user_id      text primary key references users(id) on delete cascade,
  github_login text not null,
  achievements jsonb not null default '[]'::jsonb,
  synced_at    timestamptz,
  fetch_error  text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_user_github_achievements_login
  on user_github_achievements(github_login);

alter table user_github_achievements enable row level security;

create policy "user_github_achievements_select_own"
  on user_github_achievements for select
  using (user_id = auth.uid()::text);

-- Refactor local coding sessions sync to use a database transaction function
create or replace function batch_upsert_sessions(sessions jsonb)
returns void as $$
declare
  session_record jsonb;
begin
  for session_record in select * from jsonb_array_elements(sessions) loop
    insert into local_coding_sessions (user_id, date, total_seconds, file_count, project_count)
    values (
      (session_record->>'user_id'),
      (session_record->>'date')::date,
      (session_record->>'total_seconds')::integer,
      coalesce((session_record->>'file_count')::integer, 0),
      coalesce((session_record->>'project_count')::integer, 0)
    )
    on conflict (user_id, date) do update set
      total_seconds = excluded.total_seconds,
      file_count = excluded.file_count,
      project_count = excluded.project_count,
      updated_at = now();
  end loop;
end;
$$ language plpgsql security definer;

