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

export interface LibraryTextItem {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadedFileInfo {
  path: string;
  bucket: string;
  filename?: string;
  display_name?: string | null;
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

const resolveDisplayName = (file: UploadedFileInfo) => {
  if (file.display_name) return file.display_name;
  return parseOriginalName(file);
};

interface MediaLibraryContextType {
  images: LibraryImage[];
  captions: LibraryTextItem[];
  prompts: LibraryTextItem[];
  addImages: (files: File[]) => void;
  addUploadedFiles: (uploaded: UploadedFileInfo[]) => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshCaptions: () => Promise<void>;
  refreshPrompts: () => Promise<void>;
  removeImage: (id: string) => Promise<void>;
  renameImage: (id: string, newName: string) => Promise<boolean>;
  saveCaption: (text: string) => Promise<boolean>;
  savePrompt: (text: string) => Promise<boolean>;
  updateCaption: (id: string, text: string) => Promise<boolean>;
  updatePrompt: (id: string, text: string) => Promise<boolean>;
  removeCaption: (id: string) => Promise<boolean>;
  removePrompt: (id: string) => Promise<boolean>;
  clearLibrary: () => void;
  loading: boolean;
  loadingCaptions: boolean;
  loadingPrompts: boolean;
}

const MediaLibraryContext = createContext<MediaLibraryContextType | undefined>(undefined);

export function useMediaLibrary() {
  const context = useContext(MediaLibraryContext);
  if (context === undefined) {
    throw new Error('useMediaLibrary must be used within a MediaLibraryProvider');
  }
  return context;
}

interface MediaLibraryProviderProps {
  children: ReactNode;
}

export function MediaLibraryProvider({ children }: MediaLibraryProviderProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [captions, setCaptions] = useState<LibraryTextItem[]>([]);
  const [prompts, setPrompts] = useState<LibraryTextItem[]>([]);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const { user } = useAuth();

  const ensureSession = async () => {
    const session = await supabase.auth.getSession();
    if (!session.data.session) return null;
    try {
      await supabase.auth.setSession({
        access_token: session.data.session.access_token,
        refresh_token: session.data.session.refresh_token ?? '',
      });
    } catch (err) {
      console.warn('Failed to refresh Supabase session:', err);
    }
    return session.data.session;
  };

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
        .select('id, bucket, path, filename, display_name, mime_type, size_bytes, created_at')
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
        name: resolveDisplayName(file),
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

  const refreshCaptions = async () => {
    if (!user) {
      setCaptions([]);
      return;
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      setCaptions([]);
      return;
    }

    setLoadingCaptions(true);
    try {
      const { data, error } = await supabase
        .from('media_library_caption')
        .select('id, text, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      const nextCaptions: LibraryTextItem[] = (data || []).map((row) => ({
        id: row.id,
        text: row.text || '',
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || undefined,
      }));
      setCaptions(nextCaptions);
    } catch (error) {
      console.error('Failed to refresh saved captions:', error);
    } finally {
      setLoadingCaptions(false);
    }
  };

  const refreshPrompts = async () => {
    if (!user) {
      setPrompts([]);
      return;
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      setPrompts([]);
      return;
    }

    setLoadingPrompts(true);
    try {
      const { data, error } = await supabase
        .from('media_library_prompt')
        .select('id, text, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      const nextPrompts: LibraryTextItem[] = (data || []).map((row) => ({
        id: row.id,
        text: row.text || '',
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || undefined,
      }));
      setPrompts(nextPrompts);
    } catch (error) {
      console.error('Failed to refresh saved prompts:', error);
    } finally {
      setLoadingPrompts(false);
    }
  };

  useEffect(() => {
    refreshLibrary();
    refreshCaptions();
    refreshPrompts();
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
        name: resolveDisplayName(file),
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

  const renameImage = async (id: string, newName: string) => {
    const nextName = newName.trim();
    if (!nextName) return false;

    const imageToRename = images.find((img) => img.id === id);
    if (!imageToRename) return false;

    if (imageToRename.source === 'local') {
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, name: nextName } : img))
      );
      return true;
    }

    const path = imageToRename.path;
    if (!path) {
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, name: nextName } : img))
      );
      return true;
    }

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        console.warn('No Supabase session available; cannot rename image.');
        return false;
      }
      try {
        await supabase.auth.setSession({
          access_token: session.data.session.access_token,
          refresh_token: session.data.session.refresh_token ?? '',
        });
      } catch (err) {
        console.warn('Failed to refresh Supabase session before rename:', err);
      }

      const { error } = await supabase
        .from('media')
        .update({ display_name: nextName })
        .eq('path', path)
        .eq('user_id', user?.id || '');
      if (error) throw error;

      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, name: nextName } : img))
      );
      return true;
    } catch (err) {
      console.error('Failed to rename image:', err);
      return false;
    }
  };

  const saveCaption = async (text: string) => {
    const nextText = text.trim();
    if (!user || !nextText) return false;
    const session = await ensureSession();
    if (!session) return false;

    try {
      const { data, error } = await supabase
        .from('media_library_caption')
        .insert({ user_id: user.id, text: nextText })
        .select('id, text, created_at, updated_at')
        .single();
      if (error) throw error;

      if (data) {
        const newCaption: LibraryTextItem = {
          id: data.id,
          text: data.text || nextText,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || data.created_at || new Date().toISOString(),
        };
        setCaptions((prev) => [newCaption, ...prev]);
      }
      return true;
    } catch (err) {
      console.error('Failed to save caption:', err);
      return false;
    }
  };

  const savePrompt = async (text: string) => {
    const nextText = text.trim();
    if (!user || !nextText) return false;
    const session = await ensureSession();
    if (!session) return false;

    try {
      const { data, error } = await supabase
        .from('media_library_prompt')
        .insert({ user_id: user.id, text: nextText })
        .select('id, text, created_at, updated_at')
        .single();
      if (error) throw error;

      if (data) {
        const newPrompt: LibraryTextItem = {
          id: data.id,
          text: data.text || nextText,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || data.created_at || new Date().toISOString(),
        };
        setPrompts((prev) => [newPrompt, ...prev]);
      }
      return true;
    } catch (err) {
      console.error('Failed to save prompt:', err);
      return false;
    }
  };

  const updateCaption = async (id: string, text: string) => {
    const nextText = text.trim();
    if (!user || !nextText) return false;
    const session = await ensureSession();
    if (!session) return false;

    try {
      const { error } = await supabase
        .from('media_library_caption')
        .update({ text: nextText })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;

      const updatedAt = new Date().toISOString();
      setCaptions((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, text: nextText, updatedAt } : item
        )
      );
      return true;
    } catch (err) {
      console.error('Failed to update caption:', err);
      return false;
    }
  };

  const updatePrompt = async (id: string, text: string) => {
    const nextText = text.trim();
    if (!user || !nextText) return false;
    const session = await ensureSession();
    if (!session) return false;

    try {
      const { error } = await supabase
        .from('media_library_prompt')
        .update({ text: nextText })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;

      const updatedAt = new Date().toISOString();
      setPrompts((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, text: nextText, updatedAt } : item
        )
      );
      return true;
    } catch (err) {
      console.error('Failed to update prompt:', err);
      return false;
    }
  };

  const removeCaption = async (id: string) => {
    if (!user) return false;
    const session = await ensureSession();
    if (!session) return false;

    try {
      const { error } = await supabase
        .from('media_library_caption')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setCaptions((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete caption:', err);
      return false;
    }
  };

  const removePrompt = async (id: string) => {
    if (!user) return false;
    const session = await ensureSession();
    if (!session) return false;

    try {
      const { error } = await supabase
        .from('media_library_prompt')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setPrompts((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete prompt:', err);
      return false;
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
    captions,
    prompts,
    addImages,
    addUploadedFiles,
    refreshLibrary,
    refreshCaptions,
    refreshPrompts,
    removeImage,
    renameImage,
    saveCaption,
    savePrompt,
    updateCaption,
    updatePrompt,
    removeCaption,
    removePrompt,
    clearLibrary,
    loading,
    loadingCaptions,
    loadingPrompts
  };

  return (
    <MediaLibraryContext.Provider value={value}>
      {children}
    </MediaLibraryContext.Provider>
  );
}
