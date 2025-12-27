import React, { useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useCarousel, type Carousel } from '../contexts/CarouselContext';
import { useMediaLibrary } from '../contexts/MediaLibraryContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Instagram,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import MediaLibraryModal, { type MediaLibraryTab } from '../components/MediaLibraryModal';

const TOTAL_APP_PAGES = 5;
const MAX_PREVIEW_SLOTS = 10;
const PROMPT_MAX_LENGTH = 1000;
const CAPTION_MAX_LENGTH = 2200;
export const ASPECT_OPTIONS = [
  { value: '4:5' as const, label: '4:5 Portrait', helper: '(Recommended)' },
  { value: '1:1' as const, label: '1:1 Square', helper: 'Consistent across previews' },
];
export type AspectRatio = (typeof ASPECT_OPTIONS)[number]['value'];

type SlideDraft =
  | { kind: 'file'; index: number; file: File }
  | { kind: 'existing'; index: number; bucket: string; path: string };

async function persistDraftSlidesToSupabase(
  drafts: SlideDraft[],
  carouselId: string,
  userId: string
) {
  if (!drafts.length) return;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw sessionError || new Error('Your session expired. Please log back in to continue.');
  }

  // Ensure Supabase client has the latest session for RLS.
  const session = sessionData.session;
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? '',
  });

  await supabase
    .from('carousel_slide')
    .delete()
    .eq('carousel_id', carouselId)
    .eq('user_id', userId);

  const orderedDrafts = [...drafts].sort((a, b) => a.index - b.index);
  const slideRows: { user_id: string; carousel_id: string; position: number; media_id: string }[] = [];

  const BUCKET_NAME = 'media';

  let position = 1;
  for (const draft of orderedDrafts) {
    let mediaId: string | null = null;

    if (draft.kind === 'file') {
      const safeName = draft.file.name.replace(/[^\w.-]/g, '_');
      const ts = Date.now();
      const path = `user_${userId}/${new Date().toISOString().slice(0, 10)}/${ts}_${crypto.randomUUID()}_${safeName}`;
      const filename = path.split('/').pop() || safeName;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, draft.file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: mediaRow, error: mediaError } = await supabase
        .from('media')
        .insert({
          user_id: userId,
          bucket: BUCKET_NAME,
          path,
          filename,
          mime_type: draft.file.type || 'application/octet-stream',
          size_bytes: draft.file.size,
          media_type: 'image',
          visibility: 'private',
          is_library: false,
        })
        .select('id')
        .single();

      if (mediaError || !mediaRow?.id) {
        throw mediaError || new Error('Failed to save media for slide.');
      }
      mediaId = mediaRow.id;
    } else {
      const { data: existing, error: mediaError } = await supabase
        .from('media')
        .select('id')
        .eq('user_id', userId)
        .eq('bucket', draft.bucket)
        .eq('path', draft.path)
        .single();

      if (mediaError || !existing?.id) {
        console.warn('Missing media for existing slide draft', draft);
        continue;
      }
      mediaId = existing.id;
    }

    if (mediaId) {
      slideRows.push({
        user_id: userId,
        carousel_id: carouselId,
        position,
        media_id: mediaId,
      });
      position += 1;
    }
  }

  if (slideRows.length) {
    const { error: insertError } = await supabase
      .from('carousel_slide')
      .upsert(slideRows, { onConflict: 'carousel_id,position' });
    if (insertError) throw insertError;
  }
}

export default function GenerateCaption() {
  const { currentCarousel, setCurrentCarousel, fetchCarousel, updateCarousel } = useCarousel();
  const { user } = useAuth();
  const { savePrompt, saveCaption } = useMediaLibrary();
  const { carouselId } = useParams<{ carouselId: string }>();
  const location = useLocation();
  const navState = location.state as { carousel?: Carousel; caption?: string; slideDrafts?: SlideDraft[]; aspectRatio?: AspectRatio } | null;
  const navCarousel = navState?.carousel;
  const navCaption = navState?.caption;
  const navDrafts = navState?.slideDrafts ?? [];
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [manualCaption, setManualCaption] = useState('');
  const [captionPrompt, setCaptionPrompt] = useState('');
  const [orderedSlides, setOrderedSlides] = useState(currentCarousel?.slides ?? []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(!navCarousel && navDrafts.length === 0);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryTab, setLibraryTab] = useState<MediaLibraryTab>('prompts');
  const [promptSaving, setPromptSaving] = useState(false);
  const [captionSaving, setCaptionSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [captionSaved, setCaptionSaved] = useState(false);
  const dragPreviewRef = React.useRef<HTMLDivElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [slidesUploading, setSlidesUploading] = useState(navDrafts.length > 0);
  const [selectedAspect, setSelectedAspect] = useState<AspectRatio>(navState?.aspectRatio ?? '4:5');
  const [textModal, setTextModal] = useState<{ field: 'prompt' | 'caption'; value: string } | null>(null);
  const [sparklesTooltip, setSparklesTooltip] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [studioActive, setStudioActive] = useState(false);

  // Use any preloaded carousel from navigation state for instant preview.
  React.useEffect(() => {
    if (navCarousel) {
      setCurrentCarousel(navCarousel);
      if (!navDrafts.length) {
        setOrderedSlides(navCarousel.slides || []);
      }
      setLoading(false);
    }
  }, [navCarousel, navDrafts.length, setCurrentCarousel]);

  React.useEffect(() => {
    if (navCaption !== undefined) {
      setManualCaption(navCaption);
    }
  }, [navCaption]);

  // Fetch authoritative carousel by ID from Supabase
  React.useEffect(() => {
    if (!carouselId) return;
    if (navDrafts.length > 0 && slidesUploading) return;
    let cancelled = false;
    setLoading(true);
    fetchCarousel(carouselId)
      .then((fetched) => {
        if (cancelled) return;
        if (fetched) {
          setCurrentCarousel(fetched);
          setOrderedSlides(fetched.slides || []);
        } else {
          setCurrentCarousel(null);
          setOrderedSlides([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load carousel', err);
          setCurrentCarousel(null);
          setOrderedSlides([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [carouselId, fetchCarousel, setCurrentCarousel, navDrafts.length, slidesUploading]);

  // If we arrived from SlideBoard with draft slides, persist them to Supabase first.
  React.useEffect(() => {
    if (!carouselId || !user?.id) return;
    if (!navDrafts.length) return;
    let cancelled = false;
    const persist = async () => {
      try {
        setSlidesUploading(true);
        await persistDraftSlidesToSupabase(navDrafts, carouselId, user.id);
      } catch (err) {
        console.error('Failed to save slides to Supabase from drafts', err);
      } finally {
        if (!cancelled) {
          setSlidesUploading(false);
        }
      }
    };
    void persist();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselId, user?.id]);

  // Ensure each slide has a fresh signed URL; only hydrate once per load unless data looks incomplete.
  React.useEffect(() => {
    const shouldHydrate =
      currentCarousel?.slides?.some(
        (s) => !s.image || !s.image.startsWith('http')
      );
    if (!currentCarousel || !currentCarousel.slides?.length || hydrated || !shouldHydrate || slidesUploading) {
      return;
    }
    let cancelled = false;
    const hydrate = async () => {
      try {
        const nextSlides = await Promise.all(
          currentCarousel.slides.map(async (slide) => {
            if (slide.image && slide.image.startsWith('http')) {
              return slide;
            }
            const media = slide.originalMedia;
            if (media?.bucket && media?.path) {
              try {
                const { data, error } = await supabase.storage
                  .from(media.bucket)
                  .createSignedUrl(media.path, 60 * 60);
                if (!error && data?.signedUrl) {
                  return { ...slide, image: data.signedUrl };
                }
              } catch (err) {
                console.warn('Failed to create signed URL for slide', slide.id, err);
              }
            }
            return slide;
          })
        );
        if (!cancelled) {
          setOrderedSlides(nextSlides);
          setCurrentCarousel({ ...currentCarousel, slides: nextSlides });
          setHydrated(true);
        }
      } catch {
        // Best-effort hydration; errors are logged above.
      }
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [currentCarousel, hydrated, setCurrentCarousel]);

  React.useEffect(() => {
    if (currentCarousel) {
      setOrderedSlides(currentCarousel.slides);
      setLoading(false);
      setCurrentSlide(0);
    }
  }, [currentCarousel]);

  const handleReorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    if (from >= orderedSlides.length || to >= orderedSlides.length) return;

    const next = [...orderedSlides];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const activeId = orderedSlides[currentSlide]?.id;
    setOrderedSlides(next);
    if (currentCarousel) {
      setCurrentCarousel({ ...currentCarousel, slides: next });
    }
    if (activeId) {
      const newIndex = next.findIndex((s) => s.id === activeId);
      if (newIndex >= 0) setCurrentSlide(newIndex);
    }
  };

  const clearDragPreview = () => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove();
      dragPreviewRef.current = null;
    }
  };

  const createDragPreview = (slide: typeof orderedSlides[number], index: number) => {
    clearDragPreview();

    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.pointerEvents = 'none';
    ghost.style.top = '-9999px';
    ghost.style.left = '-9999px';
    ghost.style.width = '96px';
    ghost.style.height = '96px';
    ghost.style.borderRadius = '10px';
    ghost.style.overflow = 'hidden';
    ghost.style.border = '2px solid rgba(64,160,178,0.75)';
    ghost.style.boxShadow = '0 10px 28px rgba(0,0,0,0.35)';
    ghost.style.backgroundColor = '#242321';
    ghost.style.backgroundImage = slide?.image ? `url(${slide.image})` : '';
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (index >= orderedSlides.length) return;
    setDragIndex(index);
    const slide = orderedSlides[index];
    if (!slide || !e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    const preview = createDragPreview(slide, index);
    const rect = preview.getBoundingClientRect();
    e.dataTransfer.setDragImage(preview, rect.width / 2, rect.height / 2);
  };

  const handleDragEnter = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    if (index >= orderedSlides.length) return;
    handleReorder(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    clearDragPreview();
    setDragIndex(null);
  };

  React.useEffect(() => {
    return () => {
      clearDragPreview();
    };
  }, []);

  if (!orderedSlides.length && !slidesUploading && !loading) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">No slides found</h2>
            <Link
              to="/slideboard"
              className="sf-btn-primary inline-flex"
            >
              Create a new carousel
            </Link>
          </div>
        </div>
        <PageDots total={TOTAL_APP_PAGES} active={2} />
      </div>
    );
  }

  if (!currentCarousel && !loading && !slidesUploading) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">No carousel found</h2>
            <Link
              to="/slideboard"
              className="sf-btn-primary inline-flex"
            >
              Create a new carousel
            </Link>
          </div>
        </div>
        <PageDots total={TOTAL_APP_PAGES} active={2} />
      </div>
    );
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % orderedSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + orderedSlides.length) % orderedSlides.length);
  };

  const openTextModal = (field: 'prompt' | 'caption') => {
    setTextModal({
      field,
      value: field === 'prompt' ? captionPrompt : manualCaption,
    });
  };

  const closeTextModal = () => setTextModal(null);

  const saveTextModal = () => {
    if (!textModal) return;
    if (textModal.field === 'prompt') {
      setCaptionPrompt(textModal.value);
    } else {
      setManualCaption(textModal.value);
    }
    setTextModal(null);
  };

  const handleSparklesEnter = (e: React.MouseEvent) => {
    setSparklesTooltip({ visible: true, x: e.clientX + 16, y: e.clientY - 16 });
  };

  const handleSparklesMove = (e: React.MouseEvent) => {
    setSparklesTooltip((prev) =>
      prev.visible ? { visible: true, x: e.clientX + 16, y: e.clientY - 16 } : prev
    );
  };

  const handleSparklesLeave = () => {
    setSparklesTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleSavePrompt = async () => {
    const nextText = captionPrompt.trim();
    if (!nextText || promptSaving) return;
    setPromptSaving(true);
    const ok = await savePrompt(nextText);
    setPromptSaving(false);
    if (!ok) {
      alert('Save failed. Please try again.');
      return;
    }
    setPromptSaved(true);
    window.setTimeout(() => setPromptSaved(false), 1500);
  };

  const handleSaveCaption = async () => {
    const nextText = manualCaption.trim();
    if (!nextText || captionSaving) return;
    setCaptionSaving(true);
    const ok = await saveCaption(nextText);
    setCaptionSaving(false);
    if (!ok) {
      alert('Save failed. Please try again.');
      return;
    }
    setCaptionSaved(true);
    window.setTimeout(() => setCaptionSaved(false), 1500);
  };

  const slidesReady = !slidesUploading && !loading && orderedSlides.length > 0;
  const canReview = slidesReady;
  const goToPublish = () => {
    if (!canReview || !currentCarousel) return;
    const targetId = carouselId || currentCarousel.id;
    const captionToSend = manualCaption.trim();
    updateCarousel(targetId, { caption: captionToSend });
    const nextCarousel = { ...currentCarousel, slides: orderedSlides, caption: captionToSend };
    setCurrentCarousel(nextCarousel);
    navigate(`/publish/${targetId}`, {
      state: {
        caption: captionToSend,
        carousel: nextCarousel,
        aspectRatio: selectedAspect,
      },
    });
  };

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      
      <main className="pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link 
              to="/slideboard" 
              state={{ carousel: currentCarousel }}
              className="text-pacific hover:text-vanilla font-medium inline-flex items-center gap-2"
            >
              ← Back to Slideboard
            </Link>
          </div>

          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-3 lg:gap-4">
            <div className="space-y-4 lg:space-y-5">
              {/* Carousel Preview */}
              <div className="sf-card px-3 pt-4 pb-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg border border-charcoal/60 bg-surface/60 px-3 py-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-vanilla">Instagram aspect ratio</p>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-3">
                    {ASPECT_OPTIONS.map((option) => {
                      const isActive = selectedAspect === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedAspect(option.value)}
                          className={`inline-flex flex-col items-start px-3 py-2 rounded-md border text-left transition-colors ${
                            isActive
                              ? 'border-pacific bg-pacific/20 text-vanilla shadow-[0_0_0_1px_rgba(64,160,178,0.35)]'
                              : 'border-charcoal/60 bg-surface text-vanilla/80 hover:border-pacific/50 hover:bg-surface-alt'
                          }`}
                          aria-pressed={isActive}
                        >
                          <span className="text-sm font-semibold leading-tight">{option.label}</span>
                          <span className="text-[11px] text-vanilla/60">{option.helper}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="relative mx-auto max-w-[280px] w-full">
                  <div
                    className={`${selectedAspect === '4:5' ? 'aspect-[4/5]' : 'aspect-square'} bg-surface rounded-lg overflow-hidden border border-charcoal/50 flex items-center justify-center relative`}
                  >
                    {slidesUploading || loading || !orderedSlides.length ? (
                      <div className="flex flex-col items-center justify-center w-full h-full text-xs text-vanilla/70 gap-2">
                        <div className="h-8 w-8 border-2 border-pacific border-t-transparent rounded-full animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <img
                        src={orderedSlides[currentSlide]?.image}
                        alt={`Slide ${currentSlide + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {orderedSlides.length > 1 && (
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2">
                        {orderedSlides.map((_, idx) => (
                          <span
                            key={idx}
                            className={`h-1.5 w-1.5 rounded-full transition-colors ${
                              idx === currentSlide ? 'bg-vanilla shadow-[0_0_0_2px_rgba(0,0,0,0.35)]' : 'bg-vanilla/40'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {orderedSlides.length > 1 && (
                    <>
                      <button
                        onClick={prevSlide}
                        className="absolute -left-14 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 border border-charcoal/60 text-vanilla shadow-soft backdrop-blur-sm transition-colors hover:bg-ink/95 focus:outline-none focus:ring-2 focus:ring-pacific/60 h-11 w-11 flex items-center justify-center"
                        aria-label="Previous slide preview"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="absolute -right-14 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 border border-charcoal/60 text-vanilla shadow-soft backdrop-blur-sm transition-colors hover:bg-ink/95 focus:outline-none focus:ring-2 focus:ring-pacific/60 h-11 w-11 flex items-center justify-center"
                        aria-label="Next slide preview"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-sm text-vanilla/70">
                    <span>Slides order</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 sm:gap-1.5 max-w-[340px] sm:max-w-[360px] mx-auto w-full">
                    {Array.from({ length: MAX_PREVIEW_SLOTS }, (_, index) => {
                      const slide = orderedSlides[index];
                      const isActive = index === currentSlide;
                      const isDragging = index === dragIndex;
                      return (
                        <div
                          key={index}
                          className={`relative rounded-lg border flex items-center justify-center aspect-square overflow-hidden transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out ${
                            slide
                              ? `bg-[#242321] ${isActive ? 'border-pacific ring-2 ring-pacific/40' : 'border-charcoal/40'} ${
                                  isDragging
                                    ? 'ring-2 ring-tropical/40 border-tropical shadow-lg shadow-tropical/25 scale-[1.02]'
                                    : 'hover:border-[rgba(64,160,178,0.32)] hover:bg-[#212423] hover:shadow-[0_0_0_1px_rgba(64,160,178,0.12)]'
                                }`
                              : 'border-dashed border-charcoal/40 bg-surface/60 text-vanilla/40 hover:border-[rgba(64,160,178,0.28)] hover:bg-[#252726]'
                          }`}
                          draggable={!!slide}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnter={() => handleDragEnter(index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnd={handleDragEnd}
                          onClick={() => slide && setCurrentSlide(index)}
                        >
                          <span className="absolute top-1 left-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-xs font-semibold text-vanilla/70 border border-charcoal/60">
                            {index + 1}
                          </span>
                          {slide ? (
                            <img
                              src={slide.image}
                              alt={`Slide ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-medium text-vanilla/50">Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-vanilla/60 text-center">Drag to reorder slides. Uploads are disabled here.</p>
                </div>
              </div>
            </div>

            {/* Caption + sharing */}
            <div className="flex flex-col gap-4 h-full">
              {/* Generate */}
              <div className="relative">
                <div className="absolute right-4 -top-4 z-20 flex items-center gap-3 translate-x-[8px] translate-y-[7px]">
                  {!canReview && (
                    <span className="text-xs text-vanilla/60 whitespace-nowrap">
                      Hint: Wait for slides to finish loading.
                    </span>
                  )}
                  <div className="relative w-24 h-20 group">
                    <div
                      className="absolute inset-0 z-0 rounded-[4px] bg-[#0c0c0c] pointer-events-none"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (canReview) {
                          goToPublish();
                        }
                      }}
                      disabled={!canReview}
                      className={`group relative z-10 flex items-center justify-center rounded-[4px] w-full h-full overflow-hidden border transition-transform duration-200 ease-out transform-gpu ${
                        canReview
                          ? 'border-transparent shadow-lg shadow-pacific/30 hover:shadow-pacific/50 group-hover:translate-x-1'
                          : 'bg-surface opacity-70 border-charcoal/50 cursor-not-allowed pointer-events-none shadow-none'
                      }`}
                      aria-label="Review carousel"
                      tabIndex={canReview ? 0 : -1}
                      aria-disabled={!canReview}
                    >
                      <img
                        src={canReview ? '/Next%20Button.png' : '/Deactivated%20Next%20Button.png'}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 block w-full h-full object-cover select-none pointer-events-none"
                      />
                      {!canReview && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                          <div className="h-5 w-5 border-2 border-pacific border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {canReview && (
                        <span className="absolute inset-0 z-10 flex items-center justify-center text-lg font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                          Continue
                        </span>
                      )}
                    </button>
                  </div>
                  <img
                    src="/blue_arrow.png"
                    alt=""
                    aria-hidden="true"
                    className={`w-4 h-auto sf-arrow-wiggle select-none pointer-events-none transition-opacity duration-150 ${
                      canReview ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
                <div className="sf-card px-5 pt-3 pb-2 space-y-3 relative overflow-hidden flex flex-col h-full">
                  <img
                    src="/retro-slide.png"
                    alt="Retro accent"
                    className="absolute top-0 left-0 h-5 w-auto max-w-none object-contain pointer-events-none select-none"
                  />
                  <div className="flex items-start gap-3">
                    <div className="flex-none h-9 w-9 rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none translate-y-2">
                      3
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-vanilla">Generate</h3>
                      <p className="text-sm text-vanilla/80 leading-snug mt-0">Type a prompt or choose one from your Media Library.</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-charcoal/60 bg-surface-alt p-4 space-y-3 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-vanilla">Prompt to generate</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLibraryTab('prompts');
                            setShowLibraryModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border border-[#225561] bg-[#225561] text-sand hover:bg-[#2f7f90] hover:border-[#2f7f90]"
                          aria-label="Open media library"
                        >
                          <FolderOpen className="h-4 w-4" />
                          Media Library
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePrompt}
                          disabled={!captionPrompt.trim() || promptSaving}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                            !captionPrompt.trim() || promptSaving
                              ? 'bg-surface text-vanilla/50 border-charcoal/60 cursor-not-allowed'
                              : 'border-[#225561] bg-[#225561] text-sand hover:bg-[#2f7f90] hover:border-[#2f7f90]'
                          }`}
                          aria-label="Save prompt"
                        >
                          <Save className="h-4 w-4" />
                          {promptSaving ? 'Saving…' : promptSaved ? 'Saved' : 'Save Prompt'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualCaption(captionPrompt)}
                          disabled={!captionPrompt.trim()}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                            captionPrompt.trim()
                              ? 'bg-pacific text-white border-pacific/70 hover:bg-pacific-deep'
                              : 'bg-surface text-vanilla/50 border-charcoal/60 cursor-not-allowed'
                          }`}
                          aria-label="Generate caption from prompt"
                        >
                          Generate
                        </button>
                        <span
                          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 border border-charcoal/60 text-tropical shadow-soft"
                          onMouseEnter={handleSparklesEnter}
                          onMouseMove={handleSparklesMove}
                          onMouseLeave={handleSparklesLeave}
                        >
                          <Sparkles className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                    <textarea
                      value={captionPrompt}
                      onChange={(e) => setCaptionPrompt(e.target.value)}
                      onDoubleClick={() => openTextModal('prompt')}
                      placeholder="Example: Energetic caption for a 5-slide carousel about daily systems for freelancers."
                      className="w-full h-24 px-4 py-3 border border-charcoal/50 rounded-lg bg-ink/40 focus:outline-none focus:ring-0 focus:border-[#39a1b2] resize-none text-vanilla/80 placeholder:text-vanilla/50"
                      maxLength={PROMPT_MAX_LENGTH}
                    />
                    <div className="flex items-center justify-between text-xs text-vanilla/60">
                      <span>Hint: Give the vibe, hook, and audience. AI will write from here.</span>
                      <span>{captionPrompt.length}/{PROMPT_MAX_LENGTH}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex-1">
                <div className="sf-card px-5 pt-3 pb-3 space-y-3 flex flex-col h-full">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-md bg-pacific/20 text-pacific flex items-center justify-center translate-y-1">
                        <Instagram className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold text-vanilla">Caption</h3>
                        <p className="text-sm text-vanilla/80 leading-snug mt-0">Write your final Instagram caption here.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLibraryTab('captions');
                          setShowLibraryModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border border-[#225561] bg-[#225561] text-sand hover:bg-[#2f7f90] hover:border-[#2f7f90]"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Media Library
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCaption}
                        disabled={!manualCaption.trim() || captionSaving}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                          !manualCaption.trim() || captionSaving
                            ? 'bg-surface text-vanilla/50 border-charcoal/60 cursor-not-allowed'
                            : 'border-[#225561] bg-[#225561] text-sand hover:bg-[#2f7f90] hover:border-[#2f7f90]'
                        }`}
                      >
                        <Save className="h-4 w-4" />
                        {captionSaving ? 'Saving…' : captionSaved ? 'Saved' : 'Save Caption'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={manualCaption}
                    onChange={(e) => setManualCaption(e.target.value)}
                    onDoubleClick={() => openTextModal('caption')}
                    placeholder="Type or paste your caption…"
                    maxLength={CAPTION_MAX_LENGTH}
                    className="w-full h-32 bg-surface rounded-lg border border-charcoal/50 p-4 text-base text-vanilla/80 focus:outline-none focus:ring-0 focus:border-[#39a1b2] resize-none overflow-y-auto placeholder:text-vanilla/55"
                  />
                  <div className="flex items-center justify-between text-xs text-vanilla/60">
                    <p className="text-left">Hint: You can import your saved captions from the media library.</p>
                    <span>{manualCaption.length}/{CAPTION_MAX_LENGTH}</span>
                  </div>
                </div>
              </div>

              <div className="sf-card px-4 py-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pacific/12 via-surface to-ink/80 pointer-events-none" aria-hidden="true" />
                <div className="relative space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-pacific">SlideFlow Studio</h3>
                    <span className="sf-pill text-xs bg-surface-alt border-charcoal/50">Workspace</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <span className="text-sm text-vanilla/75 font-medium">Crop/resize, clean or replace backgrounds with AI, and add quick overlays.</span>
                    <div className="flex flex-wrap items-center gap-1.5 ml-auto justify-end">
                      <span className="text-xs text-vanilla/60">Check out your AI editing studio →</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!studioActive) {
                            setStudioActive(true);
                            return;
                          }
                          navigate('/studio', { state: { from: 'generate', carousel: currentCarousel, caption: manualCaption } });
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors shadow-soft ${
                          studioActive
                            ? 'bg-pacific text-white border border-pacific/70 hover:bg-pacific-deep'
                            : 'bg-surface text-vanilla/70 border border-charcoal/60 hover:bg-surface-alt'
                        }`}
                      >
                        Go to Studio
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
      <MediaLibraryModal
        isOpen={showLibraryModal}
        initialTab={libraryTab}
        onClose={() => setShowLibraryModal(false)}
        onSelectPrompt={(text) => {
          setCaptionPrompt(text);
          setShowLibraryModal(false);
        }}
        onSelectCaption={(text) => {
          setManualCaption(text);
          setShowLibraryModal(false);
        }}
      />
      {sparklesTooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 w-24 h-24 rounded-lg bg-ink/95 border border-charcoal/60 shadow-[0_18px_48px_rgba(0,0,0,0.45)] text-[10px] text-vanilla/90 p-2 flex items-center justify-center text-center"
          style={{ top: sparklesTooltip.y, left: sparklesTooltip.x }}
        >
          Generating captions will use your monthly credits.
        </div>
      )}
      {textModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
          onClick={closeTextModal}
        >
          <div
            className="relative w-full max-w-4xl rounded-xl border border-charcoal/60 bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-vanilla">
                {textModal.field === 'prompt' ? 'Edit prompt' : 'Edit caption'}
              </h3>
              <button
                type="button"
                onClick={closeTextModal}
                className="rounded-full bg-ink/70 text-vanilla p-2 border border-charcoal/60 hover:bg-ink/90 transition-colors"
                aria-label="Close editor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={textModal.value}
              onChange={(e) => setTextModal({ ...textModal, value: e.target.value })}
              maxLength={textModal.field === 'prompt' ? PROMPT_MAX_LENGTH : CAPTION_MAX_LENGTH}
              className="w-full h-[420px] bg-ink/50 rounded-lg border border-charcoal/60 p-4 text-base text-vanilla/85 focus:outline-none focus:ring-2 focus:ring-pacific focus:border-pacific resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={closeTextModal}
                className="px-4 py-2 rounded-md border border-charcoal/60 text-vanilla/80 hover:border-pacific/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTextModal}
                className="px-4 py-2 rounded-md bg-pacific text-white font-semibold hover:bg-pacific-deep shadow-soft border border-pacific/70"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      <PageDots total={TOTAL_APP_PAGES} active={2} />
    </div>
  );
}
