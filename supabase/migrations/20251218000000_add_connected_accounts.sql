/*
  # Add connected accounts (Meta/Instagram)

  This introduces a first-class connected account model for publishing:
  - `connected_account` stores the user-scoped, non-secret identifiers (IG professional account + Facebook Page).
  - `connected_account_secret` stores tokens and is service-role only.

  Notes:
  - Tokens are intentionally not readable by authenticated users (no column-level security in Postgres).
  - The UI should query `connected_account` (RLS user-scoped) to show connection status.
*/

-- Public identifiers (safe to show in UI)
create table if not exists public.connected_account (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  ig_user_id text not null,
  ig_username text,
  page_id text not null,
  page_name text,
  is_primary boolean not null default false,
  connected_at timestamptz not null default now(),
  revoked_at timestamptz default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connected_account_platform_check check (platform in ('instagram')),
  constraint connected_account_unique_user_platform_ig unique (user_id, platform, ig_user_id)
);

create index if not exists connected_account_user_idx on public.connected_account (user_id);
create index if not exists connected_account_primary_idx on public.connected_account (user_id, is_primary) where revoked_at is null;

alter table public.connected_account enable row level security;

drop policy if exists "connected_account_select_own" on public.connected_account;
create policy "connected_account_select_own"
  on public.connected_account
  for select
  to authenticated
  using (auth.uid() = user_id and revoked_at is null);

drop policy if exists "connected_account_modify_own" on public.connected_account;
create policy "connected_account_modify_own"
  on public.connected_account
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Secrets (service-role only)
create table if not exists public.connected_account_secret (
  account_id uuid primary key references public.connected_account(id) on delete cascade,
  page_access_token text not null,
  user_access_token text,
  user_access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connected_account_secret enable row level security;

drop policy if exists "connected_account_secret_service_role_only" on public.connected_account_secret;
create policy "connected_account_secret_service_role_only"
  on public.connected_account_secret
  for all
  to service_role
  using (true)
  with check (true);

-- Optional: keep updated_at fresh if the helper exists
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    if not exists (
      select 1 from pg_trigger where tgname = 'set_updated_at_connected_account'
    ) then
      create trigger set_updated_at_connected_account
      before update on public.connected_account
      for each row execute function public.set_updated_at();
    end if;

    if not exists (
      select 1 from pg_trigger where tgname = 'set_updated_at_connected_account_secret'
    ) then
      create trigger set_updated_at_connected_account_secret
      before update on public.connected_account_secret
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

