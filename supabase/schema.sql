-- Sentinel behavioral risk firewall — Supabase schema.
-- Mirrors the in-memory repository in src/lib/db/repository.ts. Apply via the
-- Supabase SQL editor or `supabase db push` to move from demo to production.

create table if not exists users (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists behavior_profiles (
  user_id text primary key references users (id) on delete cascade,
  avg_amount numeric not null,
  stddev_amount numeric not null,
  common_payees text[] not null default '{}',
  active_hours int[] not null default '{}',
  known_devices text[] not null default '{}'
);

create table if not exists transactions (
  id text primary key,
  user_id text not null references users (id) on delete cascade,
  payee text not null,
  amount numeric not null check (amount > 0),
  device text not null,
  geo text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_created_idx
  on transactions (user_id, created_at desc);

create table if not exists decisions (
  id bigint generated always as identity primary key,
  txn_id text not null references transactions (id) on delete cascade,
  score numeric not null,
  state text not null check (state in ('PASS', 'INSPECT', 'QUARANTINE', 'DENY')),
  reason text not null,
  ai_used boolean not null default false,
  intervened boolean not null default false,
  resolved boolean not null default false,
  decided_at timestamptz not null default now()
);

create table if not exists risk_signals (
  id bigint generated always as identity primary key,
  txn_id text not null references transactions (id) on delete cascade,
  layer text not null check (layer in ('behavioral', 'rules', 'ai')),
  code text not null,
  weight numeric not null,
  detail text not null
);

create index if not exists risk_signals_txn_idx on risk_signals (txn_id);
