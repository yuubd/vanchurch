-- churches
create table churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- users (extends Supabase auth.users)
create type user_role as enum ('member', 'cell_leader', 'pastor', 'admin');

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  church_id uuid references churches(id) on delete cascade,
  cell_id uuid,
  name text not null,
  phone text,
  role user_role not null default 'member',
  created_at timestamptz default now()
);

-- cells
create table cells (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  name text not null,
  leader_id uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

-- add FK from users.cell_id → cells after cells table exists
alter table users add constraint users_cell_id_fkey
  foreign key (cell_id) references cells(id) on delete set null;

-- prayer_requests
create table prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  cell_id uuid references cells(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

-- attendance_records
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references cells(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  meeting_date date not null,
  present boolean not null default false,
  created_at timestamptz default now(),
  unique(user_id, meeting_date)
);

-- enable RLS on all tables
alter table churches enable row level security;
alter table users enable row level security;
alter table cells enable row level security;
alter table prayer_requests enable row level security;
alter table attendance_records enable row level security;

grant select, insert, update, delete on public.users, public.cells, public.churches, public.prayer_requests, public.attendance_records to authenticated;

-- helpers
create or replace function current_user_role()
returns user_role language sql security definer stable as $$
  select role from users where id = auth.uid()
$$;

create or replace function current_user_cell_id()
returns uuid language sql security definer stable as $$
  select cell_id from users where id = auth.uid()
$$;

create or replace function current_user_church_id()
returns uuid language sql security definer stable as $$
  select church_id from users where id = auth.uid()
$$;

-- RLS: churches
create policy "church members can read their church"
  on churches for select
  using (id = current_user_church_id());

-- RLS: users
create policy "users can read own row"
  on users for select
  using (id = auth.uid());

create policy "users can read same church members"
  on users for select
  using (church_id is not null and church_id = current_user_church_id());

create policy "users can update own profile"
  on users for update
  using (id = auth.uid());

-- RLS: cells
create policy "church members can read cells"
  on cells for select
  using (church_id = current_user_church_id());

create policy "admins can manage cells"
  on cells for all
  using (current_user_role() = 'admin');

-- RLS: prayer_requests
create policy "members can insert own requests"
  on prayer_requests for insert
  with check (user_id = auth.uid());

create policy "leaders and above can read requests"
  on prayer_requests for select
  using (
    current_user_role() in ('pastor', 'admin')
    or (current_user_role() = 'cell_leader' and cell_id = current_user_cell_id())
  );

-- RLS: attendance_records
create policy "cell leaders can manage their cell attendance"
  on attendance_records for all
  using (
    current_user_role() = 'cell_leader' and cell_id = current_user_cell_id()
  );

create policy "admins can manage all attendance"
  on attendance_records for all
  using (current_user_role() = 'admin');

-- trigger: auto-set cell_id on prayer_requests from submitting user
create or replace function set_prayer_request_cell()
returns trigger language plpgsql as $$
begin
  new.cell_id := (select cell_id from users where id = new.user_id);
  return new;
end;
$$;

create trigger prayer_request_set_cell
  before insert on prayer_requests
  for each row execute function set_prayer_request_cell();
