-- User organization preferences for tracking org repos
create table if not exists user_org_preferences (
  id                 text primary key default gen_random_uuid()::text,
  user_id            text not null references users(id) on delete cascade,
  org_name           text not null,
  included           boolean default true,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique (user_id, org_name)
);

create index if not exists user_org_preferences_user_id_idx
  on user_org_preferences(user_id);

create index if not exists user_org_preferences_user_included_idx
  on user_org_preferences(user_id, included);
