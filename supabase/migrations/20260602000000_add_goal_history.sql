-- Migration: create goal_history table for recurring goal period archival
--
-- Every time a recurring goal's period resets, the previous period's
-- achievement data is written here before current is zeroed. This
-- preserves both successful and unsuccessful periods permanently.

create table if not exists goal_history (
  id             uuid        primary key default gen_random_uuid(),
  goal_id        uuid        not null references goals(id) on delete cascade,
  user_id        uuid        not null references users(id) on delete cascade,
  period_start   timestamptz not null,
  period_end     timestamptz not null,
  target         integer     not null check (target > 0),
  achieved_value integer     not null check (achieved_value >= 0),
  completed      boolean     not null,
  created_at     timestamptz not null default now(),

  -- one row per goal per period; prevents double-inserts on concurrent resets
  unique (goal_id, period_start)
);

-- fast lookup for the most recent period of each goal
create index if not exists goal_history_goal_period_idx
  on goal_history (goal_id, period_start desc);

-- fast lookup for all history belonging to a user
create index if not exists goal_history_user_created_idx
  on goal_history (user_id, created_at desc);
