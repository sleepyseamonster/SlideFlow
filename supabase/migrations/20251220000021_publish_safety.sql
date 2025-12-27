/*
  # Publish safety metadata + audit log

  Adds immutable publish attempt metadata to carousel rows and a per-platform posting log.
*/

alter table public.carousel
  add column if not exists publish_attempt_id uuid,
  add column if not exists publish_started_at timestamptz,
  add column if not exists publish_completed_at timestamptz,
  add column if not exists publish_error text;

create table if not exists public.posting_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  carousel_id uuid not null references public.carousel(id) on delete cascade,
  connected_account_id uuid not null references public.connected_account(id) on delete cascade,
  attempt_id uuid not null,
  platform text not null,
  status text not null,
  meta_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint posting_log_platform_check check (platform in ('instagram', 'facebook')),
  constraint posting_log_status_check check (status in ('publishing', 'posted', 'failed'))
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posting_log'
      and column_name = 'response'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posting_log'
      and column_name = 'meta_response'
  ) then
    alter table public.posting_log rename column response to meta_response;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posting_log'
      and column_name = 'media_id'
  ) then
    alter table public.posting_log
      alter column media_id drop not null;
  end if;
end $$;

alter table public.posting_log
  add column if not exists carousel_id uuid,
  add column if not exists connected_account_id uuid,
  add column if not exists attempt_id uuid,
  add column if not exists meta_response jsonb,
  add column if not exists error_message text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posting_log_carousel_fkey') then
    alter table public.posting_log
      add constraint posting_log_carousel_fkey
      foreign key (carousel_id) references public.carousel(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'posting_log_connected_account_fkey') then
    alter table public.posting_log
      add constraint posting_log_connected_account_fkey
      foreign key (connected_account_id) references public.connected_account(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'posting_log_platform_check') then
    alter table public.posting_log
      add constraint posting_log_platform_check
      check (platform in ('instagram', 'facebook'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'posting_log_status_check') then
    alter table public.posting_log
      add constraint posting_log_status_check
      check (status in ('publishing', 'posted', 'failed'));
  end if;
end $$;

create index if not exists posting_log_user_idx on public.posting_log (user_id);
create index if not exists posting_log_carousel_idx on public.posting_log (carousel_id);
create index if not exists posting_log_attempt_idx on public.posting_log (attempt_id);

alter table public.posting_log enable row level security;

drop policy if exists "posting_log_select_own" on public.posting_log;
create policy "posting_log_select_own"
  on public.posting_log
  for select
  to authenticated
  using (auth.uid() = user_id);
