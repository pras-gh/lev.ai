create table if not exists public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  plan_status text not null default 'trial'
    check (plan_status in ('trial', 'active', 'overdue', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists allowed_users_email_lower_idx
  on public.allowed_users (lower(email));

insert into public.allowed_users (email, full_name, plan_status)
select
  email,
  full_name,
  case when coalesce(is_paid, false) then 'active' else 'trial' end
from public.dashboard_users
on conflict (email) do update
set
  full_name = excluded.full_name,
  plan_status = excluded.plan_status;
