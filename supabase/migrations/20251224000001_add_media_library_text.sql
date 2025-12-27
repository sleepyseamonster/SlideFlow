create table if not exists public.media_library_caption (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_library_caption_user_idx on public.media_library_caption (user_id);
create index if not exists media_library_caption_created_idx on public.media_library_caption (user_id, created_at desc);

alter table public.media_library_caption enable row level security;

drop policy if exists "media_library_caption_select_own" on public.media_library_caption;
create policy "media_library_caption_select_own"
  on public.media_library_caption
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "media_library_caption_modify_own" on public.media_library_caption;
create policy "media_library_caption_modify_own"
  on public.media_library_caption
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.media_library_prompt (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_library_prompt_user_idx on public.media_library_prompt (user_id);
create index if not exists media_library_prompt_created_idx on public.media_library_prompt (user_id, created_at desc);

alter table public.media_library_prompt enable row level security;

drop policy if exists "media_library_prompt_select_own" on public.media_library_prompt;
create policy "media_library_prompt_select_own"
  on public.media_library_prompt
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "media_library_prompt_modify_own" on public.media_library_prompt;
create policy "media_library_prompt_modify_own"
  on public.media_library_prompt
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    if not exists (
      select 1 from pg_trigger where tgname = 'set_updated_at_media_library_caption'
    ) then
      create trigger set_updated_at_media_library_caption
      before update on public.media_library_caption
      for each row execute function public.set_updated_at();
    end if;

    if not exists (
      select 1 from pg_trigger where tgname = 'set_updated_at_media_library_prompt'
    ) then
      create trigger set_updated_at_media_library_prompt
      before update on public.media_library_prompt
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;
