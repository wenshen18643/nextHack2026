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

-- Behaviour agent input: this recipient's prior-transfer history, including how
-- many earlier transfers to the same recipient were themselves flagged
-- (advice 'warn' or 'block'). Dropped first because the return shape changed.
drop function if exists public.get_behaviour_stats(text);
create or replace function public.get_behaviour_stats(p_payee_key text)
returns table (payee_count bigint, payee_avg_amount numeric, prior_flag_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as payee_count,
    coalesce(avg(amount), 0) as payee_avg_amount,
    count(*) filter (where advice in ('warn', 'block'))::bigint as prior_flag_count
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

-- Shared blocklist of recipient accounts confirmed as scam/mule destinations.
-- Consulted on every screen, across all supported banks. Rows come from two
-- sources: 'manual' (seeded by the team, below) and 'ai' (added by the AI
-- adjudicator when it concludes the account itself is fraudulent). The first
-- flag wins: inserts ignore duplicates so a manual entry is never overwritten.
create table if not exists public.flagged_accounts (
  payee_key text primary key,
  payee text not null,
  reason text not null,
  source text not null check (source in ('manual', 'ai')),
  created_at timestamptz not null default now()
);

alter table public.flagged_accounts enable row level security;

-- Manual seed entries. Add new known-bad accounts here; payee_key must be the
-- trimmed, lowercased payee exactly as normalize_payee_key produces it.
insert into public.flagged_accounts (payee_key, payee, reason, source)
values
  ('mule holdings 8829', 'MULE HOLDINGS 8829', 'Confirmed mule account from prior scam reports.', 'manual')
on conflict (payee_key) do nothing;

-- One profile row per signed-up user, keyed to the Supabase auth user. Stores
-- the birth year that powers age-aware screening thresholds. Written by the
-- signup route with the service-role key; no anon/public policy on purpose.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  birth_year integer not null check (birth_year between 1900 and 2100),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Pro entitlement, written by the Stripe webhook after a successful Checkout
-- payment. stripe_customer_id lets support trace a payment back to Stripe.
alter table public.profiles add column if not exists is_pro boolean not null default false;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists pro_since timestamptz;

-- Latest captured DOM snapshot per bank site/frame, used to write precise
-- site adapters. Upserted on (site, frame_slug) so only the newest dump per
-- page is kept. Service-role only, same as transfers.
create table if not exists public.dom_dumps (
  site text not null,
  frame_slug text not null default '',
  host text not null,
  html text not null,
  captured_at timestamptz not null default now(),
  primary key (site, frame_slug)
);

alter table public.dom_dumps enable row level security;
