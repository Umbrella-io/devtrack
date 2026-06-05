-- Migration: add streak_freezes table
<<<<<<< HEAD
-- Allows users to protect one streak day (e.g. weekends, sick days)
=======
-- Allows users to protect one streak day 
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))

create table if not exists streak_freezes (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null references users(id) on delete cascade,
  freeze_date date not null,
<<<<<<< HEAD
  created_at  timestamptz default now()
);

create index if not exists streak_freezes_user on streak_freezes(user_id);

create unique index if not exists streak_freezes_user_date_uniq
  on streak_freezes(user_id, freeze_date);
=======
  used_at     timestamptz default now()
);

create index if not exists streak_freezes_user on streak_freezes(user_id);
create index if not exists streak_freezes_user_date on streak_freezes(user_id, freeze_date);
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
