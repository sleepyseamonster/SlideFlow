import React, { useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  MediaLibraryContext,
  type LibraryImage,
  type LibraryTextItem,
  type UploadedFileInfo,
} from './media-library-context';

const parseOriginalName = (file: UploadedFileInfo) => {
  if (file.filename) return file.filename;
  const base = file.path.split('/').pop() || 'file';
  const match = base.match(/^\d+_[\\w-]+_(.+)$/);
  return match?.[1] || base;
};

const resolveDisplayName = (file: UploadedFileInfo) => {
  if (file.display_name) return file.display_name;
  return parseOriginalName(file);
};

interface MediaLibraryProviderProps {
  children: ReactNode;
}

export function MediaLibraryProvider({ children }: MediaLibraryProviderProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [studioImages, setStudioImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudio, setLoadingStudio] = useState(false);
  const [studioAvailable, setStudioAvailable] = useState(true);
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

  const mapMediaRowsToImages = (
    mediaRows: Array<{
      id?: string;
      bucket?: string | null;
      path: string;
      filename?: string | null;
      display_name?: string | null;
      mime_type?: string | null;
      size_bytes?: number | null;
      created_at?: string | null;
    }>,
    signedUrls: Array<{ signedUrl: string } | null | undefined>,
    collection: 'library' | 'studio'
  ): LibraryImage[] =>
    mediaRows.map((file, idx) => ({
      id: file.path,
      url: signedUrls?.[idx]?.signedUrl || '',
      name: resolveDisplayName(file),
      uploadedAt: file.created_at || new Date().toISOString(),
      size: file.size_bytes || 0,
      path: file.path,
      bucket: file.bucket || 'media',
      source: 'supabase',
      collection,
    }));

  // Fetch all user files from Supabase storage for a given collection.
  const refreshMediaCollection = async (
    flag: 'is_library' | 'is_studio',
    setter: React.Dispatch<React.SetStateAction<LibraryImage[]>>,
    collection: 'library' | 'studio',
    setLoadingState: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (flag === 'is_studio' && !studioAvailable) {
      setter([]);
      return;
    }
    if (!user) {
      setter([]);
      return;
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      setter([]);
      return;
    }

    setLoadingState(true);
    try {
      const { data: mediaRows, error: mediaError } = await supabase
        .from('media')
        .select('id, bucket, path, filename, display_name, mime_type, size_bytes, created_at')
        .eq(flag, true)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (mediaError) throw mediaError;

      if (!mediaRows || mediaRows.length === 0) {
        setter((prev) => (collection === 'library' ? prev.filter((img) => img.source === 'local') : []));
        return;
      }

      const storage = supabase.storage.from('media');
      const { data: signedUrls, error: signedError } = await storage.createSignedUrls(
        mediaRows.map((f) => f.path),
        60 * 60 // 1 hour
      );
      if (signedError) throw signedError;

      const newImages = mapMediaRowsToImages(mediaRows, signedUrls ?? [], collection);

      setter((prev) => {
        const locals = collection === 'library' ? prev.filter((img) => img.source === 'local') : [];
        return collection === 'library' ? [...locals, ...newImages] : newImages;
      });
    } catch (error) {
      const typedError = error as { code?: string; message?: string };
      const message: string = typeof typedError?.message === 'string' ? typedError.message : '';
      if (flag === 'is_studio') {
        const missingColumn =
          typedError?.code === '42703' || message.toLowerCase().includes('is_studio');
        if (missingColumn) {
          console.warn('Studio media column missing; disabling studio tab until migration is applied.');
          setStudioAvailable(false);
          setter([]);
          setLoadingState(false);
          return;
        }
      }
      console.error(`Failed to refresh ${collection} media library:`, error);
    } finally {
      setLoadingState(false);
    }
  };

  const refreshLibrary = async () => refreshMediaCollection('is_library', setImages, 'library', setLoading);
  const refreshStudioLibrary = async () => refreshMediaCollection('is_studio', setStudioImages, 'studio', setLoadingStudio);

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
    refreshStudioLibrary();
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
      source: 'local',
      collection: 'library'
    }));

    setImages(prev => [...newImages, ...prev]);
  };

  // Add files that were uploaded to Supabase (expects bucket/path info).
  const addUploadedFiles = async (uploaded: UploadedFileInfo[]) => {
    if (!uploaded.length) return;
    const libraryOnly = uploaded.filter((f) => f.is_library);
    const studioOnly = uploaded.filter((f) => f.is_studio);
    if (!libraryOnly.length && !studioOnly.length) return;

    const session = await supabase.auth.getSession();
    if (!session.data.session) return;

    const storage = supabase.storage.from('media');
    const addUploadsForCollection = async (items: UploadedFileInfo[], collection: 'library' | 'studio') => {
      if (!items.length) return;
      const { data: signedUrls, error } = await storage.createSignedUrls(
        items.map((f) => f.path),
        60 * 60
      );
      if (error) throw error;

      const mapped: LibraryImage[] = items.map((file, idx) => ({
        id: file.path,
        url: signedUrls?.[idx]?.signedUrl || '',
        name: resolveDisplayName(file),
        uploadedAt: file.created_at || new Date().toISOString(),
        size: file.size_bytes || 0,
        path: file.path,
        bucket: file.bucket,
        source: 'supabase',
        collection,
      }));

      const setter = collection === 'library' ? setImages : setStudioImages;
      setter((prev) => {
        const existing = new Set(prev.map((img) => img.id));
        const merged = [...prev];
        mapped.forEach((img) => {
          if (!existing.has(img.id)) merged.push(img);
        });
        return merged;
      });
    };

    try {
      await addUploadsForCollection(libraryOnly, 'library');
      await addUploadsForCollection(studioOnly, 'studio');
    } catch (error) {
      console.error('Failed to add uploaded files to library:', error);
    }
  };

  const removeImage = async (id: string) => {
    const imageToRemove = images.find((img) => img.id === id) ?? studioImages.find((img) => img.id === id);
    if (!imageToRemove) return;

    // Revoke local previews immediately.
    if (imageToRemove.source === 'local') {
      URL.revokeObjectURL(imageToRemove.url);
      setImages((prev) => prev.filter((img) => img.id !== id));
      setStudioImages((prev) => prev.filter((img) => img.id !== id));
      return;
    }

    const path = imageToRemove.path;
    const bucket = imageToRemove.bucket || 'media';
    if (!path) {
      setImages((prev) => prev.filter((img) => img.id !== id));
      setStudioImages((prev) => prev.filter((img) => img.id !== id));
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
      setStudioImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  const renameImage = async (id: string, newName: string) => {
    const nextName = newName.trim();
    if (!nextName) return false;

    const imageToRename = images.find((img) => img.id === id) ?? studioImages.find((img) => img.id === id);
    if (!imageToRename) return false;
    const updateStates = (updater: (img: LibraryImage) => LibraryImage) => {
      setImages((prev) => prev.map((img) => (img.id === id ? updater(img) : img)));
      setStudioImages((prev) => prev.map((img) => (img.id === id ? updater(img) : img)));
    };

    if (imageToRename.source === 'local') {
      updateStates((img) => ({ ...img, name: nextName }));
      return true;
    }

    const path = imageToRename.path;
    if (!path) {
      updateStates((img) => ({ ...img, name: nextName }));
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

      updateStates((img) => ({ ...img, name: nextName }));
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
    const revokeLocalUrls = (items: LibraryImage[]) => {
      items.forEach((image) => {
        if (image.source === 'local') {
          URL.revokeObjectURL(image.url);
        }
      });
    };

    revokeLocalUrls(images);
    revokeLocalUrls(studioImages);
    setImages(images.filter(img => img.source === 'supabase'));
    setStudioImages(studioImages.filter((img) => img.source === 'supabase'));
  };

  const value: MediaLibraryContextType = {
    images,
    studioImages,
    captions,
    prompts,
    studioAvailable,
    addImages,
    addUploadedFiles,
    refreshLibrary,
    refreshStudioLibrary,
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
    loadingStudio,
    loadingCaptions,
    loadingPrompts
  };

  return (
    <MediaLibraryContext.Provider value={value}>
      {children}
    </MediaLibraryContext.Provider>
  );
}
