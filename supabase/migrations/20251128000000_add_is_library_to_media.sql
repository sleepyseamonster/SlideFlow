-- Add a flag to distinguish reusable library media from one-off carousel uploads
alter table public.media
  add column if not exists is_library boolean not null default false;

-- Optional: index for faster filtering
create index if not exists media_is_library_idx on public.media (is_library);
