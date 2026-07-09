-- Sentinel Scam Shield — Supabase schema for the behaviour and anomaly agents.
-- Run once in the Supabase SQL editor (Project → SQL → New query → Run).
-- Re-runnable: every statement is idempotent.

create extension if not exists "pgcrypto";

-- Append-only log of screened transfers. The history-driven agents read from
-- this table; the main agent writes one row per screen.
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
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

-- Backfill-safe migration: add user_id to existing deployments where the table
-- was created before this column existed.
alter table public.transfers add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists transfers_user_id_idx on public.transfers (user_id);
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

-- Manual seed entries from BNM Financial Consumer Alert List (22 Jun 2017) plus
-- one original team seed. Add new known-bad accounts here; payee_key must be the
-- trimmed, lowercased payee exactly as normalize_payee_key produces it.
insert into public.flagged_accounts (payee_key, payee, reason, source)
values
  ('mule holdings 8829', 'MULE HOLDINGS 8829', 'Confirmed mule account from prior scam reports.', 'manual'),
  ('1globalcash', '1globalcash', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('1gold.com.my', '1Gold.com.my', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('3sixty venture capital plc', '3Sixty Venture Capital PLC', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('a.a.m global corporation sdn bhd', 'A.A.M Global Corporation Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ace global sales & services', 'Ace Global Sales & Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ace dimension network sdn bhd', 'Ace Dimension Network Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ae group holding pte. ltd.', 'AE Group Holding Pte. Ltd.', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('agarwood venture', 'Agarwood Venture', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('agar wood chamber of commerce malaysia', 'Agar Wood Chamber of Commerce Malaysia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ahmad zulkhairi associates plt', 'Ahmad Zulkhairi Associates PLT', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ajuwah realty sdn bhd', 'Ajuwah Realty Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ajuwah agencies sdn bhd', 'Ajuwah Agencies Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ajuwah consultancy', 'Ajuwah Consultancy', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('alpari (asian) ltd', 'Alpari (Asian) Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('al-saliha worlwide sdn. bhd.', 'Al-Saliha Worlwide Sdn. Bhd.', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('amazing yields sdn bhd', 'Amazing Yields Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('amethyst gold creation sdn bhd', 'Amethyst Gold Creation Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('aps asia plantation sdn bhd', 'APS Asia Plantation Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('arba emas perak', 'Arba Emas Perak', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('aruna travel', 'Aruna Travel', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('asas seroja sdn bhd', 'Asas Seroja Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ashnik holdings (m) sdn bhd', 'Ashnik Holdings (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ashnik trading', 'Ashnik Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('asialink globe capital', 'AsiaLink Globe Capital', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('astral progress sdn bhd', 'Astral Progress Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('au niaga sdn bhd', 'AU Niaga Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('au79 international', 'AU79 International', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('aurawave marketing sdn. bhd', 'Aurawave Marketing Sdn. Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('axis capital corporation ltd', 'Axis Capital Corporation Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('aziera gold enterprise', 'Aziera Gold Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('bc academy sdn bhd', 'BC Academy Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('bc bullion sdn bhd', 'BC Bullion Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('berkat fd sdn bhd', 'Berkat FD Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('bfs markets', 'BFS Markets', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('binary indulgence sdn bhd', 'Binary Indulgence Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('bitkingdom', 'BitKingdom', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('build rich mining group bhd', 'Build Rich Mining Group Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('build rich investment group ltd', 'Build Rich Investment Group Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('build rich group holding', 'Build Rich Group Holding', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('build rich agrotech berhad', 'Build Rich Agrotech Berhad', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('build rich enterprise', 'Build Rich Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('bumi klasik warisan enterprise', 'Bumi Klasik Warisan Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('capital asia group (m) sdn bhd', 'Capital Asia Group (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('cash deal sdn bhd', 'Cash Deal Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('celik emas enterprise', 'Celik Emas Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('changkat agro resources', 'Changkat Agro Resources', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('cgf fine metal sdn bhd', 'CGF Fine Metal Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('classic worldwide corporation (m) sdn bhd', 'Classic Worldwide Corporation (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('crowd care sdn bhd', 'Crowd Care Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ctk network', 'CTK Network', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('cybertrustfx', 'CybertrustFX', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('danatama millennium sdn bhd', 'Danatama Millennium Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dana haji jasman', 'Dana Haji Jasman', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('darul emas perak bhd', 'Darul Emas Perak Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dbb star sdn bhd', 'DBB Star Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('degold empire sdn bhd', 'Degold Empire Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('delta wealth services', 'Delta Wealth Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('destiny resources services', 'Destiny Resources Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dgreat network', 'Dgreat Network', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dinar dirham global', 'Dinar Dirham Global', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dm rise enterprise', 'DM Rise Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dna profile sdn bhd', 'DNA Profile Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dream success international sdn bhd', 'Dream Success International Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dynamic wira marketing sdn bhd - skim beras 1 malaysia', 'Dynamic Wira Marketing Sdn Bhd - Skim Beras 1 Malaysia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('dynasty worldwide sdn bhd', 'Dynasty Worldwide Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('eagle aeronautics (m) sdn bhd', 'Eagle Aeronautics (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('east cape mining corp', 'East Cape Mining Corp', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ecofuturefund', 'Ecofuturefund', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('efzinitus capital pte ltd', 'Efzinitus Capital Pte Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('emgoldex', 'Emgoldex', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('empire five trading', 'Empire Five Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('energetic gateway sdn bhd', 'Energetic Gateway Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('epic palms bhd', 'Epic Palms Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ethtrade limited', 'Ethtrade Limited', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ethtrade malaysia', 'Ethtrade Malaysia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('everise fumigation sdn bhd', 'Everise Fumigation Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('exorbitance influence sdn bhd', 'Exorbitance Influence Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('exquisite bottle index sdn bhd', 'Exquisite Bottle Index Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('extra capital programme', 'Extra Capital Programme', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ezey marketing', 'Ezey Marketing', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('e-qirad sdn bhd', 'E-Qirad Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fa markets', 'FA Markets', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('family wealth resources', 'Family Wealth Resources', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fari group global resources', 'Fari Group Global Resources', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fe brands (m) sdn bhd', 'FE Brands (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('flexsy enterprise & barrilorne corp', 'Flexsy Enterprise & Barrilorne Corp', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fnz capital limited', 'FNZ Capital Limited', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fortrend international sdn bhd', 'Fortrend International Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('futurebarrel.com', 'Futurebarrel.com', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('107', '107', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fxunited malaysia', 'FxUnited Malaysia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fxunited power sdn bhd', 'FXUnited Power Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fxzn zenith limited', 'FXZN Zenith Limited', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fxzn investment limited', 'FXZN Investment Limited', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fxzn zenith management limited', 'FXZN Zenith Management Limited', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('fx primus ltd', 'FX Primus Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('gain fx capital sdn bhd', 'Gain FX Capital Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('gan patt services', 'Gan Patt Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ganding wawasan trading', 'Ganding Wawasan Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ggc aqualculture sdn bhd', 'GGC Aqualculture Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ggf golden house sdn bhd', 'GGF Golden House Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ggt golds sdn bhd', 'GGT Golds Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('global creation trading', 'Global Creation Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('global golds trading', 'Global Golds Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('global peace loving family', 'Global Peace Loving Family', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('global venture financing', 'Global Venture Financing', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('global wave gold corporation', 'Global Wave Gold Corporation', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('gold bullion world sdn bhd', 'Gold Bullion World Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('gorgeous chain sdn bhd', 'Gorgeous Chain Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('grand view golden success sdn bhd (638186-x) - golden', 'Grand View Golden Success Sdn Bhd (638186-X) - Golden', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('great access sdn bhd', 'Great Access Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('green buck resources sdn bhd', 'Green Buck Resources Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('greenmillion agrosolution enterprise', 'Greenmillion Agrosolution Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('green forest global sdn bhd', 'Green Forest Global Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('hafx global venture sdn bhd', 'HAFX Global Venture Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('harvest reliance consultancy sdn bhd', 'Harvest Reliance Consultancy Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('hea teguh', 'HEA Teguh', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('hexa commerce sdn bhd', 'Hexa Commerce Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('hg resources sdn bhd (hgr)', 'HG Resources Sdn Bhd (HGR)', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('hifx asia', 'HiFX Asia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('highway group resources', 'Highway Group Resources', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('hin huat auto sparts', 'Hin Huat Auto Sparts', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('holiday express asia', 'Holiday Express Asia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('honest group ltd', 'Honest Group Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('hupro international inc', 'Hupro International Inc', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('i & a global community network', 'I & A Global Community Network', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('iconhill holding sdn bhd', 'Iconhill Holding Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('igc diamond', 'IGC Diamond', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('infinity star international sdn bhd', 'Infinity Star International Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('instaforex', 'Instaforex', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('instagroup resources', 'Instagroup Resources', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('inter pasicfic soyy enterprise', 'Inter Pasicfic Soyy Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('iridian ventures plt (llp0002569-lgn):', 'Iridian Ventures PLT (LLP0002569-LGN):', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ironfx solid trading', 'IronFX Solid Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('isothree gold sdn bhd', 'Isothree Gold Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('itradex', 'Itradex', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jalatama management sdn bhd', 'Jalatama Management Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jazlaan enterprise', 'Jazlaan Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jihadfarisha ventures', 'Jihadfarisha Ventures', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jj global network', 'JJ Global Network', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jj poor to rich', 'JJ Poor To Rich', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jjptr', 'JJPTR', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jm communications & technology sdn bhd', 'JM Communications & Technology Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jmi global', 'JMI Global', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('jtgold', 'JTGold', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('kelab kebajikan dan sosial tun teja malaysia', 'Kelab Kebajikan dan Sosial Tun Teja Malaysia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('kelab kebajikan sosial malaysia', 'Kelab Kebajikan Sosial Malaysia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('161', '161', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('keenan prestige services', 'Keenan Prestige Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('keenan brilliant services', 'Keenan Brilliant Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('khaira sakinah resources', 'Khaira Sakinah Resources', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('kilauan padu services sdn bhd (kpssb)', 'Kilauan Padu Services Sdn Bhd (KPSSB)', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('kl fxunited club', 'KL FxUnited Club', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('kris plus enterprise', 'Kris Plus Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('kudaemas', 'Kudaemas', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('lestari2u', 'Lestari2U', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('liberty reserve', 'Liberty Reserve', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('life time holidays sdn bhd', 'Life Time Holidays Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('localadclick', 'LocalAdClick', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('locusnetwork4u.com', 'LocusNetwork4u.com', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ls gold bullion sdn bhd', 'LS Gold Bullion Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('marco robinson sdn bhd', 'Marco Robinson Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mari wholesale (m) sdn bhd', 'Mari Wholesale (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('maxim capital ltd', 'Maxim Capital Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('maza network sdn bhd', 'Maza Network Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mbi international sdn bhd', 'MBI International Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mcren oceanus sdn bhd', 'McRen Oceanus Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('md venture group sdn bhd', 'MD Venture Group Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('meccafund family malaysia', 'Meccafund Family Malaysia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mecca fund global (mfg)', 'Mecca Fund Global (MFG)', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mega dynasty sdn bhd', 'Mega Dynasty Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('megaherbs bioextreme', 'Megaherbs Bioextreme', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('megah mewah trading', 'Megah Mewah Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mface international sdn bhd', 'Mface International Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mgcfx', 'MGCfx', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mgc capital sdn bhd', 'MGC Capital Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mgsb holding sdn bhd', 'MGSB Holding Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mh secret wealth enterprise', 'MH Secret Wealth Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mi1 global sdn bhd', 'Mi1 Global Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('million jade sdn bhd', 'Million Jade Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('miracle day trading', 'Miracle Day Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mohamad world enterprise', 'Mohamad World Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('monspace (m) sdn bhd', 'MonSpace (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mop consultant sdn. bhd', 'MOP Consultant Sdn. Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mughniwave international sdn. bhd.', 'Mughniwave International Sdn. Bhd.', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('mx3 world wide', 'MX3 World Wide', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('my cameron hills sdn bhd', 'My Cameron Hills Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('nexgain malaysia sdn bhd', 'Nexgain Malaysia Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('next generation mall', 'Next Generation Mall', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('nory motor', 'Nory Motor', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('norry setia ent', 'Norry Setia Ent', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ntb agencies sdn bhd', 'NTB Agencies Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('o2 only one', 'O2 Only One', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ocean century international limited', 'Ocean Century International Limited', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('oci management sdn bhd', 'OCI Management Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('oci venture sdn bhd', 'OCI Venture Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('odfx', 'ODFX', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('og1 asean', 'OG1 Asean', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('olta capital management inc.', 'OLTA Capital Management Inc.', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('one autocash', 'One AutoCash', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('only one international sdn bhd', 'Only One International Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('orion healthcare management services sdn bhd', 'Orion Healthcare Management Services Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('orion prokasih (m) sdn bhd', 'Orion Prokasih (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ostim academy', 'Ostim Academy', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('overseas delight sdn bhd', 'Overseas Delight Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pancar mayang sdn bhd', 'Pancar Mayang Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pars pay sdn bhd', 'Pars Pay Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pegasus bullion', 'Pegasus Bullion', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('perfway traders sdn bhd', 'Perfway Traders Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('perniagaan jatidana wawasan (m) sdn bhd', 'Perniagaan Jatidana Wawasan (M) Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('perubatan islam seiring syariat al-ikhlas', 'Perubatan Islam Seiring Syariat Al-Ikhlas', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pioneer forest sdn bhd', 'Pioneer Forest Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pertubuhan kebajikan komuniti malaysia', 'Pertubuhan Kebajikan Komuniti Malaysia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pok din consultant & services', 'Pok Din Consultant & Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pok din empire sdn bhd', 'Pok Din Empire Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('power trade asia sdn bhd', 'Power Trade Asia Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ppc storm', 'PPC Storm', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('preferred credentials sdn bhd', 'Preferred Credentials Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('premier ventures gold', 'Premier Ventures Gold', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('prestige dairy farm (m) berhad', 'Prestige Dairy Farm (M) Berhad', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('proficiency management and services', 'Proficiency Management and Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('profit web sdn bhd', 'Profit Web Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('program 10 bulan forex trading', 'Program 10 Bulan Forex Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('program i-rich', 'Program I-Rich', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pro infinity ltd', 'Pro Infinity Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('projek duit 2012', 'Projek Duit 2012', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('provisio multimedia', 'Provisio Multimedia', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('pruton mega holding limited', 'Pruton Mega Holding Limited', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('public golden house sdn bhd', 'Public Golden House Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('puncak hartawan resources', 'Puncak Hartawan Resources', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('quantum capital program', 'Quantum Capital Program', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ram kris venture', 'Ram Kris Venture', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rcfx', 'RCFX', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rc group', 'RC Group', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rc group sdn bhd', 'RC Group Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('real biz pasif', 'Real Biz Pasif', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('real ingenious sdn bhd', 'Real Ingenious Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rejab trading', 'Rejab Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rejabwealth sdn bhd', 'Rejabwealth Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('reza anuar seven', 'Reza Anuar Seven', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('retro titan sdn bhd', 'Retro Titan Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rgcx trading corp', 'RGCX Trading Corp', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('richway global venture', 'Richway Global Venture', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rimbun tekad realty sdn bhd', 'Rimbun Tekad Realty Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rimbun tekad consultancy sdn bhd', 'Rimbun Tekad Consultancy Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rising premium sdn bhd', 'Rising Premium Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rmmudah.com', 'RMMUDAH.COM', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rm20segera.com', 'RM20segera.com', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rn corporate services sdn bhd', 'RN Corporate Services Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rowther technologies msc sdn bhd', 'Rowther Technologies MSC Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('royal gold sdn bhd', 'Royal Gold Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('royale team groups', 'Royale Team Groups', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('rs capital holdings bhd', 'RS Capital Holdings Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('safeena gold gallery', 'Safeena Gold Gallery', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('sejati agarwood enterprise', 'Sejati Agarwood Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('sera land mangement & enterprise', 'Sera Land Mangement & Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('sgfm trading sdn bhd', 'SGFM Trading Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('slimberry extreme team', 'Slimberry Extreme Team', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('smart trade entrepreneur', 'Smart Trade Entrepreneur', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('smart trade resources sdn bhd', 'Smart Trade Resources Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('solar bond capital sdn bhd', 'Solar Bond Capital Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('speedline', 'Speedline', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('srgold exchange bhd', 'Srgold Exchange Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('sri perkasa emas trading', 'Sri Perkasa Emas Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('sri chempaka emas enterprise', 'Sri Chempaka Emas Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('steady dynasty sdn bhd', 'Steady Dynasty Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('steady global network sdn bhd', 'Steady Global Network Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('suliz pearl mines', 'Suliz Pearl Mines', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('suisse coins sdn bhd', 'Suisse Coins Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('sweblink global network sdn bhd', 'Sweblink Global Network Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('swiss capital venture', 'Swiss Capital Venture', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('syarikat azza motor network sdn bhd', 'Syarikat Azza Motor Network Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('syarikat gecs ltd', 'Syarikat GECS Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('syarikat sri alam', 'Syarikat Sri Alam', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tabung dana ehsan', 'Tabung Dana Ehsan', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tanjung trading', 'Tanjung Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tenaga setia services', 'Tenaga Setia Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tf international group', 'TF International Group', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tf international group (my)', 'TF International Group (MY)', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tf international w1212 kl team', 'TF International W1212 KL Team', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tg reliance sdn bhd', 'TG Reliance Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('the gold guarantee', 'The Gold Guarantee', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('titan group sdn. bhd', 'Titan Group Sdn. Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tp eagle venture sdn bhd', 'TP Eagle Venture Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('trillion venture', 'Trillion Venture', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('triple one management pte ltd', 'Triple One Management Pte Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('tukargold.net', 'TukarGold.net', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('uer gold', 'UER Gold', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ufunclub', 'UFUNCLUB', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ultimate power profits', 'Ultimate Power Profits', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('united american traders council', 'United American Traders Council', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('ufunclub', 'UFUNCLUB', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('uncang teguh resources', 'Uncang Teguh Resources', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('urustabil sdn bhd', 'Urustabil Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('vc gold sdn bhd', 'VC Gold Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('virgin gold mining corporation', 'Virgin Gold Mining Corporation', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('venusfx', 'VenusFX', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('verger management services', 'Verger Management Services', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('wadiah trading', 'Wadiah Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('water beaute world berhad', 'Water Beaute World Berhad', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('water world marketing', 'Water World Marketing', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('webster trade consulting sdn bhd', 'Webster Trade Consulting Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('westrank equity sdn bhd', 'Westrank Equity Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('windsor fragrance sdn bhd', 'Windsor Fragrance Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('world dirham berhad', 'World Dirham Berhad', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('worldwide community programme', 'Worldwide Community Programme', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('wsl merchants pte ltd', 'WSL Merchants Pte Ltd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('xcelent job trading', 'Xcelent Job Trading', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('xoc7', 'XOC7', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('yds corporate line sdn bhd', 'YDS Corporate Line Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('yds holding groups bhd', 'YDS Holding Groups Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('zemc sdn bhd', 'ZEMC Sdn Bhd', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('zenith gold international limited (zgi)', 'Zenith Gold International Limited (ZGI)', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('zeta capital management', 'Zeta Capital Management', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('zill akasha gemilang enterprise', 'Zill Akasha Gemilang Enterprise', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual'),
  ('zness.com', 'Zness.com', 'Listed on BNM Financial Consumer Alert (22 Jun 2017).', 'manual')
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
