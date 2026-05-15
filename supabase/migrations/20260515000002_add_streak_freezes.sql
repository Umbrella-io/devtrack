CREATE TABLE IF NOT EXISTS streak_freezes (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null references users(id) on delete cascade,
  freeze_date date not null,
  created_at  timestamptz default now(),
  UNIQUE(user_id, freeze_date)
);

CREATE INDEX IF NOT EXISTS streak_freezes_user_date ON streak_freezes(user_id, freeze_date);
