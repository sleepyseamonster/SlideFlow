/*
  # Add public policy-docs Storage bucket

  Purpose:
  - Host public-facing legal/policy documents (Privacy Policy, Terms, Data Deletion) at stable URLs
    suitable for Meta App settings.

  Notes:
  - Bucket is public so Meta can fetch without auth.
  - Upload/write access is intended to be service-role only.
*/

-- Create the public-docs storage bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-docs',
  'public-docs',
  true,
  5242880, -- 5MB
  array['text/html', 'text/plain', 'text/markdown']
)
on conflict (id) do nothing;

-- Allow service role to manage objects in this bucket (uploads/updates/deletes via admin tooling).
-- (Reads are public via Supabase Storage when bucket is marked public.)
drop policy if exists "service_role_manage_public_docs" on storage.objects;
create policy "service_role_manage_public_docs"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'public-docs')
  with check (bucket_id = 'public-docs');
