-- Sentinel Scam Shield — Supabase schema for the behaviour and anomaly agents.
-- Run once in the Supabase SQL editor (Project → SQL → New query → Run).
-- Re-runnable: every statement is idempotent.

create extension if not exists "pgcrypto";

-- Append-only log of screened transfers. The history-driven agents read from
-- this table; the main agent writes one row per screen.
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  payee text not null,
  payee_key text not null,
  amount numeric not null check (amount >= 0),
  memo text,
  currency text not null default 'MYR',
  channel text not null default 'browser_extension',
  advice text not null,
  score numeric not null,
  state text not null,
  created_at timestamptz not null default now()
);

create index if not exists transfers_payee_key_idx on public.transfers (payee_key);
create index if not exists transfers_created_at_idx on public.transfers (created_at desc);

-- Lock the table down. Only the service-role key (used server-side, bypasses
-- RLS) may read or write; no anon/public policy is created on purpose.
alter table public.transfers enable row level security;

-- Behaviour agent input: this recipient's prior-transfer history.
create or replace function public.get_behaviour_stats(p_payee_key text)
returns table (payee_count bigint, payee_avg_amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as payee_count,
    coalesce(avg(amount), 0) as payee_avg_amount
  from public.transfers
  where payee_key = p_payee_key;
$$;

-- Anomaly agent input: population statistics plus a recent-velocity count.
create or replace function public.get_anomaly_stats(p_window_minutes integer)
returns table (population_mean numeric, population_stddev numeric, recent_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(avg(amount), 0) as population_mean,
    coalesce(stddev_pop(amount), 0) as population_stddev,
    coalesce(
      count(*) filter (where created_at >= now() - make_interval(mins => p_window_minutes)),
      0
    )::bigint as recent_count
  from public.transfers;
$$;

grant execute on function public.get_behaviour_stats(text) to service_role;
grant execute on function public.get_anomaly_stats(integer) to service_role;
