import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface LibraryImage {
  id: string;
  file?: File;
  url: string;
  name: string;
  uploadedAt: string;
  size: number;
  path?: string;
  bucket?: string;
  source: 'local' | 'supabase';
}

export interface UploadedFileInfo {
  path: string;
  bucket: string;
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  created_at?: string;
  is_library?: boolean;
}

const parseOriginalName = (file: UploadedFileInfo) => {
  if (file.filename) return file.filename;
  const base = file.path.split('/').pop() || 'file';
  // Match patterns like "<timestamp>_<uuid>_<original>"
  const match = base.match(/^\d+_[\w-]+_(.+)$/);
  return match?.[1] || base;
};

interface ContentLibraryContextType {
  images: LibraryImage[];
  addImages: (files: File[]) => void;
  addUploadedFiles: (uploaded: UploadedFileInfo[]) => Promise<void>;
  refreshLibrary: () => Promise<void>;
  removeImage: (id: string) => Promise<void>;
  clearLibrary: () => void;
  loading: boolean;
}

const ContentLibraryContext = createContext<ContentLibraryContextType | undefined>(undefined);

export function useContentLibrary() {
  const context = useContext(ContentLibraryContext);
  if (context === undefined) {
    throw new Error('useContentLibrary must be used within a ContentLibraryProvider');
  }
  return context;
}

interface ContentLibraryProviderProps {
  children: ReactNode;
}

export function ContentLibraryProvider({ children }: ContentLibraryProviderProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Fetch all user files from Supabase storage (user/date/file structure).
  const refreshLibrary = async () => {
    if (!user) {
      setImages([]);
      return;
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      setImages([]);
      return;
    }

    setLoading(true);
    try {
      // Pull only library media rows for this user.
      const { data: mediaRows, error: mediaError } = await supabase
        .from('media')
        .select('id, bucket, path, filename, mime_type, size_bytes, created_at')
        .eq('is_library', true)
        .order('created_at', { ascending: false });
      if (mediaError) throw mediaError;

      if (!mediaRows || mediaRows.length === 0) {
        setImages(prev => prev.filter(img => img.source === 'local'));
        return;
      }

      const storage = supabase.storage.from('media');
      const { data: signedUrls, error: signedError } = await storage.createSignedUrls(
        mediaRows.map((f) => f.path),
        60 * 60 // 1 hour
      );
      if (signedError) throw signedError;

      const newImages: LibraryImage[] = mediaRows.map((file, idx) => ({
        id: file.path,
        url: signedUrls?.[idx]?.signedUrl || '',
        name: parseOriginalName(file),
        uploadedAt: file.created_at || new Date().toISOString(),
        size: file.size_bytes || 0,
        path: file.path,
        bucket: file.bucket,
        source: 'supabase'
      }));

      setImages((prev) => {
        const locals = prev.filter(img => img.source === 'local');
        return [...locals, ...newImages];
      });
    } catch (error) {
      console.error('Failed to refresh media library:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Add local files (client-side previews before upload or for immediate session use).
  const addImages = (files: File[]) => {
    const newImages: LibraryImage[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      source: 'local'
    }));

    setImages(prev => [...newImages, ...prev]);
  };

  // Add files that were uploaded to Supabase (expects bucket/path info).
  const addUploadedFiles = async (uploaded: UploadedFileInfo[]) => {
    if (!uploaded.length) return;
    // Only accept items that are explicitly flagged as library assets
    const libraryOnly = uploaded.filter((f) => f.is_library);
    if (!libraryOnly.length) return;

    const session = await supabase.auth.getSession();
    if (!session.data.session) return;

    const storage = supabase.storage.from('media');
    try {
      const { data: signedUrls, error } = await storage.createSignedUrls(
        libraryOnly.map((f) => f.path),
        60 * 60
      );
      if (error) throw error;

      const newImages: LibraryImage[] = libraryOnly.map((file, idx) => ({
        id: file.path,
        url: signedUrls?.[idx]?.signedUrl || '',
        name: parseOriginalName(file),
        uploadedAt: file.created_at || new Date().toISOString(),
        size: file.size_bytes || 0,
        path: file.path,
        bucket: file.bucket,
        source: 'supabase'
      }));

      setImages(prev => {
        const existing = new Set(prev.map(img => img.id));
        const merged = [...prev];
        newImages.forEach(img => {
          if (!existing.has(img.id)) merged.push(img);
        });
        return merged;
      });
    } catch (error) {
      console.error('Failed to add uploaded files to library:', error);
    }
  };

  const removeImage = async (id: string) => {
    const imageToRemove = images.find((img) => img.id === id);
    if (!imageToRemove) return;

    // Revoke local previews immediately.
    if (imageToRemove.source === 'local') {
      URL.revokeObjectURL(imageToRemove.url);
      setImages((prev) => prev.filter((img) => img.id !== id));
      return;
    }

    const path = imageToRemove.path;
    const bucket = imageToRemove.bucket || 'media';
    if (!path) {
      setImages((prev) => prev.filter((img) => img.id !== id));
      return;
    }

    try {
      // Ensure session for storage/table RLS.
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        console.warn('No Supabase session available; cannot delete image.');
        return;
      }
      try {
        await supabase.auth.setSession({
          access_token: session.data.session.access_token,
          refresh_token: session.data.session.refresh_token ?? '',
        });
      } catch (err) {
        console.warn('Failed to refresh Supabase session before delete:', err);
      }

      const storage = supabase.storage.from(bucket);
      await storage.remove([path]);

      await supabase
        .from('media')
        .delete()
        .eq('path', path)
        .eq('user_id', user?.id || '');
    } catch (err) {
      console.error('Failed to remove image from storage/table:', err);
    } finally {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  const clearLibrary = () => {
    images.forEach(image => {
      if (image.source === 'local') {
        URL.revokeObjectURL(image.url);
      }
    });
    setImages(images.filter(img => img.source === 'supabase'));
  };

  const value = {
    images,
    addImages,
    addUploadedFiles,
    refreshLibrary,
    removeImage,
    clearLibrary,
    loading
  };

  return (
    <ContentLibraryContext.Provider value={value}>
      {children}
    </ContentLibraryContext.Provider>
  );
}
