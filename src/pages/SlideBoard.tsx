import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContentLibrary, type UploadedFileInfo, type LibraryImage } from '../contexts/ContentLibraryContext';
import { useCarousel, type Carousel } from '../contexts/CarouselContext';
import { supabase } from '../lib/supabase';
import ImportLibraryModal from '../components/ImportLibraryModal';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import { 
  Upload, 
  X, 
  FolderOpen
} from 'lucide-react';

const BUCKET_NAME = "media";
const MAX_FILES = 10;
const TOTAL_APP_PAGES = 5;

const ensureSlots = <T,>(arr: Array<T | undefined>) =>
  Array.from({ length: MAX_FILES }, (_, i) => arr[i]);

const placeSlidesIntoSlots = <T,>(
  slides: Carousel['slides'],
  selector: (slide: Carousel['slides'][number], idx: number) => T | undefined
) => {
  const slots: Array<T | undefined> = Array(MAX_FILES).fill(undefined);
  slides.forEach((slide, idx) => {
    const target = typeof slide.position === 'number' && slide.position > 0 ? slide.position - 1 : idx;
    if (target >= 0 && target < MAX_FILES) {
      slots[target] = selector(slide, idx);
    }
  });
  return slots;
};

// Drag reorder handled manually in handleSlotDrop; no list helper needed.

type SlotUpload = { file: File; index: number };

export default function SlideBoard() {
  const [slotFiles, setSlotFiles] = useState<Array<File | undefined>>(Array(MAX_FILES).fill(undefined));
  const [previews, setPreviews] = useState<Array<string | undefined>>(Array(MAX_FILES).fill(undefined));
  const [slideEntries, setSlideEntries] = useState<Array<{ slideId?: string; mediaId?: string } | undefined>>(Array(MAX_FILES).fill(undefined));
  const [uploading, setUploading] = useState(false);
  const [uploadedInfos, setUploadedInfos] = useState<Array<UploadedFileInfo | undefined>>(Array(MAX_FILES).fill(undefined));
  const [creating, setCreating] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const [pendingSlots, setPendingSlots] = useState<Set<number>>(new Set());
  const [failedSlots, setFailedSlots] = useState<Record<number, string>>({});
  const slotFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const slotTargetRef = React.useRef<number | null>(null);
  
  const { user } = useAuth();
  const { addUploadedFiles } = useContentLibrary();
  const { currentCarousel, setCurrentCarousel, addCarousel } = useCarousel();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { carousel?: Carousel } | null;
  const navCarousel = navState?.carousel;
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const revokePreview = (url?: string) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const uploadOne = async (userId: string, file: File) => {
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const ts = Date.now();
    const path = `user_${userId}/${new Date().toISOString().slice(0,10)}/${ts}_${crypto.randomUUID()}_${safeName}`;
    const filename = path.split('/').pop() || safeName;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, { upsert: false });

    if (error) throw error;

    return {
      bucket: BUCKET_NAME,
      path,
      filename,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      created_at: new Date().toISOString(),
      is_library: true,
    } as UploadedFileInfo;
  };

  const setPreviewAt = (index: number, url: string | undefined) => {
    setPreviews((prev) => {
      const next = ensureSlots([...prev]);
      revokePreview(next[index]);
      next[index] = url;
      return ensureSlots(next);
    });
  };

  const setUploadedInfoAt = (index: number, info?: UploadedFileInfo) => {
    setUploadedInfos((prev) => {
      const next = ensureSlots([...prev]);
      next[index] = info;
      return ensureSlots(next);
    });
  };

  const setSlotFileAt = (index: number, file?: File) => {
    setSlotFiles((prev) => {
      const next = ensureSlots([...prev]);
      next[index] = file;
      return ensureSlots(next);
    });
  };

  const persistFileToSupabase = async (file: File, index: number) => {
    if (!user) {
      throw new Error('Please log in to upload images.');
    }
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('Your session expired. Please log back in to upload.');
    }
    const sessionData = session.data.session;
    try {
      await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token ?? "",
      });
    } catch (e) {
      console.error('Failed to set session on supabase client:', e);
    }

    const uploadedInfo = await uploadOne(user.id, file);
    const row = {
      user_id: user.id,
      bucket: uploadedInfo.bucket,
      path: uploadedInfo.path,
      filename: uploadedInfo.filename || uploadedInfo.path.split('/').pop() || 'file',
      mime_type: uploadedInfo.mime_type || 'application/octet-stream',
      size_bytes: uploadedInfo.size_bytes || 0,
      media_type: 'image',
      visibility: 'private',
      is_library: true,
    };
    const { data: mediaInsert, error } = await supabase
      .from('media')
      .insert(row)
      .select('id,bucket,path,filename,mime_type,size_bytes')
      .single();
    if (error || !mediaInsert) throw error || new Error('Failed to insert media');

    await addUploadedFiles([{ ...uploadedInfo, is_library: true }]);
    const savedInfo = { ...uploadedInfo, is_library: true, id: mediaInsert.id };
    setUploadedInfoAt(index, savedInfo);
    return savedInfo;
  };

  const uploadSlot = async (index: number) => {
    const file = slotFiles[index];
    if (!file || pendingSlots.has(index)) return;
    setPendingSlots((prev) => new Set(prev).add(index));
    setFailedSlots((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    setUploading(true);
    try {
      const info = await persistFileToSupabase(file, index);
      setUploadedInfoAt(index, info);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setFailedSlots((prev) => ({ ...prev, [index]: message }));
    } finally {
      setPendingSlots((prev) => {
        const next = new Set(prev);
        next.delete(index);
        setUploading(next.size > 0);
        return next;
      });
    }
  };

  const uploadAllMissing = async () => {
    const indices: number[] = [];
    for (let i = 0; i < MAX_FILES; i++) {
      if (slotFiles[i] && !uploadedInfos[i]) {
        indices.push(i);
      }
    }
    if (!indices.length) return;
    setUploading(true);
    for (const idx of indices) {
      await uploadSlot(idx);
    }
    setUploading(false);
  };

  const retryUpload = async (index: number) => {
    await uploadSlot(index);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const nextFiles = ensureSlots([...slotFiles]);
    const nextPreviews = ensureSlots([...previews]);
    const placements: SlotUpload[] = [];

    for (const file of files.slice(0, MAX_FILES)) {
      const slot = nextPreviews.findIndex((url, idx) => !url && !uploadedInfos[idx] && !pendingSlots.has(idx));
      if (slot === -1) break;
      nextFiles[slot] = file;
      const url = URL.createObjectURL(file);
      nextPreviews[slot] = url;
      placements.push({ file, index: slot });
    }

    setSlotFiles(nextFiles);
    setPreviews(nextPreviews);
    if (placements.length) {
      setFailedSlots((prev) => {
        const copy = { ...prev };
        placements.forEach(({ index }) => delete copy[index]);
        return copy;
      });
    }
  };

  const handleFileDrop = async (fileList: FileList, targetIndex: number, replaceTarget = false) => {
    const files = Array.from(fileList).filter(file => {
      const isImageType = file.type.startsWith('image/');
      const isImageExt = /\.(png|jpe?g)$/i.test(file.name);
      return isImageType || isImageExt;
    });

    if (!files.length) return;

    const nextFiles = ensureSlots([...slotFiles]);
    const nextPreviews = ensureSlots([...previews]);
    const nextInfos = ensureSlots([...uploadedInfos]);
    const placements: SlotUpload[] = [];
    let currentIndex = targetIndex;

    for (const file of files) {
      if (currentIndex >= MAX_FILES) break;

      // If target slot is occupied and we allow replacing, clear it first.
      if (currentIndex === targetIndex && replaceTarget && (nextPreviews[currentIndex] || nextInfos[currentIndex])) {
        revokePreview(nextPreviews[currentIndex]);
        nextFiles[currentIndex] = undefined;
        nextPreviews[currentIndex] = undefined;
        nextInfos[currentIndex] = undefined;
      }

      // Find next open slot (no preview, no uploaded info, not pending).
      while (
        currentIndex < MAX_FILES &&
        (nextPreviews[currentIndex] || nextInfos[currentIndex] || pendingSlots.has(currentIndex))
      ) {
        currentIndex += 1;
      }
      if (currentIndex >= MAX_FILES) break;

      const url = URL.createObjectURL(file);
      nextFiles[currentIndex] = file;
      nextPreviews[currentIndex] = url;
      nextInfos[currentIndex] = undefined;
      placements.push({ file, index: currentIndex });
      currentIndex += 1;
    }

    setSlotFiles(nextFiles);
    setPreviews(nextPreviews);
    setUploadedInfos(nextInfos);
    if (placements.length) {
      setFailedSlots((prev) => {
        const copy = { ...prev };
        placements.forEach(({ index }) => delete copy[index]);
        return copy;
      });
    }
  };

  const handleImportFromLibrary = async (importedImages: LibraryImage[]) => {
    if (!importedImages.length) return;
    const nextInfos = ensureSlots([...uploadedInfos]);
    const nextPreviews = ensureSlots([...previews]);
    const nextFiles = ensureSlots([...slotFiles]);

    const clearedSlots: number[] = [];
    for (const img of importedImages) {
      const slot = nextPreviews.findIndex((url, idx) => !url && !nextInfos[idx] && !pendingSlots.has(idx));
      if (slot === -1) break;
      if (!img.path || !img.bucket) continue; // skip incomplete records

      nextPreviews[slot] = img.url;
      nextFiles[slot] = undefined;
      nextInfos[slot] = {
        bucket: img.bucket,
        path: img.path,
        filename: img.name,
        mime_type: 'application/octet-stream',
        size_bytes: img.size,
        is_library: true,
      };
      clearedSlots.push(slot);
    }

    setSlotFiles(nextFiles);
    setPreviews(nextPreviews);
    setUploadedInfos(nextInfos);
    setFailedSlots((prev) => {
      const copy = { ...prev };
      clearedSlots.forEach((slot) => delete copy[slot]);
      return copy;
    });
  };

  const removeImage = async (index: number) => {
    const entry = slideEntries[index];
    const mediaInfo = uploadedInfos[index];
    revokePreview(previews[index]);
    setSlotFileAt(index, undefined);
    setPreviewAt(index, undefined);
    setUploadedInfoAt(index, undefined);
    setSlideEntries((prev) => {
      const next = ensureSlots([...prev]);
      next[index] = undefined;
      return next;
    });
    setFailedSlots((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });

    if (currentCarousel?.id && entry?.slideId) {
      try {
        await supabase
          .from('carousel_slide')
          .delete()
          .eq('id', entry.slideId)
          .eq('carousel_id', currentCarousel.id);
      } catch (err: unknown) {
        console.error('Failed to delete slide row', err);
      }
    }

    if (mediaInfo?.path && mediaInfo?.bucket) {
      try {
        await supabase.from('media').delete().eq('path', mediaInfo.path).eq('user_id', user?.id || '');
      } catch (err: unknown) {
        console.error('Failed to delete media row', err);
      }
    }

    setCurrentCarousel((prev) => {
      if (!prev) return prev;
      const nextSlides = ensureSlots<Carousel['slides'][number] | undefined>([...(prev.slides || [])]);
      nextSlides[index] = undefined;
      return { ...prev, slides: nextSlides as Carousel['slides'][number][] };
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (uploading || pendingSlots.size > 0) return;
    setDragIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, rect.height / 2);
    }
  };

  // Drag reorder handled on drop only; no-op helper kept for clarity (not used).

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const openPreview = (index: number) => {
    const url = previews[index];
    if (!url) return;
    setPreviewImage({ url, alt: `Slide ${index + 1}` });
  };

  const closePreview = () => setPreviewImage(null);

  const handleCardDrop = async (fileList: FileList) => {
    const targetIndex = previews.findIndex((slot, idx) => !slot && !uploadedInfos[idx] && !pendingSlots.has(idx));
    if (targetIndex === -1) {
      alert('All 10 slots are filled. Remove a slide to add more.');
      return;
    }
    await handleFileDrop(fileList, targetIndex);
  };

  const handleSlotFileSelect = async (files: FileList) => {
    const slotCandidate = slotTargetRef.current;
    const targetIndex =
      slotCandidate !== null
        ? slotCandidate
        : previews.findIndex((slot, idx) => !slot && !uploadedInfos[idx] && !pendingSlots.has(idx));
    if (targetIndex === -1) {
      alert('All 10 slots are filled. Remove a slide to add more.');
      return;
    }
    await handleFileDrop(files, targetIndex, true);
  };

  const handleSlotInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await handleSlotFileSelect(e.target.files);
    e.target.value = '';
    slotTargetRef.current = null;
  };

  const handleSlotDrop = async (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (uploading || pendingSlots.size > 0) return;
    if (e.dataTransfer?.files?.length) {
      await handleFileDrop(e.dataTransfer.files, index, true);
      return;
    }
    if (dragIndex === null) return;
    const from = dragIndex;
    const to = index;
    setDragIndex(null);
    if (from === to) return;

    // Work with local copies to keep arrays aligned.
    const nextPre = ensureSlots([...previews]);
    const nextFiles = ensureSlots([...slotFiles]);
    const nextInfos = ensureSlots([...uploadedInfos]);
    const nextEntries = ensureSlots([...slideEntries]);

    // Ensure we have a preview for the dragged item if it's a local file.
    if (!nextPre[from] && nextFiles[from]) {
      nextPre[from] = URL.createObjectURL(nextFiles[from] as File);
    }

    const move = (arr: Array<unknown | undefined>) => {
      const moving = arr[from];
      arr[from] = undefined;
      if (!arr[to]) {
        arr[to] = moving;
      } else {
        const empty = (() => {
          for (let offset = 0; offset < MAX_FILES; offset++) {
            const r = to + offset;
            if (r < MAX_FILES && !nextPre[r] && !nextFiles[r] && !nextInfos[r] && !pendingSlots.has(r)) return r;
            const l = to - offset;
            if (offset !== 0 && l >= 0 && !nextPre[l] && !nextFiles[l] && !nextInfos[l] && !pendingSlots.has(l)) return l;
          }
          return -1;
        })();
        if (empty !== -1) {
          arr[empty] = arr[to];
          arr[to] = moving;
        } else {
          const tmp = arr[to];
          arr[to] = moving;
          arr[from] = tmp;
        }
      }
    };

    move(nextPre);
    move(nextFiles);
    move(nextInfos);
    move(nextEntries);

    setPreviews(ensureSlots(nextPre));
    setSlotFiles(ensureSlots(nextFiles));
    setUploadedInfos(ensureSlots(nextInfos));
    setSlideEntries(ensureSlots(nextEntries));
  };

  React.useEffect(() => {
    const source = navCarousel || currentCarousel;
    if (!source?.slides?.length) return;

    // Keep the global carousel context aligned with the incoming carousel.
    if (!currentCarousel?.id && source.id) {
      setCurrentCarousel(source);
    }

    setPreviews((prev) => {
      if (prev.some(Boolean)) return prev;
      return placeSlidesIntoSlots(source.slides, (s) => s.image);
    });

    setUploadedInfos((prev) => {
      if (prev.some(Boolean)) return prev;
      return placeSlidesIntoSlots(source.slides, (s, idx) =>
        s.originalMedia
          ? { ...s.originalMedia, is_library: true }
          : ({
              bucket: '',
              path: s.id || `slide-${idx}`,
              filename: s.caption || `Slide ${idx + 1}`,
              mime_type: 'image/png',
              size_bytes: s.originalMedia?.size_bytes ?? 0,
              is_library: true,
            } as UploadedFileInfo)
      );
    });

    setSlideEntries((prev) => {
      if (prev.some((p) => p?.slideId || p?.mediaId)) return prev;
      return placeSlidesIntoSlots(source.slides, (s) => ({
        slideId: s.id,
        mediaId: s.originalMedia?.id,
      }));
    });
  }, [navCarousel, currentCarousel, setCurrentCarousel]);

  const imageCount = slotFiles.filter(Boolean).length || previews.filter(Boolean).length || uploadedInfos.filter(Boolean).length;
  const pendingUploads = pendingSlots.size;
  const canGenerate = Boolean(imageCount && !uploading && !creating && pendingUploads === 0);
  const generateLabel =
    creating ? 'Creating...' : uploading || pendingUploads ? 'Please wait' : 'Generate';
  const buttonImageSrc = canGenerate ? '/Next%20Button.png' : '/Deactivated%20Next%20Button.png';

  const persistCarouselState = async (silent = false) => {
    await uploadAllMissing();

    // Ensure any remaining local files get uploaded before we bail out.
    const needsUpload: number[] = [];
    slotFiles.forEach((file, idx) => {
      if (file && !uploadedInfos[idx]) needsUpload.push(idx);
    });
    for (const idx of needsUpload) {
      await uploadSlot(idx);
    }

    const filesWithIndex: Array<{ meta: UploadedFileInfo; index: number }> = [];
    for (let i = 0; i < uploadedInfos.length; i++) {
      const meta = uploadedInfos[i];
      if (meta) filesWithIndex.push({ meta, index: i });
    }
    if (!filesWithIndex.length) {
      if (!silent) alert('Add at least one image before continuing (upload may have failed).');
      return null;
    }

    if (!user) {
      if (!silent) alert('Please log in before continuing.');
      return null;
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      if (!silent) alert('Your session expired. Please log in again.');
      return null;
    }
    const sessionData = session.data.session;
    try {
      await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token ?? '',
      });
    } catch (err: unknown) {
      console.error('Failed to sync Supabase session:', err);
    }

    const title = 'Untitled Carousel';
    let targetCarouselId = currentCarousel?.id;

    if (!targetCarouselId) {
      const payload = {
        title,
        files: filesWithIndex.map(({ meta }) => ({
          bucket: meta.bucket,
          path: meta.path,
          mime_type: meta.mime_type || 'application/octet-stream',
          size_bytes: meta.size_bytes || 0,
        })),
        aspect: 'square',
        status: 'draft',
      };
      const { data, error } = await supabase.functions.invoke<{ carouselId?: string; carousel_id?: string }>('create-carousel', {
        body: payload,
      });
      if (error) throw error;
      targetCarouselId = data?.carouselId || data?.carousel_id || undefined;
      if (!targetCarouselId) throw new Error('Missing carouselId from create-carousel response.');
      const createdAtDisplay = new Date().toLocaleDateString();
      const carouselPayload = {
        id: targetCarouselId,
        title,
        caption: title,
        description: title,
        createdAt: createdAtDisplay,
        style: 'minimalist' as const,
        status: 'draft',
        slides: [],
      };
      addCarousel(carouselPayload as Carousel);
      setCurrentCarousel(carouselPayload as Carousel);
    }

    if (targetCarouselId) {
      await supabase.from('carousel_slide').delete().eq('carousel_id', targetCarouselId);

      const rows = filesWithIndex.map(({ meta, index }) => ({
        user_id: user.id,
        carousel_id: targetCarouselId,
        position: index + 1,
        media_id: (meta as UploadedFileInfo & { id?: string }).id,
      }));

      if (rows.length) {
        const { data: inserted, error } = await supabase
          .from('carousel_slide')
          .insert(rows)
          .select('id');
        if (error) throw error;

        const newEntries = ensureSlots([...slideEntries]);
        inserted?.forEach((row, idx) => {
          newEntries[idx] = { slideId: row.id, mediaId: rows[idx]?.media_id };
        });
        setSlideEntries(newEntries);
      }

      const slides = filesWithIndex.map(({ meta, index }) => ({
        id: slideEntries[index]?.slideId || meta.path || String(index),
        image: previews[index] || '',
        caption: '',
        position: index + 1,
        originalMedia: meta,
      }));

      setCurrentCarousel((prev) => {
        const base = prev && prev.id === targetCarouselId ? prev : ({ id: targetCarouselId } as Carousel);
        return {
          ...base,
          title,
          caption: title,
          description: title,
          slides,
          status: base.status || 'draft',
          style: base.style || 'minimalist',
          createdAt: base.createdAt || new Date().toLocaleDateString(),
        };
      });
    }

    return targetCarouselId || null;
  };

  const handleNextStep = async () => {
    if (creating || uploading) return;
    setCreating(true);
    try {
      const carouselId = await persistCarouselState();
      if (!carouselId) return;
      navigate(`/generate-caption/${carouselId}`, {
        state: {
          carouselId,
          carousel: currentCarousel,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      console.error('Next step error', err);
      alert(message);
    } finally {
      setCreating(false);
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

  // Best-effort save when leaving the page (browser close or route change unmount).
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      void persistCarouselState(true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      void persistCarouselState(true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Maintain blob preview URLs for local files so they remain visible (no state updates during render).
  React.useEffect(() => {
    setPreviews((prev) => {
      const next = ensureSlots([...prev]);
      let changed = false;

      slotFiles.forEach((file, idx) => {
        if (file) {
          if (!next[idx] || next[idx]?.startsWith('blob:') === false) {
            if (next[idx]?.startsWith('blob:')) {
              URL.revokeObjectURL(next[idx] as string);
            }
            next[idx] = URL.createObjectURL(file);
            changed = true;
          }
        } else {
          if (next[idx]?.startsWith('blob:')) {
            URL.revokeObjectURL(next[idx] as string);
            next[idx] = undefined;
            changed = true;
          }
        }
      });

      return changed ? ensureSlots(next) : prev;
    });

    return () => {
      previews.forEach((url) => {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [slotFiles, previews]);

  // Ensure local files always have a preview URL (purely visual, no Supabase).
  React.useEffect(() => {
    setPreviews((prev) => {
      const next = ensureSlots([...prev]);
      slotFiles.forEach((file, idx) => {
        if (file && !next[idx]) {
          next[idx] = URL.createObjectURL(file);
        }
      });
      return ensureSlots(next);
    });
  }, [slotFiles]);


  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      <input
        ref={slotFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSlotInputChange}
      />
      
      <main className="pt-24 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">

          <div className="grid gap-5">
            {/* Main column */}
            <div className="space-y-6">
              {/* Upload controls */}
              <div className="sf-card px-5 pt-4 pb-4 space-y-4 relative overflow-hidden">
                <img
                  src="/retro-slide.png"
                  alt="Retro accent"
                  className="absolute top-0 left-0 h-5 w-auto max-w-none object-contain pointer-events-none select-none"
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-none h-9 w-9 rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none translate-y-2">
                      1
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-vanilla">Upload media</h2>
                      <p className="text-sm text-vanilla/80 leading-snug mt-0">Drag and drop up to 10 images here, or click a button to upload or import.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <label className={`inline-flex items-center px-4 py-2 text-sm font-semibold text-sand rounded-lg cursor-pointer bg-[#225561] hover:bg-[#2f7f90] transition-colors shadow-soft ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading…' : 'Add files'}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <span className="text-vanilla/60">or</span>
                    <button
                      onClick={() => setShowImportModal(true)}
                      type="button"
                      className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-[#225561] text-sand hover:bg-[#2f7f90] transition-colors shadow-soft"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Media Library
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div
                    className="group rounded-xl border-2 border-dashed border-charcoal/70 bg-[#1f2221] p-4 shadow-[inset_0_6px_16px_rgba(0,0,0,0.45)] transition-all duration-150 ease-out hover:border-[rgba(64,160,178,0.32)] hover:bg-[#212423] hover:shadow-[0_0_0_1px_rgba(64,160,178,0.12),inset_0_6px_16px_rgba(0,0,0,0.42)]"
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer?.files?.length) {
                        handleCardDrop(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => {
                      if (uploading || pendingSlots.size > 0) return;
                      const targetIndex = previews.findIndex(
                        (slot, idx) => !slot && !uploadedInfos[idx] && !pendingSlots.has(idx)
                      );
                      if (targetIndex === -1) {
                        alert('All 10 slots are filled. Remove a slide to add more.');
                        return;
                      }
                      slotTargetRef.current = targetIndex;
                      slotFileInputRef.current?.click();
                    }}
                  >
                    <p className="text-center text-sm text-[#223535] transition-colors duration-150 group-hover:text-[rgba(64,160,178,0.65)]">
                      Drag and drop multiple images into this dropzone, or use the buttons above to upload from your device or media library.<br />
                      You may also drag and drop images directly into the slots below.
                    </p>
                  </div>
                </div>
              </div>

              {/* Slide Board */}
              <div className="relative">
              <div className="sf-card px-5 pt-4 pb-4 space-y-4 relative overflow-visible">
                <div className="absolute top-0 left-0 h-5 w-16 overflow-hidden rounded-tl-lg pointer-events-none select-none">
                  <img
                    src="/retro-slide.png"
                    alt="Retro accent"
                    className="h-full w-auto max-w-none object-contain pointer-events-none select-none"
                  />
                </div>
                  <div className="absolute right-[24px] top-2 z-30 flex items-center gap-4 -translate-y-[34px] translate-x-4">
                    {!canGenerate && (
                      <span className="text-xs text-vanilla/60 whitespace-nowrap">
                        Hint: Add an image to continue.
                      </span>
                    )}
                    <div className="text-xs text-vanilla/70">
                      {uploading
                        ? 'Uploading files...'
                        : pendingUploads
                        ? 'Finalizing uploads...'
                        : ''}
                    </div>
                    <div className="relative w-24 h-20 group">
                      <div
                        className="absolute inset-0 z-0 rounded-[4px] bg-[#0c0c0c] pointer-events-none"
                        aria-hidden="true"
                      />
                      <button
                        onClick={handleNextStep}
                        disabled={!canGenerate}
                        className={`group relative z-10 flex items-center justify-center rounded-[4px] w-full h-full overflow-hidden border transition-transform duration-200 ease-out transform-gpu ${
                          canGenerate
                            ? 'border-transparent shadow-lg shadow-pacific/30 hover:shadow-pacific/50 group-hover:translate-x-1'
                            : 'bg-surface opacity-70 border-charcoal/50 cursor-not-allowed pointer-events-none shadow-none'
                        }`}
                        aria-label="Generate carousel"
                        tabIndex={canGenerate ? 0 : -1}
                        aria-disabled={!canGenerate}
                        type="button"
                      >
                        <img
                          src={buttonImageSrc}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 block w-full h-full object-cover select-none pointer-events-none"
                        />
                        {canGenerate && (
                          <span className="absolute inset-0 z-10 flex items-center justify-center text-xl font-extrabold leading-tight text-white drop-shadow-sm">
                            Click
                          </span>
                        )}
                        {(creating || uploading || pendingUploads > 0) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-ink/55 text-xs font-semibold text-vanilla">
                            {generateLabel}
                          </div>
                        )}
                        <span className="sr-only">{generateLabel}</span>
                      </button>
                    </div>
                    <img
                      src="/blue_arrow.png"
                      alt=""
                      aria-hidden="true"
                      className={`w-4 h-auto sf-arrow-wiggle select-none pointer-events-none transition-opacity duration-150 ${
                        canGenerate ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex-none h-9 w-9 rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none translate-y-2">
                        2
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-vanilla">Slide Board</h2>
                        <p className="text-sm text-vanilla/80 leading-snug mt-0">Add, arrange, and drag to reorder up to 10 slides for your carousel.</p>
                      </div>
                    </div>
                  </div>

                <div className="space-y-3">
                    <div className="border border-charcoal/40 bg-surface rounded-lg p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {Array.from({ length: MAX_FILES }, (_, index) => {
                        const file = slotFiles[index];
                        let preview = previews[index];
                        // Fallback: if we have a file and no preview yet, create one on the fly.
                        if (file && !preview) {
                          const url = URL.createObjectURL(file);
                          preview = url;
                          setPreviews((prev) => {
                            const next = ensureSlots([...prev]);
                            next[index] = url;
                            return next;
                          });
                        }

                        const hasImage = Boolean(preview || file || uploadedInfos[index] || pendingSlots.has(index));
                        const failedMessage = failedSlots[index];
                        const isPending = pendingSlots.has(index);
                        const isDragging = dragIndex === index;
                        return (
                          <div
                            key={index}
                            className={`relative group rounded-lg aspect-square transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out ${
                              !hasImage
                                ? 'shadow-[inset_0_10px_18px_-8px_rgba(10,16,22,0.55),inset_0_0_10px_rgba(0,0,0,0.4)] border-2 border-dashed border-charcoal/50 bg-[#242321] text-vanilla/50 hover:border-[rgba(64,160,178,0.32)] hover:bg-[#212423] hover:shadow-[0_0_0_1px_rgba(64,160,178,0.12),inset_0_10px_18px_-8px_rgba(10,16,22,0.45)]'
                                : `bg-[#242321] overflow-hidden border ${isDragging ? 'border-tropical ring-2 ring-tropical/30' : 'border-charcoal/40 hover:border-[rgba(64,160,178,0.32)] hover:bg-[#212423] hover:shadow-[0_0_0_1px_rgba(64,160,178,0.12)]'}`
                            }`}
                            draggable={hasImage}
                            onDragStart={hasImage ? (e) => handleDragStart(e, index) : undefined}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer) {
                                e.dataTransfer.dropEffect = 'copy';
                              }
                            }}
                            onDragLeave={(e) => e.preventDefault()}
                            onDragEnter={(e) => e.preventDefault()}
                            onDragEnd={hasImage ? handleDragEnd : undefined}
                            onDrop={(e) => handleSlotDrop(e, index)}
                            onDoubleClick={
                              hasImage
                                ? () => openPreview(index)
                                : () => {
                                    slotTargetRef.current = index;
                                    slotFileInputRef.current?.click();
                                  }
                            }
                          >
                            {hasImage ? (
                              <>
                                {preview ? (
                                  <img
                                    src={preview}
                                    alt={`Slide ${index + 1}`}
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-vanilla/60">
                                    Preview unavailable
                                  </div>
                                )}
                                {failedMessage ? (
                                  <div className="absolute inset-0 bg-ink/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-xs text-red-200 gap-2 px-3 text-center">
                                    <span>{failedMessage}</span>
                                    <button
                                      onClick={() => retryUpload(index)}
                                      className="px-3 py-1 rounded bg-pacific text-white text-xs font-semibold hover:bg-pacific-deep"
                                    >
                                      Retry
                                    </button>
                                  </div>
                                ) : isPending ? (
                                  <div className="absolute inset-0 bg-ink/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-xs text-vanilla/80 gap-2">
                                    <div className="h-5 w-5 border-2 border-vanilla/60 border-t-transparent rounded-full animate-spin" />
                                    <span>Saving...</span>
                                  </div>
                                ) : null}
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 right-2 bg-surface text-vanilla rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium tracking-wide">
                                Slide {index + 1}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              </div>

            </div>

          </div>

          {/* Import Library Modal */}
          <ImportLibraryModal
            isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportFromLibrary}
          maxImages={10}
          currentImageCount={imageCount}
        />

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
                  alt={previewImage.alt}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-xl border border-charcoal/60 bg-surface"
                />
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-ink/80 text-xs font-semibold text-vanilla/80 shadow-soft border border-charcoal/40">
                  {previewImage.alt}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <PageDots total={TOTAL_APP_PAGES} active={1} />
    </div>
  );
}
