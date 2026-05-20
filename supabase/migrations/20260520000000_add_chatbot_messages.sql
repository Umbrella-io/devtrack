create table if not exists chatbot_messages (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  role text not null check (role in ('user', 'bot')),
  message text not null,
  created_at timestamptz default now()
);

create index if not exists chatbot_messages_user_time
on chatbot_messages(user_id, created_at);