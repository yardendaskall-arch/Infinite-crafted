-- Run this in your Supabase SQL editor
-- Also run supabase/seed_combinations.sql after this to seed all hardcoded recipes

create table if not exists public.combinations (
  combo_key text primary key,
  result text not null,
  emoji text not null
);

alter table public.combinations enable row level security;
create policy "allow_read_combinations" on public.combinations for select using (true);
create policy "allow_insert_combinations" on public.combinations for insert with check (true);
create policy "allow_update_combinations" on public.combinations for update using (true);

create table if not exists public.users (
  username text primary key,
  created_at timestamptz default now()
);

create table if not exists public.world_discoveries (
  element_name text primary key,
  element_emoji text not null,
  first_discovered_by text not null,
  discovered_at timestamptz default now()
);

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  from_username text not null,
  to_username text not null,
  element_name text not null,
  element_emoji text not null,
  sent_at timestamptz default now(),
  claimed boolean default false
);

alter table public.users enable row level security;
alter table public.world_discoveries enable row level security;
alter table public.gifts enable row level security;

create policy "allow_all_users" on public.users for all using (true) with check (true);
create policy "allow_all_discoveries" on public.world_discoveries for all using (true) with check (true);
create policy "allow_all_gifts" on public.gifts for all using (true) with check (true);
