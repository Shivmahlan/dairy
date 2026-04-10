create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  milk_rate numeric not null default 8.5 constraint businesses_milk_rate_check check (milk_rate >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.businesses
  add column if not exists milk_rate numeric;

update public.businesses
set milk_rate = 8.5
where milk_rate is null;

alter table public.businesses
  alter column milk_rate set default 8.5;

alter table public.businesses
  alter column milk_rate set not null;

alter table public.milk_entries
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.milk_entries
  add column if not exists created_by_user_id uuid;

alter table public.milk_entries
  add column if not exists created_by_email text;

alter table public.transactions
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.transactions
  add column if not exists created_by_user_id uuid;

alter table public.transactions
  add column if not exists created_by_email text;

alter table public.ledger_cycles
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.item_transactions
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.item_transactions
  add column if not exists created_by_user_id uuid;

alter table public.item_transactions
  add column if not exists created_by_email text;

do $$
declare
  primary_business_id uuid;
begin
  insert into public.businesses (name)
  values ('Main Dairy')
  returning id into primary_business_id;

  update public.milk_entries
  set business_id = primary_business_id
  where business_id is null;

  update public.transactions
  set business_id = primary_business_id
  where business_id is null;

  update public.ledger_cycles
  set business_id = primary_business_id
  where business_id is null;

  update public.item_transactions
  set business_id = primary_business_id
  where business_id is null;

  insert into public.business_members (business_id, user_id, role)
  select
    primary_business_id,
    users.id,
    case
      when users.email = 'owner@example.com' then 'owner'
      else 'member'
    end
  from auth.users as users
  where users.email in ('owner@example.com', 'staff@example.com')
  on conflict do nothing;
end $$;

with default_record_owner as (
  select distinct on (members.business_id)
    members.business_id,
    members.user_id,
    coalesce(users.email, 'Unknown user') as email
  from public.business_members as members
  left join auth.users as users on users.id = members.user_id
  order by
    members.business_id,
    case when members.role = 'owner' then 0 else 1 end,
    members.created_at
)
update public.milk_entries as entries
set
  created_by_user_id = owners.user_id,
  created_by_email = owners.email
from default_record_owner as owners
where entries.business_id = owners.business_id
  and (entries.created_by_user_id is null or entries.created_by_email is null);

with default_record_owner as (
  select distinct on (members.business_id)
    members.business_id,
    members.user_id,
    coalesce(users.email, 'Unknown user') as email
  from public.business_members as members
  left join auth.users as users on users.id = members.user_id
  order by
    members.business_id,
    case when members.role = 'owner' then 0 else 1 end,
    members.created_at
)
update public.transactions as entries
set
  created_by_user_id = owners.user_id,
  created_by_email = owners.email
from default_record_owner as owners
where entries.business_id = owners.business_id
  and (entries.created_by_user_id is null or entries.created_by_email is null);

with default_record_owner as (
  select distinct on (members.business_id)
    members.business_id,
    members.user_id,
    coalesce(users.email, 'Unknown user') as email
  from public.business_members as members
  left join auth.users as users on users.id = members.user_id
  order by
    members.business_id,
    case when members.role = 'owner' then 0 else 1 end,
    members.created_at
)
update public.item_transactions as entries
set
  created_by_user_id = owners.user_id,
  created_by_email = owners.email
from default_record_owner as owners
where entries.business_id = owners.business_id
  and (entries.created_by_user_id is null or entries.created_by_email is null);

alter table public.milk_entries
  alter column business_id set not null;

alter table public.milk_entries
  alter column created_by_user_id set not null;

alter table public.milk_entries
  alter column created_by_email set not null;

alter table public.transactions
  alter column business_id set not null;

alter table public.transactions
  alter column created_by_user_id set not null;

alter table public.transactions
  alter column created_by_email set not null;

alter table public.ledger_cycles
  alter column business_id set not null;

alter table public.item_transactions
  alter column business_id set not null;

alter table public.item_transactions
  alter column created_by_user_id set not null;

alter table public.item_transactions
  alter column created_by_email set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'businesses_milk_rate_check'
  ) then
    alter table public.businesses
      add constraint businesses_milk_rate_check
      check (milk_rate >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'business_members_business_id_user_id_key'
  ) then
    alter table public.business_members
      add constraint business_members_business_id_user_id_key
      unique (business_id, user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'business_members_user_id_key'
  ) then
    alter table public.business_members
      add constraint business_members_user_id_key
      unique (user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ledger_cycles_business_id_start_date_end_date_key'
  ) then
    alter table public.ledger_cycles
      add constraint ledger_cycles_business_id_start_date_end_date_key
      unique (business_id, start_date, end_date);
  end if;
end $$;

create index if not exists idx_business_members_user_id
  on public.business_members (user_id);

create index if not exists idx_milk_entries_business_id_date
  on public.milk_entries (business_id, date);

create index if not exists idx_milk_entries_business_id_creator_date
  on public.milk_entries (business_id, created_by_email, date);

create index if not exists idx_transactions_business_id_date
  on public.transactions (business_id, date);

create index if not exists idx_transactions_business_id_creator_date
  on public.transactions (business_id, created_by_email, date);

create index if not exists idx_item_transactions_business_id_date
  on public.item_transactions (business_id, date);

create index if not exists idx_item_transactions_business_id_creator_date
  on public.item_transactions (business_id, created_by_email, date);

create index if not exists idx_ledger_cycles_business_id_start_date
  on public.ledger_cycles (business_id, start_date);

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = target_business_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_business_member(uuid) to authenticated;

create or replace function public.get_cycle_bounds(target_date date)
returns table (cycle_start date, cycle_end date)
language plpgsql
immutable
as $$
declare
  month_start date := date_trunc('month', target_date)::date;
  month_end date := (date_trunc('month', target_date) + interval '1 month - 1 day')::date;
  day_number int := extract(day from target_date);
begin
  if day_number <= 10 then
    return query select month_start, month_start + 9;
  elsif day_number <= 20 then
    return query select month_start + 10, month_start + 19;
  else
    return query select month_start + 20, month_end;
  end if;
end;
$$;

create or replace function public.raise_if_cycle_closed(
  target_business_id uuid,
  target_date date
)
returns void
language plpgsql
as $$
declare
  cycle_start date;
  cycle_end date;
begin
  select bounds.cycle_start, bounds.cycle_end
  into cycle_start, cycle_end
  from public.get_cycle_bounds(target_date) as bounds;

  if exists (
    select 1
    from public.ledger_cycles
    where business_id = target_business_id
      and start_date = cycle_start
      and end_date = cycle_end
      and status = 'closed'
  ) then
    raise exception 'This settlement cycle is closed. Backtracking is not allowed.';
  end if;
end;
$$;

create or replace function public.prevent_closed_cycle_backtracking()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.raise_if_cycle_closed(old.business_id, old.date);
    return old;
  elsif tg_op = 'UPDATE' then
    perform public.raise_if_cycle_closed(old.business_id, old.date);
    perform public.raise_if_cycle_closed(new.business_id, new.date);
    return new;
  end if;

  perform public.raise_if_cycle_closed(new.business_id, new.date);
  return new;
end;
$$;

drop trigger if exists trg_milk_entries_no_closed_cycle on public.milk_entries;
create trigger trg_milk_entries_no_closed_cycle
before insert or update or delete on public.milk_entries
for each row
execute function public.prevent_closed_cycle_backtracking();

drop trigger if exists trg_transactions_no_closed_cycle on public.transactions;
create trigger trg_transactions_no_closed_cycle
before insert or update or delete on public.transactions
for each row
execute function public.prevent_closed_cycle_backtracking();

drop trigger if exists trg_item_transactions_no_closed_cycle on public.item_transactions;
create trigger trg_item_transactions_no_closed_cycle
before insert or update or delete on public.item_transactions
for each row
execute function public.prevent_closed_cycle_backtracking();

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.milk_entries enable row level security;
alter table public.transactions enable row level security;
alter table public.ledger_cycles enable row level security;
alter table public.item_transactions enable row level security;

drop policy if exists "authenticated users manage milk entries" on public.milk_entries;
drop policy if exists "authenticated users manage transactions" on public.transactions;
drop policy if exists "authenticated users manage ledger cycles" on public.ledger_cycles;
drop policy if exists "authenticated users manage item transactions" on public.item_transactions;

drop policy if exists "members view their businesses" on public.businesses;
create policy "members view their businesses"
on public.businesses
for select
to authenticated
using (public.is_business_member(id));

drop policy if exists "members update their businesses" on public.businesses;
create policy "members update their businesses"
on public.businesses
for update
to authenticated
using (public.is_business_member(id))
with check (public.is_business_member(id));

drop policy if exists "users view their own membership" on public.business_members;
create policy "users view their own membership"
on public.business_members
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "members manage milk entries" on public.milk_entries;
create policy "members manage milk entries"
on public.milk_entries
for all
to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists "members manage transactions" on public.transactions;
create policy "members manage transactions"
on public.transactions
for all
to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists "members manage ledger cycles" on public.ledger_cycles;
create policy "members manage ledger cycles"
on public.ledger_cycles
for all
to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists "members manage item transactions" on public.item_transactions;
create policy "members manage item transactions"
on public.item_transactions
for all
to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));
