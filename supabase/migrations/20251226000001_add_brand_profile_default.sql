/*
  Add a persisted default brand profile per user.
*/

alter table if exists public.brand_profile
  add column if not exists is_default boolean not null default false;

create unique index if not exists brand_profile_one_default_per_user
  on public.brand_profile (user_id)
  where is_default;

