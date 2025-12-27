/*
  Enforce per-user Row Level Security for brand_profile presets.
  Users can only see and mutate their own brand presets.
*/

alter table if exists public.brand_profile enable row level security;

drop policy if exists "brand_profile_select_own" on public.brand_profile;
drop policy if exists "brand_profile_modify_own" on public.brand_profile;

create policy "brand_profile_select_own"
  on public.brand_profile
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "brand_profile_modify_own"
  on public.brand_profile
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

