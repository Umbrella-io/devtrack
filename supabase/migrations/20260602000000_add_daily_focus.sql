-- Migration: Add daily_focus table for server-side persistence of Today's Focus
-- Created: 2026-06-02

create table if not exists daily_focus (
  id          text        primary key default gen_random_uuid()::text,
  user_id     text        not null references users(id) on delete cascade,
  focus_date  date        not null,
  goal_text   text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, focus_date)
);

create index if not exists daily_focus_user_id
  on daily_focus (user_id);

create index if not exists daily_focus_user_date
  on daily_focus (user_id, focus_date);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table daily_focus enable row level security;

create policy "daily_focus_select_own"
  on daily_focus for select
  using (user_id = auth.uid()::text);

create policy "daily_focus_insert_own"
  on daily_focus for insert
  with check (user_id = auth.uid()::text);

create policy "daily_focus_update_own"
  on daily_focus for update
  using (user_id = auth.uid()::text);

create policy "daily_focus_delete_own"
  on daily_focus for delete
  using (user_id = auth.uid()::text);
