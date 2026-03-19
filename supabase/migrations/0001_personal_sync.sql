create table if not exists public.user_favorite_sets (
  user_id uuid not null references auth.users(id) on delete cascade,
  set_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz null,
  primary key (user_id, set_id)
);

create index if not exists idx_user_favorite_sets_user_updated_at
  on public.user_favorite_sets(user_id, updated_at);

create table if not exists public.user_itinerary_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('set', 'custom')),
  title text not null,
  set_id text null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  location_label text null,
  notes text null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz null
);

create index if not exists idx_user_itinerary_items_user_updated_at
  on public.user_itinerary_items(user_id, updated_at);

alter table public.user_favorite_sets enable row level security;
alter table public.user_itinerary_items enable row level security;

drop policy if exists "favorite_sets_select_own" on public.user_favorite_sets;
create policy "favorite_sets_select_own"
  on public.user_favorite_sets
  for select
  using (auth.uid() = user_id);

drop policy if exists "favorite_sets_insert_own" on public.user_favorite_sets;
create policy "favorite_sets_insert_own"
  on public.user_favorite_sets
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "favorite_sets_update_own" on public.user_favorite_sets;
create policy "favorite_sets_update_own"
  on public.user_favorite_sets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "itinerary_items_select_own" on public.user_itinerary_items;
create policy "itinerary_items_select_own"
  on public.user_itinerary_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "itinerary_items_insert_own" on public.user_itinerary_items;
create policy "itinerary_items_insert_own"
  on public.user_itinerary_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "itinerary_items_update_own" on public.user_itinerary_items;
create policy "itinerary_items_update_own"
  on public.user_itinerary_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
