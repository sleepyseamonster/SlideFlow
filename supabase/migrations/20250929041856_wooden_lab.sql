/*
  # Setup Media Storage Bucket and RLS Policies

  1. Storage Setup
    - Create 'media' storage bucket if it doesn't exist
    - Enable RLS on the bucket
    
  2. Security Policies
    - Allow authenticated users to upload files to their own user folder
    - Allow authenticated users to view their own uploaded files
    - Allow authenticated users to update their own files
    - Allow authenticated users to delete their own files
    
  3. Bucket Configuration
    - Set bucket to private (not publicly accessible)
    - Configure appropriate file size limits
*/

-- Create the media storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media', 
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage.objects table (should already be enabled by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files to their own user folder
CREATE POLICY "Users can upload files to own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow authenticated users to view their own uploaded files
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );