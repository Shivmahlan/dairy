alter table public.businesses
  add column if not exists milk_rate numeric;

update public.businesses
set milk_rate = 8.5
where milk_rate is null;

alter table public.businesses
  alter column milk_rate set default 8.5;

alter table public.businesses
  alter column milk_rate set not null;

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
end $$;

alter table public.businesses enable row level security;

drop policy if exists "members update their businesses" on public.businesses;
create policy "members update their businesses"
on public.businesses
for update
to authenticated
using (public.is_business_member(id))
with check (public.is_business_member(id));
