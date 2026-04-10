alter table public.milk_entries
  add column if not exists created_by_user_id uuid;

alter table public.milk_entries
  add column if not exists created_by_email text;

alter table public.transactions
  add column if not exists created_by_user_id uuid;

alter table public.transactions
  add column if not exists created_by_email text;

alter table public.item_transactions
  add column if not exists created_by_user_id uuid;

alter table public.item_transactions
  add column if not exists created_by_email text;

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
  alter column created_by_user_id set not null;

alter table public.milk_entries
  alter column created_by_email set not null;

alter table public.transactions
  alter column created_by_user_id set not null;

alter table public.transactions
  alter column created_by_email set not null;

alter table public.item_transactions
  alter column created_by_user_id set not null;

alter table public.item_transactions
  alter column created_by_email set not null;

create index if not exists idx_milk_entries_business_id_creator_date
  on public.milk_entries (business_id, created_by_email, date);

create index if not exists idx_transactions_business_id_creator_date
  on public.transactions (business_id, created_by_email, date);

create index if not exists idx_item_transactions_business_id_creator_date
  on public.item_transactions (business_id, created_by_email, date);
