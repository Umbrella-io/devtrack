sqlalter table users add column if not exists gitlab_id text unique;
alter table users add column if not exists gitlab_login text;
alter table users alter column github_id drop not null;
