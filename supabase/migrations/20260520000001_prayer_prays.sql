-- Replace pray_count column with a proper per-person tracking table
alter table prayer_requests drop column if exists pray_count;

create table prayer_prays (
  prayer_id uuid not null references prayer_requests(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (prayer_id, user_id)
);

alter table prayer_prays enable row level security;

grant select, insert, delete on prayer_prays to authenticated;

-- Leaders/pastors/admins can insert/delete their own pray entries
create policy "authenticated can manage own prays"
  on prayer_prays for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Members can see prays on their own prayers
create policy "members can see prays on own prayers"
  on prayer_prays for select
  using (
    prayer_id in (select id from prayer_requests where user_id = auth.uid())
    or 'pastor'      = ANY(current_user_roles())
    or 'admin'       = ANY(current_user_roles())
    or 'cell_leader' = ANY(current_user_roles())
  );

-- Drop the update policy from previous migration (no longer needed)
drop policy if exists "leaders and pastors can update pray count" on prayer_requests;
