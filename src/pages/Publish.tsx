import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock3, Send, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import { useCarousel, type Carousel } from '../contexts/CarouselContext';
import { supabase } from '../lib/supabase';

type LocationState = {
  caption?: string;
  carousel?: Carousel;
};

const TOTAL_APP_PAGES = 5;

export default function Publish() {
  const { carouselId } = useParams<{ carouselId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as LocationState) || {};
  const navCarousel = navState.carousel;
  const navCaption = navState.caption;

  const { currentCarousel, setCurrentCarousel, fetchCarousel, updateCarousel } = useCarousel();
  const [orderedSlides, setOrderedSlides] = React.useState(navCarousel?.slides ?? currentCarousel?.slides ?? []);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [caption, setCaption] = React.useState(navCaption ?? '');
  const [loading, setLoading] = React.useState(!navCarousel);
  const [hydrated, setHydrated] = React.useState(false);
  const [hydrating, setHydrating] = React.useState(false);
  const [shareToInstagram, setShareToInstagram] = React.useState(true);
  const [shareToFacebook, setShareToFacebook] = React.useState(false);
  const [scheduleMode, setScheduleMode] = React.useState<'now' | 'later'>('now');

  const captionHydrated = React.useRef(false);

  // Persist caption changes (debounced) so dashboard reflects saved caption.
  React.useEffect(() => {
    if (!currentCarousel?.id) return;
    const trimmed = caption.trim();
    const existing = (currentCarousel.caption || '').trim();
    if (trimmed === existing) return;

    const handle = window.setTimeout(async () => {
      await updateCarousel(currentCarousel.id, { caption: trimmed });
      setCurrentCarousel((prev) => (prev ? { ...prev, caption: trimmed } : prev));
    }, 800);

    return () => {
      window.clearTimeout(handle);
    };
  }, [caption, currentCarousel?.id, setCurrentCarousel, updateCarousel]);

  // Use any preloaded carousel from navigation state.
  React.useEffect(() => {
    if (navCarousel) {
      setCurrentCarousel(navCarousel);
      setOrderedSlides(navCarousel.slides || []);
      setLoading(false);
    }
  }, [navCarousel, setCurrentCarousel]);

  // Fetch carousel by ID if needed.
  React.useEffect(() => {
    if (!carouselId) return;
    let cancelled = false;
    setLoading(!navCarousel);
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
          console.error('Failed to load carousel for publish page', err);
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
  }, [carouselId, fetchCarousel, navCarousel, setCurrentCarousel]);

  // Hydrate slide URLs if needed.
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
      setHydrating(true);
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

  // Sync ordered slides when context changes.
  React.useEffect(() => {
    if (currentCarousel) {
      setOrderedSlides(currentCarousel.slides || []);
      setLoading(false);
      setCurrentSlide(0);
    }
  }, [currentCarousel]);

  // Seed caption from navigation or carousel record.
  React.useEffect(() => {
    if (captionHydrated.current) return;
    if (navCaption !== undefined) {
      setCaption(navCaption);
      captionHydrated.current = true;
      return;
    }
    if (currentCarousel?.caption) {
      setCaption(currentCarousel.caption);
      captionHydrated.current = true;
    }
  }, [navCaption, currentCarousel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pacific mx-auto"></div>
            <h2 className="text-xl font-semibold">Loading your publish view...</h2>
            <p className="text-vanilla/60">Pulling in slides and captions</p>
          </div>
        </div>
        <PageDots total={TOTAL_APP_PAGES} active={3} />
      </div>
    );
  }

  if (!orderedSlides.length) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">No slides to publish</h2>
            <Link
              to="/slideboard"
              className="sf-btn-primary inline-flex"
            >
              Build a carousel first
            </Link>
          </div>
        </div>
        <PageDots total={TOTAL_APP_PAGES} active={3} />
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
        <PageDots total={TOTAL_APP_PAGES} active={3} />
      </div>
    );
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % orderedSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + orderedSlides.length) % orderedSlides.length);
  };

  const readyToPublish = caption.trim().length > 0 && orderedSlides.length > 0;

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />

      <main className="pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link
              to={`/generate-caption/${carouselId || currentCarousel.id}`}
              state={{ carousel: currentCarousel, caption }}
              className="text-pacific hover:text-vanilla font-medium inline-flex items-center gap-2"
            >
              ← Back to Captions
            </Link>
            <div className="flex items-center gap-2 text-sm text-vanilla/70">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface/80 border border-charcoal/50">
                <Sparkles className="h-4 w-4 text-pacific" />
                Step 4 · Publish
              </span>
              {hydrating && (
                <span className="text-xs text-vanilla/60">
                  Refreshing preview links...
                </span>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-4 lg:gap-6">
            <div className="space-y-4 lg:space-y-5">
              {/* Preview + caption */}
              <div className="sf-card px-4 pt-4 pb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Preview</h2>
                    <p className="text-sm text-vanilla/70">Swipe through your carousel before posting.</p>
                  </div>
                  <span className="sf-pill bg-surface text-vanilla/80">{currentSlide + 1} / {orderedSlides.length}</span>
                </div>

                <div className="relative mx-auto max-w-[260px] sm:max-w-[300px] w-full">
                  <div className="aspect-square bg-surface overflow-hidden border border-charcoal/50 flex items-center justify-center shadow-soft rounded-none">
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
                        className="absolute -left-4 top-1/2 -translate-y-1/2 bg-surface-alt hover:bg-surface rounded-md border border-charcoal/50 text-vanilla/80 shadow-soft transition-all h-9 aspect-[3/4] flex items-center justify-center"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 bg-surface-alt hover:bg-surface rounded-md border border-charcoal/50 text-vanilla/80 shadow-soft transition-all h-9 aspect-[3/4] flex items-center justify-center"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-charcoal/60 bg-surface-alt p-4 space-y-3 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-vanilla">Caption to publish</p>
                      <p className="text-xs text-vanilla/60">Imported from Generate Captions. Edit if you need a final tweak.</p>
                    </div>
                    <span className="text-xs text-vanilla/60">{caption.length}/2200</span>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Your caption is ready to go…"
                    className="w-full h-28 bg-ink/50 rounded-lg border border-charcoal/50 p-4 text-base text-vanilla/80 focus:outline-none focus:ring-2 focus:ring-pacific focus:border-pacific resize-none overflow-y-auto"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-vanilla/60">
                    <span>Keep hashtags and CTA close to the end. Line breaks are preserved.</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(caption).catch(() => {});
                        }
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-charcoal/60 bg-surface hover:border-pacific/60 hover:text-vanilla transition-colors"
                    >
                      <Share2 className="h-4 w-4" />
                      Copy caption
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              <div className="sf-card px-5 pt-4 pb-5 space-y-4 relative overflow-hidden">
                <img
                  src="/retro-slide.png"
                  alt="Retro accent"
                  className="absolute top-0 left-0 h-5 w-auto max-w-none object-contain pointer-events-none select-none"
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-none h-9 w-9 rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none translate-y-1">
                      4
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-vanilla">Publish</h3>
                      <p className="text-sm text-vanilla/80 leading-snug mt-0">Final checks before you ship the carousel.</p>
                    </div>
                  </div>
                  <span className="sf-pill bg-surface-alt border-charcoal/50 text-xs">
                    {readyToPublish ? 'Ready' : 'Add caption to publish'}
                  </span>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-lg border border-charcoal/60 bg-surface-alt p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Destinations</p>
                      <p className="text-xs text-vanilla/60">Choose where to send this drop.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShareToInstagram((v) => !v)}
                        className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide border transition-colors ${
                          shareToInstagram
                            ? 'bg-pacific text-white border-pacific/80 shadow-soft'
                            : 'bg-surface text-vanilla/60 border-charcoal/50 hover:border-pacific/60'
                        }`}
                        aria-pressed={shareToInstagram}
                      >
                        IG
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareToFacebook((v) => !v)}
                        className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide border transition-colors ${
                          shareToFacebook
                            ? 'bg-pacific/80 text-white border-pacific/80 shadow-soft'
                            : 'bg-surface text-vanilla/60 border-charcoal/50 hover:border-pacific/60'
                        }`}
                        aria-pressed={shareToFacebook}
                      >
                        FB
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-charcoal/60 bg-surface-alt p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Timing</p>
                        <p className="text-xs text-vanilla/60">Drop it now or set a slot.</p>
                      </div>
                      <Clock3 className="h-5 w-5 text-pacific" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setScheduleMode('now')}
                        className={`px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${
                          scheduleMode === 'now'
                            ? 'bg-pacific text-white border-pacific/90 shadow-soft'
                            : 'bg-surface text-vanilla/70 border-charcoal/60 hover:border-pacific/60'
                        }`}
                      >
                        Publish now
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleMode('later')}
                        className={`px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${
                          scheduleMode === 'later'
                            ? 'bg-surface-alt text-vanilla border-pacific/60 ring-1 ring-pacific/25'
                            : 'bg-surface text-vanilla/70 border-charcoal/60 hover:border-pacific/60'
                        }`}
                      >
                        Schedule
                      </button>
                    </div>
                    {scheduleMode === 'later' && (
                      <div className="rounded-md border border-dashed border-charcoal/50 bg-ink/60 px-3 py-2 text-xs text-vanilla/70">
                        Scheduling UI coming soon — pick your slot when the Studio opens.
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-charcoal/60 bg-surface-alt p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-pacific" />
                        <p className="text-sm font-semibold">Readiness</p>
                      </div>
                      <span className="text-xs text-vanilla/60">{orderedSlides.length} slides</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-vanilla/80">
                          <CheckCircle2 className="h-4 w-4 text-tropical" />
                          Slides linked
                        </span>
                        <span className="text-vanilla/50 text-xs">1:1 square</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={!readyToPublish}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-md font-semibold border transition-all ${
                      readyToPublish
                        ? 'bg-pacific text-white border-pacific/80 shadow-soft hover:shadow-lg hover:shadow-pacific/30'
                        : 'bg-surface text-vanilla/60 border-charcoal/60 cursor-not-allowed'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    Publish
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-md font-semibold border border-charcoal/60 bg-surface-alt hover:border-pacific/60 transition-colors"
                  >
                    Save draft
                  </button>
                </div>
              </div>

              <div className="sf-card px-5 py-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pacific/12 via-surface to-ink/80 pointer-events-none" aria-hidden="true" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">SlideFlow Studio</h3>
                    <span className="sf-pill text-xs bg-surface-alt border-charcoal/50">Workspace</span>
                  </div>
                  <p className="text-sm text-vanilla/80 leading-snug">
                    Jump into Studio for motion tweaks, overlays, and advanced exports. Your slides and caption will carry over.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/studio', { state: { from: 'publish', carousel: currentCarousel, caption } })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold bg-[#225561] text-sand hover:bg-[#1a4251] transition-colors shadow-soft"
                    >
                      Go to Studio
                    </button>
                    <span className="text-xs text-vanilla/60">Future editing suite — wired and ready.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PageDots total={TOTAL_APP_PAGES} active={3} />
    </div>
  );
}
