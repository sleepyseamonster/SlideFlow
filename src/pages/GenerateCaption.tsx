import React, { useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useCarousel, type Carousel } from '../contexts/CarouselContext';
import { type LibraryImage } from '../contexts/ContentLibraryContext';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import {
  ChevronLeft,
  ChevronRight,
  Instagram,
  Sparkles,
} from 'lucide-react';
import ImportLibraryModal from '../components/ImportLibraryModal';

const TOTAL_APP_PAGES = 5;
const MAX_PREVIEW_SLOTS = 10;

export default function GenerateCaption() {
  const { currentCarousel, setCurrentCarousel, fetchCarousel, updateCarousel } = useCarousel();
  const { carouselId } = useParams<{ carouselId: string }>();
  const location = useLocation();
  const navState = location.state as { carousel?: Carousel; caption?: string } | null;
  const navCarousel = navState?.carousel;
  const navCaption = navState?.caption;
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [manualCaption, setManualCaption] = useState('');
  const [captionPrompt, setCaptionPrompt] = useState('');
  const [orderedSlides, setOrderedSlides] = useState(currentCarousel?.slides ?? []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const dragPreviewRef = React.useRef<HTMLDivElement | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Use any preloaded carousel from navigation state for instant preview.
  React.useEffect(() => {
    if (navCarousel) {
      setCurrentCarousel(navCarousel);
      setOrderedSlides(navCarousel.slides || []);
      setLoading(false);
    }
  }, [navCarousel, setCurrentCarousel]);

  React.useEffect(() => {
    if (navCaption !== undefined) {
      setManualCaption(navCaption);
    }
  }, [navCaption]);

  // Fetch authoritative carousel by ID from Supabase
  React.useEffect(() => {
    if (!carouselId) return;
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
  }, [carouselId, fetchCarousel, setCurrentCarousel]);

  // Ensure each slide has a fresh signed URL; only hydrate once per load unless data looks incomplete.
  React.useEffect(() => {
    const shouldHydrate =
      currentCarousel?.slides?.some(
        (s) => !s.image || !s.image.startsWith('http')
      );
    if (!currentCarousel || !currentCarousel.slides?.length || hydrated || !shouldHydrate) {
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
      } finally {
        if (!cancelled) setHydrating(false);
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

  const handleImportFromLibrary = (importedImages: LibraryImage[]) => {
    if (!importedImages.length) return;
    const available = MAX_PREVIEW_SLOTS - orderedSlides.length;
    if (available <= 0) return;

    const toAdd = importedImages.slice(0, available).map((image) => ({
      id: image.path || crypto.randomUUID(),
      image: image.url,
      caption: image.name || 'Imported image',
    }));

    setOrderedSlides((prev) => {
      const next = [...prev, ...toAdd].slice(0, MAX_PREVIEW_SLOTS);
      if (currentCarousel) {
        setCurrentCarousel({ ...currentCarousel, slides: next });
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pacific mx-auto"></div>
            <h2 className="text-xl font-semibold">Loading carousel...</h2>
            <p className="text-vanilla/60">Please wait while we load your carousel</p>
          </div>
        </div>
        <PageDots total={TOTAL_APP_PAGES} active={2} />
      </div>
    );
  }

  if (!orderedSlides.length) {
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

  if (!currentCarousel) {
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

  const canReview = manualCaption.trim().length > 0;
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
      },
    });
  };

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      
      <main className="pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link 
              to="/slideboard" 
              state={{ carousel: currentCarousel }}
              className="text-pacific hover:text-vanilla font-medium inline-flex items-center gap-2"
            >
              ← Back to Slideboard
            </Link>
          </div>

          <div className="grid lg:grid-cols-[0.86fr_1.14fr] gap-3 lg:gap-4">
            <div className="space-y-4 lg:space-y-5">
              {/* Carousel Preview */}
              <div className="sf-card px-3 pt-4 pb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Preview</h2>
                  <span className="sf-pill bg-surface text-vanilla/80">{currentSlide + 1} / {orderedSlides.length}</span>
                </div>
                
                <div className="relative mx-auto max-w-[380px] w-full">
                  <div className="aspect-square bg-surface rounded-lg overflow-hidden border border-charcoal/50 flex items-center justify-center">
                    <img
                      src={orderedSlides[currentSlide]?.image}
                      alt={`Slide ${currentSlide + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {orderedSlides.length > 1 && (
                    <>
                      <button
                        onClick={prevSlide}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 bg-surface-alt hover:bg-surface rounded-md border border-charcoal/50 text-vanilla/80 shadow-soft transition-all h-10 aspect-[3/4] flex items-center justify-center"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="absolute -right-6 top-1/2 -translate-y-1/2 bg-surface-alt hover:bg-surface rounded-md border border-charcoal/50 text-vanilla/80 shadow-soft transition-all h-10 aspect-[3/4] flex items-center justify-center"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-sm text-vanilla/70">
                    <span>Slides order</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-[400px] sm:max-w-[420px] mx-auto w-full">
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
                      Hint: Add a caption to continue.
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
                      {canReview && (
                        <span className="absolute inset-0 z-10 flex items-center justify-center text-xl font-extrabold leading-tight text-white drop-shadow-sm">
                          Click
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
                <div className="sf-card px-5 pt-4 pb-4 space-y-4 relative overflow-hidden">
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
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 border border-charcoal/60 text-tropical shadow-soft">
                          <Sparkles className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                    <textarea
                      value={captionPrompt}
                      onChange={(e) => setCaptionPrompt(e.target.value)}
                      placeholder="Example: Energetic caption for a 5-slide carousel about daily systems for freelancers."
                      className="w-full h-32 px-4 py-3 border border-charcoal/50 rounded-lg bg-ink/40 focus:ring-2 focus:ring-stormy focus:border-stormy resize-none text-vanilla/80"
                      maxLength={400}
                    />
                    <div className="flex items-center justify-between text-xs text-vanilla/60">
                      <span>Give the vibe, hook, and audience. AI will write from here.</span>
                      <span>{captionPrompt.length}/400</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex-1">
                <div className="sf-card px-5 pt-4 pb-4 space-y-4 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-md bg-pacific/20 text-pacific flex items-center justify-center translate-y-1">
                        <Instagram className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold text-vanilla">Caption</h3>
                        <p className="text-sm text-vanilla/80 leading-snug mt-0">Write your final Instagram caption here.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowImportModal(true)}
                      type="button"
                      className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-[#225561] text-sand hover:bg-[#1a4251] transition-colors shadow-soft"
                    >
                      <span className="inline-flex h-4 w-4 mr-2 items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h5.086a1.5 1.5 0 0 1 1.06.44l1.414 1.414A1.5 1.5 0 0 0 13.12 8.5H19.5A1.5 1.5 0 0 1 21 10v6.5A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5V7.5Z" />
                        </svg>
                      </span>
                      Media Library
                    </button>
                  </div>
                  <textarea
                    value={manualCaption}
                    onChange={(e) => setManualCaption(e.target.value)}
                    placeholder="Type or paste your caption…"
                    className="w-full h-48 bg-surface rounded-lg border border-charcoal/50 p-4 text-base text-vanilla/80 focus:outline-none focus:ring-2 focus:ring-pacific focus:border-pacific resize-none overflow-y-auto"
                  />
                  <p className="text-xs text-vanilla/60 text-right">This is the full caption that will get posted to Instagram.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
      <ImportLibraryModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportFromLibrary}
        maxImages={MAX_PREVIEW_SLOTS}
        currentImageCount={orderedSlides.length}
      />
      <PageDots total={TOTAL_APP_PAGES} active={2} />
    </div>
  );
}
