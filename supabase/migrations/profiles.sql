-- Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  target_language text,
  -- UTC is Coordinated Universal Time, and ALL local time zones around the world 
  -- are expressed as positive or negative offsets from UTC
  -- Ex: PST is UTC-8
  -- timestamptz stores the instant UTC time and converts to the client's timezone on read/write
  created_at timestamptz not null default now() 
);

-- Enabling row level security changes the default behavior of:
-- Any query that can reach this table being able to see every row to -->
-- No rows are visible/writable unless a policy explicity allows it
-- RLS controls which ROWS are visible
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up via Supabase Auth.
create function handle_new_user()
-- Marks this as a trigger function: gives it access to NEW/OLD row
-- and declares it as a trigger function, meaning that
-- handle_new_user can not be called on its own.
-- It can only be ran after a INSERT, UPDATE, DELETE operation
returns trigger
language plpgsql
-- Makes it so that when a user creates a new account
-- A row will be inserted into the profiles table,
-- which is something a user can not do on their own
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  -- Supabase maintains a auth users table
  after insert on auth.users
  -- for each row in this context means every row that is 
  -- affected by the insertion 
  for each row execute procedure handle_new_user();