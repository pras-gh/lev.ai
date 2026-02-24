create table if not exists public.dashboard_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  password text not null,
  is_paid boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dashboard_users_email_lower_idx
  on public.dashboard_users (lower(email));
