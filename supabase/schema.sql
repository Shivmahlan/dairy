create extension if not exists pgcrypto;

create table if not exists public.milk_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  shift text not null check (shift in ('morning', 'evening')),
  weight numeric not null check (weight >= 0),
  fat numeric not null check (fat >= 0),
  total_amount numeric not null check (total_amount >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null check (type in ('credit', 'debit')),
  amount numeric not null check (amount >= 0),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ledger_cycles (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  total_milk_amount numeric not null default 0,
  total_credit numeric not null default 0,
  total_debit numeric not null default 0,
  net_balance numeric not null default 0,
  carry_forward numeric not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.item_transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  shift text not null check (shift in ('morning', 'evening')),
  item_name text not null,
  type text not null check (type in ('credit', 'debit')),
  amount numeric not null check (amount >= 0),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ledger_cycles_start_date_end_date_key'
  ) then
    alter table public.ledger_cycles
      add constraint ledger_cycles_start_date_end_date_key
      unique (start_date, end_date);
  end if;
end $$;

alter table public.milk_entries enable row level security;
alter table public.transactions enable row level security;
alter table public.ledger_cycles enable row level security;
alter table public.item_transactions enable row level security;

drop policy if exists "authenticated users manage milk entries" on public.milk_entries;
create policy "authenticated users manage milk entries"
on public.milk_entries
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users manage transactions" on public.transactions;
create policy "authenticated users manage transactions"
on public.transactions
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users manage ledger cycles" on public.ledger_cycles;
create policy "authenticated users manage ledger cycles"
on public.ledger_cycles
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users manage item transactions" on public.item_transactions;
create policy "authenticated users manage item transactions"
on public.item_transactions
for all
to authenticated
using (true)
with check (true);
