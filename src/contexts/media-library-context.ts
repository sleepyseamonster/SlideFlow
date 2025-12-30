import { createContext } from 'react';

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
  collection?: 'library' | 'studio';
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
  is_studio?: boolean;
}

export interface MediaLibraryContextType {
  images: LibraryImage[];
  studioImages: LibraryImage[];
  captions: LibraryTextItem[];
  prompts: LibraryTextItem[];
  studioAvailable: boolean;
  addImages: (files: File[]) => void;
  addUploadedFiles: (uploaded: UploadedFileInfo[]) => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshStudioLibrary: () => Promise<void>;
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
  loadingStudio: boolean;
  loadingCaptions: boolean;
  loadingPrompts: boolean;
}

export const MediaLibraryContext = createContext<MediaLibraryContextType | undefined>(undefined);
