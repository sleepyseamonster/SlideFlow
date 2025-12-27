-- Flag studio-generated assets separately from general library uploads
alter table public.media
  add column if not exists is_studio boolean not null default false;

-- Index for faster filtering in app queries
create index if not exists media_is_studio_idx on public.media (is_studio);
