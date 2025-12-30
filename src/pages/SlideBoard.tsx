import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { type UploadedFileInfo, type LibraryImage } from '../contexts/MediaLibraryContext';
import { useCarousel } from '../contexts/useCarousel';
import type { Carousel } from '../contexts/carousel-context';
import ImportLibraryModal from '../components/ImportLibraryModal';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import { 
  Upload, 
  X, 
  FolderOpen
} from 'lucide-react';

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

type SlideDraft =
  | { kind: 'file'; index: number; file: File }
  | { kind: 'existing'; index: number; bucket: string; path: string };

const isBlobUrl = (url?: string) =>
  typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'));

const hasRemoteSlides = (carousel?: Carousel | null) =>
  Boolean(carousel?.slides?.some((slide) => typeof slide.image === 'string' && slide.image.startsWith('http')));

const hasBlobSlides = (carousel?: Carousel | null) =>
  Boolean(carousel?.slides?.some((slide) => isBlobUrl(slide.image)));

export default function SlideBoard() {
  const [slotFiles, setSlotFiles] = useState<Array<File | undefined>>(Array(MAX_FILES).fill(undefined));
  const [previews, setPreviews] = useState<Array<string | undefined>>(Array(MAX_FILES).fill(undefined));
  const [uploadedInfos, setUploadedInfos] = useState<Array<UploadedFileInfo | undefined>>(Array(MAX_FILES).fill(undefined));
  const [showImportModal, setShowImportModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const dropzoneFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const slotFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const slotTargetRef = React.useRef<number | null>(null);
  const dragPreviewRef = React.useRef<HTMLDivElement | null>(null);
  
  const { currentCarousel, setCurrentCarousel, fetchCarousel } = useCarousel();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { carousel?: Carousel } | null;
  const navCarousel = navState?.carousel;
  const [hydratedCarousel, setHydratedCarousel] = useState<Carousel | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const revokePreview = (url?: string) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
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

  const clearDragPreview = () => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove();
      dragPreviewRef.current = null;
    }
  };

  const createDragPreview = (
    imageUrl: string | undefined,
    index: number,
    width: number,
    height: number
  ) => {
    clearDragPreview();

    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.pointerEvents = 'none';
    ghost.style.top = '-9999px';
    ghost.style.left = '-9999px';
    ghost.style.width = `${width}px`;
    ghost.style.height = `${height}px`;
    ghost.style.borderRadius = '10px';
    ghost.style.overflow = 'hidden';
    ghost.style.border = '2px solid rgba(64,160,178,0.75)';
    ghost.style.boxShadow = '0 10px 28px rgba(0,0,0,0.35)';
    ghost.style.backgroundColor = '#242321';
    ghost.style.backgroundImage = imageUrl ? `url(${imageUrl})` : '';
    ghost.style.backgroundSize = 'cover';
    ghost.style.backgroundPosition = 'center';

    const badge = document.createElement('div');
    badge.textContent = String(index + 1);
    badge.style.position = 'absolute';
    badge.style.top = '6px';
    badge.style.left = '6px';
    badge.style.width = '26px';
    badge.style.height = '26px';
    badge.style.borderRadius = '9999px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.background = 'rgba(12,18,19,0.9)';
    badge.style.color = '#f5f0e8';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '800';
    badge.style.border = '1px solid rgba(57,74,77,0.8)';

    ghost.appendChild(badge);
    document.body.appendChild(ghost);
    dragPreviewRef.current = ghost;
    return ghost;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const nextFiles = ensureSlots([...slotFiles]);
    const nextPreviews = ensureSlots([...previews]);
    const placements: SlotUpload[] = [];

    for (const file of files.slice(0, MAX_FILES)) {
      const slot = nextPreviews.findIndex((url, idx) => !url && !uploadedInfos[idx] && !nextFiles[idx]);
      if (slot === -1) break;
      nextFiles[slot] = file;
      const url = URL.createObjectURL(file);
      nextPreviews[slot] = url;
      placements.push({ file, index: slot });
    }

    setSlotFiles(nextFiles);
    setPreviews(nextPreviews);
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

      // Find next open slot (no preview, no uploaded info).
      while (currentIndex < MAX_FILES && (nextPreviews[currentIndex] || nextInfos[currentIndex])) {
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
  };

  const handleImportFromLibrary = async (importedImages: LibraryImage[]) => {
    if (!importedImages.length) return;
    const nextInfos = ensureSlots([...uploadedInfos]);
    const nextPreviews = ensureSlots([...previews]);
    const nextFiles = ensureSlots([...slotFiles]);

    const clearedSlots: number[] = [];
    for (const img of importedImages) {
      const slot = nextPreviews.findIndex((url, idx) => !url && !nextInfos[idx]);
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
  };

  const removeImage = (index: number) => {
    revokePreview(previews[index]);
    setSlotFileAt(index, undefined);
    setPreviewAt(index, undefined);
    setUploadedInfoAt(index, undefined);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    const hasImage = Boolean(previews[index] || slotFiles[index] || uploadedInfos[index]);
    if (!hasImage) return;
    setDragIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      const previewUrl = previews[index];
      // Use the same fixed ghost size as the mini slide board
      // so the drag image behavior matches that experience.
      const ghost = createDragPreview(previewUrl, index, 96, 96);
      const ghostRect = ghost.getBoundingClientRect();
      e.dataTransfer.setDragImage(ghost, ghostRect.width / 2, ghostRect.height / 2);
    }
  };

  // Drag reorder handled on drop only; no-op helper kept for clarity (not used).

  const handleDragEnd = () => {
    clearDragPreview();
    setDragIndex(null);
  };

  const openPreview = (index: number) => {
    const url = previews[index];
    if (!url) return;
    setPreviewImage({ url, alt: `Slide ${index + 1}` });
  };

  const closePreview = () => setPreviewImage(null);

  const handleCardDrop = async (fileList: FileList) => {
    const targetIndex = previews.findIndex(
      (slot, idx) => !slot && !uploadedInfos[idx] && !slotFiles[idx]
    );
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
        : previews.findIndex(
            (slot, idx) => !slot && !uploadedInfos[idx] && !slotFiles[idx]
          );
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
    // If files are present, treat this as a new upload into the slot.
    if (e.dataTransfer?.files?.length) {
      await handleFileDrop(e.dataTransfer.files, index, true);
      return;
    }

    // Otherwise, this is an internal drag: swap or move only the two slots.
    if (dragIndex === null || dragIndex === index) return;
    const from = dragIndex;
    const to = index;

    const swapOrMove = <T,>(prev: Array<T | undefined>): Array<T | undefined> => {
      const next = ensureSlots([...prev]);
      const source = next[from];
      const dest = next[to];
      // Nothing to move.
      if (typeof source === 'undefined') return next;
      // If destination is empty, move source and leave origin empty.
      if (typeof dest === 'undefined') {
        next[to] = source;
        next[from] = undefined;
      } else {
        // Otherwise, swap the two.
        next[from] = dest;
        next[to] = source;
      }
      return ensureSlots(next);
    };

    setSlotFiles((prev) => swapOrMove(prev));
    setPreviews((prev) => swapOrMove(prev));
    setUploadedInfos((prev) => swapOrMove(prev));

    setDragIndex(null);
  };

  const handleSlotDragEnter = (index: number) => {
    // Keep for potential hover styling; no auto-reorder while dragging.
    if (dragIndex === null || dragIndex === index) return;
  };

  React.useEffect(() => {
    const candidate = currentCarousel ?? navCarousel;
    if (!candidate?.id || !candidate.slides?.length) return;
    if (!hasBlobSlides(candidate)) {
      setHydratedCarousel(candidate);
      return;
    }
    let cancelled = false;
    fetchCarousel(candidate.id)
      .then((fresh) => {
        if (!fresh || cancelled) return;
        setCurrentCarousel(fresh);
        setHydratedCarousel(fresh);
      })
      .catch((err) => {
        console.warn('Failed to rehydrate carousel slides:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentCarousel, navCarousel, fetchCarousel, setCurrentCarousel, setHydratedCarousel]);

  React.useEffect(() => {
    const source =
      hydratedCarousel ||
      (hasRemoteSlides(currentCarousel) ? currentCarousel : null) ||
      (hasRemoteSlides(navCarousel) ? navCarousel : null) ||
      currentCarousel ||
      navCarousel;
    if (!source?.slides?.length) return;

    // Keep the global carousel context aligned with the incoming carousel.
    if (!currentCarousel?.id && source.id) {
      setCurrentCarousel(source);
    }

    setPreviews((prev) => {
      const next = placeSlidesIntoSlots(source.slides, (s) => s.image);
      const prevHasValues = prev.some(Boolean);
      if (!prevHasValues) return next;
      const prevHasBlob = prev.some((url) => isBlobUrl(url));
      const nextHasRemote = next.some((url) => typeof url === 'string' && url.startsWith('http'));
      if (prevHasBlob && nextHasRemote) return next;
      return prev;
    });

    setUploadedInfos((prev) => {
      const next = placeSlidesIntoSlots(source.slides, (s, idx) =>
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
      if (!prev.some(Boolean)) return next;
      const prevHasBlob = previews.some((url) => isBlobUrl(url));
      const nextHasRemote = next.some((info) => Boolean(info?.bucket && info?.path));
      if (prevHasBlob && nextHasRemote) return next;
      return prev;
    });
  }, [navCarousel, currentCarousel, hydratedCarousel, previews, setCurrentCarousel]);

  const imageCount =
    slotFiles.filter(Boolean).length ||
    previews.filter(Boolean).length ||
    uploadedInfos.filter(Boolean).length;
  const canGenerate = imageCount > 0;
  const generateLabel = 'Next';
  const buttonImageSrc = canGenerate ? '/Next%20Button.png' : '/Deactivated%20Next%20Button.png';

  const handleNextStep = () => {
    if (!canGenerate) return;

    const activeCarouselId = currentCarousel?.id || navCarousel?.id;
    if (!activeCarouselId) return;

    const drafts: SlideDraft[] = [];
    for (let index = 0; index < MAX_FILES; index++) {
      const file = slotFiles[index];
      const info = uploadedInfos[index];
      if (!file && !info) continue;

      if (file) {
        drafts.push({ kind: 'file', index, file });
      } else if (info?.bucket && info?.path) {
        drafts.push({
          kind: 'existing',
          index,
          bucket: info.bucket,
          path: info.path,
        });
      }
    }
    if (!drafts.length) return;

    navigate(`/generate-caption/${activeCarouselId}`, {
      state: {
        carousel: currentCarousel ?? navCarousel ?? null,
        slideDrafts: drafts,
      },
    });
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
    return () => {
      clearDragPreview();
    };
  }, []);


  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      <input
        ref={dropzoneFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (!e.target.files?.length) return;
          // Reuse the bulk upload handler so the dropzone click
          // behaves like drag-dropping multiple files.
          void handleImageUpload(e as unknown as React.ChangeEvent<HTMLInputElement>);
          e.target.value = '';
        }}
      />
      <input
        ref={slotFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSlotInputChange}
      />
      
      <main className="pt-24 pb-24">
        <div className="sf-wide-shell space-y-5">

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
                    <label className="inline-flex items-center px-4 py-2 text-sm font-semibold text-sand rounded-lg cursor-pointer bg-[#225561] hover:bg-[#2f7f90] transition-colors shadow-soft">
                      <Upload className="h-4 w-4 mr-2" />
                      Add files
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
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
                      const targetIndex = previews.findIndex(
                        (slot, idx) => !slot && !uploadedInfos[idx] && !slotFiles[idx]
                      );
                      if (targetIndex === -1) {
                        alert('All 10 slots are filled. Remove a slide to add more.');
                        return;
                      }
                      slotTargetRef.current = targetIndex;
                      dropzoneFileInputRef.current?.click();
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
              <div className="sf-card px-5 pt-4 pb-4 space-y-4 relative overflow-hidden">
                <img
                  src="/retro-slide.png"
                  alt="Retro accent"
                  className="absolute top-0 left-0 h-5 w-auto max-w-none object-contain pointer-events-none select-none"
                />
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
                        const preview = previews[index];
                        const hasImage = Boolean(preview || file || uploadedInfos[index]);
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
                                e.dataTransfer.dropEffect = dragIndex !== null ? 'move' : 'copy';
                              }
                            }}
                            onDragEnter={() => handleSlotDragEnter(index)}
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
              <div className="pointer-events-none absolute right-[24px] -top-2 z-40 flex items-center gap-4 translate-x-4">
                {!canGenerate && (
                  <span className="text-xs text-vanilla/60 whitespace-nowrap">
                    Hint: Add an image to continue.
                  </span>
                )}
                <div className="relative w-24 h-20 group pointer-events-auto">
                  <div
                    className="absolute inset-0 z-0 rounded-[4px] bg-[#0c0c0c]"
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
                      <span className="absolute inset-0 z-10 flex items-center justify-center text-lg font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                        Continue
                      </span>
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
