import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMediaLibrary } from '../contexts/useMediaLibrary';
import type { LibraryImage, LibraryTextItem } from '../contexts/media-library-context';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import { type PlanKey } from '../lib/plans';
import Navbar from '../components/Navbar';
import { 
  ArrowLeft,
  Upload, 
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  Download,
  Search,
  Grid3X3,
  List
} from 'lucide-react';

export default function MediaLibrary() {
  const {
    images,
    studioImages,
    studioAvailable,
    captions,
    prompts,
    addUploadedFiles,
    removeImage,
    renameImage,
    removeCaption,
    removePrompt,
    updateCaption,
    updatePrompt,
    saveCaption,
    savePrompt,
    refreshLibrary,
    refreshStudioLibrary,
  } = useMediaLibrary();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const renameIgnoreBlurRef = useRef(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ id: string; url: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'studio' | 'captions' | 'prompts'>('images');
  const [editingTextItem, setEditingTextItem] = useState<{
    type: 'caption' | 'prompt';
    mode: 'create' | 'edit';
    item?: LibraryTextItem;
  } | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [editingTextSaving, setEditingTextSaving] = useState(false);
  const [selectedCaptionIds, setSelectedCaptionIds] = useState<Set<string>>(new Set());
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set());
  const [deletingText, setDeletingText] = useState(false);
  const [pendingTextDelete, setPendingTextDelete] = useState<{ type: 'caption' | 'prompt' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSavingId, setRenameSavingId] = useState<string | null>(null);
  const [renameSource, setRenameSource] = useState<'inline' | 'modal' | null>(null);
  const MB = 1024 * 1024;
  const GB = 1024 * MB;
  const STORAGE_TIERS = {
    free: { label: 'Free', totalBytes: 250 * MB },
    starter: { label: 'Starter', totalBytes: 500 * MB },
    creator: { label: 'Creator', totalBytes: 1 * GB },
    studio: { label: 'Studio', totalBytes: 5 * GB },
  } as const;
  const planStorageTier: Record<PlanKey, keyof typeof STORAGE_TIERS> = {
    free: 'free',
    starter: 'starter',
    creator: 'creator',
    studio: 'studio',
  };
  const storageTierKey = user ? planStorageTier[user.plan] : 'free';
  const storageTier = STORAGE_TIERS[storageTierKey];
  const allSupabaseImages = [...images, ...studioImages].filter((image) => image.source === 'supabase');
  const uniqueSupabaseImages = Array.from(
    new Map(allSupabaseImages.map((image) => [image.id, image])).values()
  );
  const usedBytes = uniqueSupabaseImages.reduce((sum, image) => sum + image.size, 0);
  const isOverLimit = usedBytes > storageTier.totalBytes;

  const uploadOne = async (userId: string, file: File) => {
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const ts = Date.now();
    // Storage policy expects first folder = user_<auth.uid()>
    const path = `user_${userId}/${new Date().toISOString().slice(0,10)}/${ts}_${crypto.randomUUID()}_${safeName}`;
    const filename = path.split('/').pop() || safeName;

    const { error } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: false });

    if (error) throw error;

    return {
      bucket: 'media',
      path,
      filename,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      created_at: new Date().toISOString()
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!user) {
      alert('Please log in to upload to your media library.');
      return;
    }
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      alert('Your session expired. Please log back in to upload.');
      return;
    }
    // ensure supabase client is using the current session for RLS + storage
    try {
      await supabase.auth.setSession({
        access_token: session.data.session.access_token,
        refresh_token: session.data.session.refresh_token ?? "",
      });
    } catch (err) {
      console.error('Failed to set supabase session before upload:', err);
    }

    setUploading(true);
    try {
      const uploadedInfos = await Promise.all(files.map(file => uploadOne(user.id, file)));
      // Persist into media table as library assets
      const rows = uploadedInfos.map((info) => ({
        user_id: user.id,
        bucket: info.bucket,
        path: info.path,
        filename: info.filename || info.path.split('/').pop() || 'file',
        mime_type: info.mime_type || 'application/octet-stream',
        size_bytes: info.size_bytes || 0,
        media_type: 'image',
        visibility: 'private',
        is_library: true,
      }));
      const { error } = await supabase.from('media').insert(rows);
      if (error) throw error;
      await addUploadedFiles(
        uploadedInfos.map((u) => ({ ...u, is_library: true }))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      console.error('Failed to upload images:', err);
      alert(message);
    } finally {
      setUploading(false);
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentImageList = activeTab === 'studio' ? studioImages : images;

  const filteredImages = currentImageList.filter(image =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectAllVisible = () => {
    setSelectedImages(new Set(filteredImages.map(img => img.id)));
  };

  const clearSelection = () => setSelectedImages(new Set());

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTextSnippet = (text: string, limit = 140) => {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
  };

  const filteredCaptions = captions.filter((item) =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPrompts = prompts.filter((item) =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openTextEditor = (type: 'caption' | 'prompt', item: LibraryTextItem) => {
    setEditingTextItem({ type, mode: 'edit', item });
    setEditingTextValue(item.text);
  };

  const openNewText = (type: 'caption' | 'prompt') => {
    setEditingTextItem({ type, mode: 'create' });
    setEditingTextValue('');
  };

  const closeTextEditor = () => {
    setEditingTextItem(null);
    setEditingTextValue('');
  };

  const saveTextEditor = async () => {
    if (!editingTextItem) return;
    const nextText = editingTextValue.trim();
    if (!nextText) {
      alert('Text cannot be empty.');
      return;
    }

    setEditingTextSaving(true);
    const { type, mode, item } = editingTextItem;
    const ok =
      mode === 'create'
        ? type === 'caption'
          ? await saveCaption(nextText)
          : await savePrompt(nextText)
        : item
        ? type === 'caption'
          ? await updateCaption(item.id, nextText)
          : await updatePrompt(item.id, nextText)
        : false;
    setEditingTextSaving(false);

    if (!ok) {
      alert('Update failed. Please try again.');
      return;
    }
    closeTextEditor();
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedImages.size === 0 || deleting) return;
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedImages.size === 0) {
      setShowDeleteConfirm(false);
      return;
    }
    setDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        alert('Please log in again before deleting images.');
        setShowDeleteConfirm(false);
        return;
      }
      setShowDeleteConfirm(false);
      try {
        await supabase.auth.setSession({
          access_token: session.data.session.access_token,
          refresh_token: session.data.session.refresh_token ?? '',
        });
      } catch (err) {
        console.warn('Failed to refresh Supabase session before delete:', err);
      }

      const ids = Array.from(selectedImages);
      await Promise.all(ids.map((imageId) => removeImage(imageId)));
      setSelectedImages(new Set());
      await Promise.all([refreshLibrary(), refreshStudioLibrary()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed. Please try again.';
      console.error('Bulk delete failed:', err);
      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadImage = async (image: LibraryImage) => {
    try {
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error(`Download failed with ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (image.name || 'download').replace(/[\\/]/g, '_');
      link.href = objectUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download image:', err);
      window.open(image.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadText = (item: LibraryTextItem, type: 'caption' | 'prompt') => {
    const blob = new Blob([item.text], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = `${type}-${formatDate(item.updatedAt || item.createdAt).replace(/\s+/g, '-')}`.toLowerCase();
    link.href = objectUrl;
    link.download = `${safeTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const openPreview = (image: LibraryImage) => {
    if (!image.url) return;
    setPreviewImage({ id: image.id, url: image.url });
  };

  const handlePreviewDoubleClick = (e: React.MouseEvent, image: LibraryImage) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    openPreview(image);
  };

  const closePreview = () => setPreviewImage(null);

  const startRename = (image: LibraryImage, source: 'inline' | 'modal' = 'inline') => {
    setRenamingId(image.id);
    setRenameValue(image.name || '');
    setRenameSource(source);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
    setRenameSource(null);
  };

  const commitRename = async (image: LibraryImage) => {
    if (renameSavingId === image.id) return;
    const nextName = renameValue.trim();
    if (!nextName || nextName === image.name) {
      cancelRename();
      return;
    }

    setRenameSavingId(image.id);
    const ok = await renameImage(image.id, nextName);
    setRenameSavingId(null);
    if (!ok) {
      alert('Rename failed. Please try again.');
    }
    cancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, image: LibraryImage) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename(image);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      renameIgnoreBlurRef.current = true;
      cancelRename();
    }
  };

  const handleRenameBlur = (image: LibraryImage) => {
    if (renameSource === 'modal') return;
    if (renameIgnoreBlurRef.current) {
      renameIgnoreBlurRef.current = false;
      return;
    }
    commitRename(image);
  };

  const toggleTextSelection = (id: string, type: 'caption' | 'prompt') => {
    if (type === 'caption') {
      setSelectedCaptionIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      setSelectedPromptIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  };

  const selectAllText = (type: 'caption' | 'prompt') => {
    if (type === 'caption') {
      setSelectedCaptionIds((prev) => {
        if (prev.size === filteredCaptions.length) return new Set();
        return new Set(filteredCaptions.map((item) => item.id));
      });
    } else {
      setSelectedPromptIds((prev) => {
        if (prev.size === filteredPrompts.length) return new Set();
        return new Set(filteredPrompts.map((item) => item.id));
      });
    }
  };

  const handleBulkDeleteText = async (type: 'caption' | 'prompt') => {
    const selectedIds = type === 'caption' ? selectedCaptionIds : selectedPromptIds;
    if (selectedIds.size === 0 || deletingText) return;
    setPendingTextDelete({ type });
  };

  const confirmBulkDeleteText = async () => {
    if (!pendingTextDelete) return;
    const type = pendingTextDelete.type;
    const selectedIds = type === 'caption' ? selectedCaptionIds : selectedPromptIds;
    if (selectedIds.size === 0) {
      setPendingTextDelete(null);
      return;
    }
    setDeletingText(true);
    try {
      const ids = Array.from(selectedIds);
      if (type === 'caption') {
        await Promise.all(ids.map((id) => removeCaption(id)));
        setSelectedCaptionIds(new Set());
      } else {
        await Promise.all(ids.map((id) => removePrompt(id)));
        setSelectedPromptIds(new Set());
      }
      setPendingTextDelete(null);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      alert('Delete failed. Please try again.');
    } finally {
      setDeletingText(false);
    }
  };

  React.useEffect(() => {
    if (!previewImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewImage]);

  React.useEffect(() => {
    setSelectedImages(new Set());
    setSelectedCaptionIds(new Set());
    setSelectedPromptIds(new Set());
  }, [activeTab]);

  const previewRecord = previewImage
    ? [...images, ...studioImages].find((image) => image.id === previewImage.id)
    : null;
  const previewName = previewRecord?.name || 'Image preview';
  const tabCards = [
    { key: 'images' as const, label: 'Images', count: images.length, helper: 'Library' },
    { key: 'studio' as const, label: 'Studio', count: studioImages.length, helper: studioAvailable ? 'Auto-saved' : 'Unavailable' },
    { key: 'captions' as const, label: 'Captions', count: captions.length, helper: 'Saved' },
    { key: 'prompts' as const, label: 'Prompts', count: prompts.length, helper: 'Saved' },
  ];
  const editingLimit = editingTextItem?.type === 'caption' ? 2200 : 1000;
  const selectedTextCount =
    activeTab === 'captions'
      ? selectedCaptionIds.size
      : activeTab === 'prompts'
      ? selectedPromptIds.size
      : 0;
  const isImageTab = activeTab === 'images' || activeTab === 'studio';
  const imageTabLabel = activeTab === 'studio' ? 'Studio images' : 'images';

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="sf-wide-shell">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center text-pacific hover:text-vanilla font-medium mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-vanilla mb-2">Media Library</h1>
                <p className="text-vanilla/70">Manage your uploaded images</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {tabCards.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-lg px-3 py-2 shadow-sm min-w-[150px] text-left border transition-colors ${
                          isActive
                            ? 'bg-pacific/20 border-pacific/50 text-vanilla'
                            : 'bg-surface border-charcoal/50 text-vanilla/70 hover:bg-surface-alt'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wide">{tab.label}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-pacific/30 text-vanilla' : 'bg-ink/40 text-vanilla/70'
                          }`}>
                            {tab.count}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-vanilla/60">{tab.helper}</div>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/billing')}
                  className="bg-surface border border-charcoal/50 rounded-lg px-3 py-2 shadow-sm min-w-[190px] text-left hover:bg-surface-alt transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wide text-vanilla/60">Storage</p>
                    <span className="text-[10px] font-semibold text-pacific bg-pacific/15 px-2 py-0.5 rounded-full">
                      {storageTier.label}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className={`text-base font-semibold ${isOverLimit ? 'text-red-300' : 'text-vanilla'}`}>
                      {formatFileSize(usedBytes)}
                    </span>
                    <span className="text-[11px] text-vanilla/60">of {formatFileSize(storageTier.totalBytes)}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-surface rounded-lg shadow-sm p-4 mb-6 border border-charcoal/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vanilla/55" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'images'
                        ? 'Search images...'
                        : activeTab === 'studio'
                        ? 'Search studio images...'
                        : activeTab === 'captions'
                        ? 'Search captions...'
                        : 'Search prompts...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-charcoal/50 rounded-lg bg-surface focus:ring-2 focus:ring-pacific focus:border-pacific w-64"
                  />
                </div>
              </div>
              {isImageTab ? (
                <div className="flex items-center space-x-3">
                  {activeTab === 'images' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`inline-flex items-center px-4 py-2 font-medium rounded-lg transition-colors ${uploading ? 'bg-pacific/60 cursor-not-allowed text-white' : 'bg-pacific hover:bg-pacific-deep text-white'}`}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading…' : 'Upload Images'}
                    </button>
                  )}
                  {currentImageList.length > 0 && (
                    <button
                      onClick={() => {
                        if (selectedImages.size === filteredImages.length) {
                          clearSelection();
                        } else {
                          selectAllVisible();
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 bg-surface hover:bg-surface-alt text-vanilla/80 font-medium rounded-lg transition-colors border border-charcoal/50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {selectedImages.size === filteredImages.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  {selectedImages.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      type="button"
                      disabled={deleting}
                      className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors border ${
                        deleting
                          ? 'bg-surface text-red-300 border-red-400/30 cursor-not-allowed'
                          : 'bg-surface-alt hover:bg-surface text-red-400 border-red-400/30'
                      }`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting ? 'Deleting…' : `Delete (${selectedImages.size})`}
                    </button>
                  )}
                  <div className="flex bg-surface-alt rounded-lg p-1 border border-charcoal/50">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'grid' ? 'bg-surface shadow-sm' : 'hover:bg-surface'
                      }`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'list' ? 'bg-surface shadow-sm' : 'hover:bg-surface'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                  {activeTab === 'studio' && (
                    <span className="text-xs text-vanilla/60">
                      Studio outputs auto-save from AI tools.
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openNewText(activeTab === 'captions' ? 'caption' : 'prompt')}
                    className="inline-flex items-center px-4 py-2 font-medium rounded-lg transition-colors bg-pacific hover:bg-pacific-deep text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {activeTab === 'captions' ? 'New Caption' : 'New Prompt'}
                  </button>
                  {(activeTab === 'captions' ? filteredCaptions.length : filteredPrompts.length) > 0 && (
                    <button
                      onClick={() => selectAllText(activeTab === 'captions' ? 'caption' : 'prompt')}
                      className="inline-flex items-center px-4 py-2 bg-surface hover:bg-surface-alt text-vanilla/80 font-medium rounded-lg transition-colors border border-charcoal/50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {selectedTextCount === (activeTab === 'captions' ? filteredCaptions.length : filteredPrompts.length)
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  )}
                  {selectedTextCount > 0 && (
                    <button
                      onClick={() => handleBulkDeleteText(activeTab === 'captions' ? 'caption' : 'prompt')}
                      type="button"
                      disabled={deletingText}
                      className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors border ${
                        deletingText
                          ? 'bg-surface text-red-300 border-red-400/30 cursor-not-allowed'
                          : 'bg-surface-alt hover:bg-surface text-red-400 border-red-400/30'
                      }`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deletingText ? 'Deleting…' : `Delete (${selectedTextCount})`}
                    </button>
                  )}
                  <div className="flex bg-surface-alt rounded-lg p-1 border border-charcoal/50">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'grid' ? 'bg-surface shadow-sm' : 'hover:bg-surface'
                      }`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'list' ? 'bg-surface shadow-sm' : 'hover:bg-surface'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {isImageTab ? (
            filteredImages.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-charcoal/50">
                    <ImageIcon className="h-8 w-8 text-vanilla/55" />
                  </div>
                  <h3 className="text-lg font-medium text-vanilla mb-2">
                    {currentImageList.length === 0
                      ? activeTab === 'studio'
                        ? 'No studio images yet'
                        : 'No images uploaded'
                      : `No ${imageTabLabel} match your search`}
                  </h3>
                  <p className="text-vanilla/70 mb-6">
                    {currentImageList.length === 0
                      ? activeTab === 'studio'
                        ? studioAvailable
                          ? 'Edits and generations from Studio auto-save here.'
                          : 'Studio tab is unavailable until the migration runs. New outputs save to the Images tab.'
                        : 'Upload images to build your media library'
                      : 'Try adjusting your search terms'
                    }
                  </p>
                  {currentImageList.length === 0 && activeTab === 'images' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`inline-flex items-center px-4 py-2 font-medium rounded-lg transition-colors ${uploading ? 'bg-pacific/60 cursor-not-allowed text-white' : 'bg-pacific hover:bg-pacific-deep text-white'}`}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading…' : 'Upload Images'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredImages.map((image) => (
                      <div key={image.id} className="relative group bg-surface rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div
                          className="aspect-square relative"
                          onDoubleClick={(e) => handlePreviewDoubleClick(e, image)}
                        >
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-full object-cover cursor-zoom-in"
                          />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                            <div className="absolute top-2 left-2">
                              <input
                                type="checkbox"
                                checked={selectedImages.has(image.id)}
                                onChange={() => toggleImageSelection(image.id)}
                                className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleDownloadImage(image)}
                                  className="p-1.5 bg-surface/90 hover:bg-surface text-vanilla/80 rounded-md transition-colors"
                                >
                                  <Download className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => removeImage(image.id)}
                                  className="p-1.5 bg-surface/90 hover:bg-surface text-red-600 rounded-md transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          {renamingId === image.id ? (
                            <input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => handleRenameKeyDown(e, image)}
                              onBlur={() => handleRenameBlur(image)}
                              disabled={renameSavingId === image.id}
                              className="w-full text-sm font-medium text-vanilla bg-surface-alt border border-charcoal/60 rounded-md px-2 py-1"
                              autoFocus
                            />
                          ) : (
                            <p
                              className="text-sm font-medium text-vanilla truncate cursor-text"
                              title={image.name}
                              onDoubleClick={() => startRename(image, 'inline')}
                            >
                              {image.name}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-vanilla/60">{formatFileSize(image.size)}</span>
                            <span className="text-xs text-vanilla/60">{formatDate(image.uploadedAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 bg-ink text-sm font-medium text-vanilla/80">
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={selectedImages.size === filteredImages.length}
                          onChange={() => {
                            if (selectedImages.size === filteredImages.length) {
                              setSelectedImages(new Set());
                            } else {
                              setSelectedImages(new Set(filteredImages.map(img => img.id)));
                            }
                          }}
                          className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-pacific"
                        />
                      </div>
                      <div className="col-span-2">Preview</div>
                      <div className="col-span-4">Name</div>
                      <div className="col-span-2">Size</div>
                      <div className="col-span-2">Date</div>
                      <div className="col-span-1">Actions</div>
                    </div>
                    <div className="divide-y divide-charcoal/40">
                      {filteredImages.map((image) => (
                        <div key={image.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-ink transition-colors">
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={selectedImages.has(image.id)}
                              onChange={() => toggleImageSelection(image.id)}
                              className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-pacific"
                            />
                          </div>
                          <div className="col-span-2">
                            <div
                              className="w-12 h-12"
                              onDoubleClick={(e) => handlePreviewDoubleClick(e, image)}
                            >
                              <img
                                src={image.url}
                                alt={image.name}
                                className="w-12 h-12 object-cover rounded-lg cursor-zoom-in"
                              />
                            </div>
                          </div>
                          <div className="col-span-4">
                            {renamingId === image.id ? (
                              <input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => handleRenameKeyDown(e, image)}
                                onBlur={() => handleRenameBlur(image)}
                                disabled={renameSavingId === image.id}
                                className="w-full text-sm font-medium text-vanilla bg-surface-alt border border-charcoal/60 rounded-md px-2 py-1"
                                autoFocus
                              />
                            ) : (
                              <p
                                className="font-medium text-vanilla truncate cursor-text"
                                title={image.name}
                                onDoubleClick={() => startRename(image, 'inline')}
                              >
                                {image.name}
                              </p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm text-vanilla/70">{formatFileSize(image.size)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm text-vanilla/70">{formatDate(image.uploadedAt)}</span>
                          </div>
                          <div className="col-span-1">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleDownloadImage(image)}
                                className="p-1 hover:bg-surface text-vanilla/70 rounded transition-colors"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeImage(image.id)}
                                className="p-1 hover:bg-surface text-red-500 rounded transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <>
              {activeTab === 'captions' ? (
                filteredCaptions.length === 0
                  ? (
                      <div className="text-center py-12">
                        <div className="max-w-sm mx-auto">
                          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-charcoal/50">
                            <ImageIcon className="h-8 w-8 text-vanilla/55" />
                          </div>
                          <h3 className="text-lg font-medium text-vanilla mb-2">No captions saved yet</h3>
                          <p className="text-vanilla/70">
                            Save captions from the Generate page to build your library.
                          </p>
                        </div>
                      </div>
                    )
                  : (
                      <>
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredCaptions.map((item) => {
                              const isSelected = selectedCaptionIds.has(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`relative group bg-surface rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border ${
                                    isSelected ? 'border-pacific/60 ring-1 ring-pacific/30' : 'border-charcoal/50'
                                  }`}
                                  onDoubleClick={() => openTextEditor('caption', item)}
                                >
                                  <div className="absolute top-2 left-2 z-10">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleTextSelection(item.id, 'caption')}
                                      className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                  </div>
                                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadText(item, 'caption');
                                        }}
                                        className="p-1.5 bg-surface/90 hover:bg-surface text-vanilla/80 rounded-md transition-colors"
                                      >
                                        <Download className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeCaption(item.id);
                                        }}
                                        className="p-1.5 bg-surface/90 hover:bg-surface text-red-600 rounded-md transition-colors"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="aspect-square p-3 bg-ink/30 overflow-hidden">
                                    <p className="text-sm text-vanilla/80 leading-relaxed">
                                      {getTextSnippet(item.text, 260)}
                                    </p>
                                  </div>
                                  <div className="px-3 py-2 border-t border-charcoal/40 flex items-center justify-between text-xs text-vanilla/60">
                                    <span>Caption</span>
                                    <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 p-4 bg-ink text-sm font-medium text-vanilla/80">
                              <div className="col-span-1">
                                <input
                                  type="checkbox"
                                  checked={selectedCaptionIds.size === filteredCaptions.length}
                                  onChange={() => selectAllText('caption')}
                                  className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-pacific"
                                />
                              </div>
                              <div className="col-span-9">Caption</div>
                              <div className="col-span-2">Updated</div>
                            </div>
                            <div className="divide-y divide-charcoal/40">
                              {filteredCaptions.map((item) => (
                                <div
                                  key={item.id}
                                  className="grid grid-cols-12 gap-4 p-4 hover:bg-ink transition-colors cursor-pointer"
                                  onDoubleClick={() => openTextEditor('caption', item)}
                                >
                                  <div className="col-span-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedCaptionIds.has(item.id)}
                                      onChange={() => toggleTextSelection(item.id, 'caption')}
                                      className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-pacific"
                                    />
                                  </div>
                                  <div className="col-span-9 text-sm text-vanilla/80 truncate">
                                    {getTextSnippet(item.text, 160)}
                                  </div>
                                  <div className="col-span-2 text-sm text-vanilla/70">
                                    {formatDate(item.updatedAt || item.createdAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )
              ) : (
                filteredPrompts.length === 0
                  ? (
                      <div className="text-center py-12">
                        <div className="max-w-sm mx-auto">
                          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-charcoal/50">
                            <ImageIcon className="h-8 w-8 text-vanilla/55" />
                          </div>
                          <h3 className="text-lg font-medium text-vanilla mb-2">No prompts saved yet</h3>
                          <p className="text-vanilla/70">
                            Save prompts from the Generate page to reuse them quickly.
                          </p>
                        </div>
                      </div>
                    )
                  : (
                      <>
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredPrompts.map((item) => {
                              const isSelected = selectedPromptIds.has(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`relative group bg-surface rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border ${
                                    isSelected ? 'border-pacific/60 ring-1 ring-pacific/30' : 'border-charcoal/50'
                                  }`}
                                  onDoubleClick={() => openTextEditor('prompt', item)}
                                >
                                  <div className="absolute top-2 left-2 z-10">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleTextSelection(item.id, 'prompt')}
                                      className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                  </div>
                                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadText(item, 'prompt');
                                        }}
                                        className="p-1.5 bg-surface/90 hover:bg-surface text-vanilla/80 rounded-md transition-colors"
                                      >
                                        <Download className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removePrompt(item.id);
                                        }}
                                        className="p-1.5 bg-surface/90 hover:bg-surface text-red-600 rounded-md transition-colors"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="aspect-square p-3 bg-ink/30 overflow-hidden">
                                    <p className="text-sm text-vanilla/80 leading-relaxed">
                                      {getTextSnippet(item.text, 260)}
                                    </p>
                                  </div>
                                  <div className="px-3 py-2 border-t border-charcoal/40 flex items-center justify-between text-xs text-vanilla/60">
                                    <span>Prompt</span>
                                    <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 p-4 bg-ink text-sm font-medium text-vanilla/80">
                              <div className="col-span-1">
                                <input
                                  type="checkbox"
                                  checked={selectedPromptIds.size === filteredPrompts.length}
                                  onChange={() => selectAllText('prompt')}
                                  className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-pacific"
                                />
                              </div>
                              <div className="col-span-9">Prompt</div>
                              <div className="col-span-2">Updated</div>
                            </div>
                            <div className="divide-y divide-charcoal/40">
                              {filteredPrompts.map((item) => (
                                <div
                                  key={item.id}
                                  className="grid grid-cols-12 gap-4 p-4 hover:bg-ink transition-colors cursor-pointer"
                                  onDoubleClick={() => openTextEditor('prompt', item)}
                                >
                                  <div className="col-span-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedPromptIds.has(item.id)}
                                      onChange={() => toggleTextSelection(item.id, 'prompt')}
                                      className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-pacific"
                                    />
                                  </div>
                                  <div className="col-span-9 text-sm text-vanilla/80 truncate">
                                    {getTextSnippet(item.text, 160)}
                                  </div>
                                  <div className="col-span-2 text-sm text-vanilla/70">
                                    {formatDate(item.updatedAt || item.createdAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )
              )}
            </>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {editingTextItem && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
              onClick={closeTextEditor}
            >
              <div
                className="bg-surface rounded-xl shadow-xl border border-charcoal/60 w-full max-w-3xl p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-vanilla">
                      {editingTextItem.mode === 'create' ? 'Create' : 'Edit'} {editingTextItem.type === 'caption' ? 'Caption' : 'Prompt'}
                    </h3>
                    <p className="text-xs text-vanilla/60">
                      {editingTextItem.mode === 'create'
                        ? `Add a new saved ${editingTextItem.type}.`
                        : `Update your saved ${editingTextItem.type} text.`}
                    </p>
                  </div>
                  <button
                    onClick={closeTextEditor}
                    className="p-2 rounded-full hover:bg-surface-alt text-vanilla/80 border border-charcoal/50"
                    aria-label="Close editor"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={editingTextValue}
                  onChange={(e) => setEditingTextValue(e.target.value)}
                  maxLength={editingLimit}
                  className="w-full min-h-[240px] rounded-lg border border-charcoal/50 bg-ink/40 p-4 text-sm text-vanilla/85 focus:outline-none focus:ring-0 focus:border-[#39a1b2] resize-none"
                />
                <div className="flex items-center justify-between mt-2 text-xs text-vanilla/60">
                  <span>Double-check tone and length before saving.</span>
                  <span>
                    {editingTextValue.length}/{editingLimit}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    onClick={closeTextEditor}
                    className="px-4 py-2 rounded-md border border-charcoal/50 text-vanilla/70 hover:bg-surface-alt transition-colors text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTextEditor}
                    disabled={editingTextSaving}
                    className={`px-4 py-2 rounded-md border text-sm font-semibold transition-colors ${
                      editingTextSaving
                        ? 'bg-surface text-vanilla/60 border-charcoal/50 cursor-not-allowed'
                        : 'bg-pacific/20 text-vanilla border-pacific/40 hover:bg-pacific/30'
                    }`}
                  >
                    {editingTextSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
              onClick={() => {
                if (!deleting) setShowDeleteConfirm(false);
              }}
            >
              <div
                className="bg-surface border border-charcoal/60 rounded-xl shadow-soft w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bulk-delete-title"
              >
                <h3 id="bulk-delete-title" className="text-lg font-semibold text-vanilla mb-2">
                  Delete {selectedImages.size} item{selectedImages.size === 1 ? '' : 's'}?
                </h3>
                <p className="text-sm text-vanilla/75 mb-4">
                  This will permanently remove the selected media from your library. The files will be deleted and cannot be recovered.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-md border border-charcoal/60 text-vanilla/80 hover:bg-surface-alt transition-colors text-sm font-semibold disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmBulkDelete}
                    disabled={deleting}
                    className={`px-4 py-2 rounded-md border text-sm font-semibold transition-colors ${
                      deleting
                        ? 'bg-surface text-red-200 border-red-400/30 cursor-not-allowed'
                        : 'bg-red-500/10 text-red-200 border-red-400/50 hover:bg-red-500/20'
                    }`}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {pendingTextDelete && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
              onClick={() => {
                if (!deletingText) setPendingTextDelete(null);
              }}
            >
              <div
                className="bg-surface border border-charcoal/60 rounded-xl shadow-soft w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bulk-delete-text-title"
              >
                {(() => {
                  const isCaption = pendingTextDelete.type === 'caption';
                  const count = isCaption ? selectedCaptionIds.size : selectedPromptIds.size;
                  return (
                    <>
                      <h3 id="bulk-delete-text-title" className="text-lg font-semibold text-vanilla mb-2">
                        Delete {count} {isCaption ? 'caption' : 'prompt'}
                        {count === 1 ? '' : 's'}?
                      </h3>
                      <p className="text-sm text-vanilla/75 mb-4">
                        This will permanently remove the selected {isCaption ? 'captions' : 'prompts'} from your
                        library. You cannot undo this action.
                      </p>
                    </>
                  );
                })()}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={deletingText}
                    onClick={() => setPendingTextDelete(null)}
                    className="px-4 py-2 rounded-md border border-charcoal/60 text-vanilla/80 hover:bg-surface-alt transition-colors text-sm font-semibold disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmBulkDeleteText}
                    disabled={deletingText}
                    className={`px-4 py-2 rounded-md border text-sm font-semibold transition-colors ${
                      deletingText
                        ? 'bg-surface text-red-200 border-red-400/30 cursor-not-allowed'
                        : 'bg-red-500/10 text-red-200 border-red-400/50 hover:bg-red-500/20'
                    }`}
                  >
                    {deletingText ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {previewImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
              onClick={closePreview}
            >
              <div
                className="relative w-full max-w-5xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closePreview}
                  className="absolute -top-3 -right-3 bg-surface text-vanilla rounded-full p-2 shadow-soft hover:bg-surface-alt border border-charcoal/60"
                  aria-label="Close image preview"
                >
                  <X className="h-5 w-5" />
                </button>
                <img
                  src={previewImage.url}
                  alt={previewName}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-xl border border-charcoal/60 bg-surface"
                />
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1">
                    {previewRecord ? (
                      renamingId === previewRecord.id ? (
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => handleRenameKeyDown(e, previewRecord)}
                          onBlur={() => handleRenameBlur(previewRecord)}
                          disabled={renameSavingId === previewRecord.id}
                          className="w-full text-sm font-medium text-vanilla bg-surface-alt border border-charcoal/60 rounded-md px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        <p
                          className="text-sm font-semibold text-vanilla/80 cursor-text"
                          onDoubleClick={() => startRename(previewRecord, 'modal')}
                        >
                          {previewName}
                        </p>
                      )
                    ) : (
                      <p className="text-sm font-semibold text-vanilla/80">{previewName}</p>
                    )}
                  </div>
                  {previewRecord && (
                    <div className="flex items-center gap-2">
                      {renamingId === previewRecord.id ? (
                        <>
                          <button
                            onMouseDown={() => {
                              renameIgnoreBlurRef.current = true;
                            }}
                            onClick={() => commitRename(previewRecord)}
                            disabled={renameSavingId === previewRecord.id}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                              renameSavingId === previewRecord.id
                                ? 'bg-surface text-vanilla/60 border-charcoal/50 cursor-not-allowed'
                                : 'bg-pacific/20 text-vanilla border-pacific/40 hover:bg-pacific/30'
                            }`}
                          >
                            {renameSavingId === previewRecord.id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onMouseDown={() => {
                              renameIgnoreBlurRef.current = true;
                            }}
                            onClick={cancelRename}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-charcoal/50 text-vanilla/70 hover:bg-surface-alt transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startRename(previewRecord, 'modal')}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-charcoal/50 text-vanilla/80 hover:bg-surface-alt transition-colors"
                        >
                          Rename
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
