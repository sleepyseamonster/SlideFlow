/*
  Enforce per-user Row Level Security across carousel-related tables.
  Users can only see and mutate their own records.
*/

-- Carousel
alter table if exists public.carousel enable row level security;
drop policy if exists "carousels_select_own" on public.carousel;
drop policy if exists "carousels_modify_own" on public.carousel;
create policy "carousels_select_own"
  on public.carousel
  for select
  to authenticated
  using (auth.uid() = user_id);
create policy "carousels_modify_own"
  on public.carousel
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Carousel slides
alter table if exists public.carousel_slide enable row level security;
drop policy if exists "slides_select_own" on public.carousel_slide;
drop policy if exists "slides_modify_own" on public.carousel_slide;
create policy "slides_select_own"
  on public.carousel_slide
  for select
  to authenticated
  using (auth.uid() = user_id);
create policy "slides_modify_own"
  on public.carousel_slide
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Media
alter table if exists public.media enable row level security;
drop policy if exists "media_select_own" on public.media;
drop policy if exists "media_modify_own" on public.media;
create policy "media_select_own"
  on public.media
  for select
  to authenticated
  using (auth.uid() = user_id);
create policy "media_modify_own"
  on public.media
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Media derivatives
alter table if exists public.media_derivative enable row level security;
drop policy if exists "media_derivative_select_own" on public.media_derivative;
drop policy if exists "media_derivative_modify_own" on public.media_derivative;
create policy "media_derivative_select_own"
  on public.media_derivative
  for select
  to authenticated
  using (auth.uid() = user_id);
create policy "media_derivative_modify_own"
  on public.media_derivative
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
