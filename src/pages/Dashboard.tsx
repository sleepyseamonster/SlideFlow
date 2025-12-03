import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCarousel, type Carousel, type CarouselSlide } from '../contexts/CarouselContext';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Download, 
  CalendarCheck2,
  TrendingUp,
  Star,
  Clock,
  Image as ImageIcon,
  Palette,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { carousels, loading, deleteCarousel, duplicateCarousel, setCurrentCarousel, fetchCarousel, addCarousel, updateCarousel } = useCarousel();
  const navigate = useNavigate();
  const [creatingCarousel, setCreatingCarousel] = React.useState(false);
  const [previewSlides] = React.useState<Record<string, CarouselSlide[]>>({});
  const [activeSlideIndex] = React.useState<Record<string, number>>({});
  const [editingTitleId, setEditingTitleId] = React.useState<string | null>(null);
  const [titleDrafts, setTitleDrafts] = React.useState<Record<string, string>>({});

  const canGenerate = user && user.carouselsGenerated < user.maxCarousels;
  const planLabel = (user?.plan || 'free').toString();
  const isPremium = planLabel.toLowerCase() === 'premium';
  const planTextClass = isPremium ? 'text-pacific' : 'text-vanilla';

  const calendarDays = React.useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + index);
      const weekdayName = day.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        letter: weekdayName.charAt(0),
        date: day.getDate(),
        month: day.toLocaleDateString('en-US', { month: 'short' }),
        isToday: day.toDateString() === now.toDateString(),
        id: day.toDateString(),
      };
    });
  }, []);

  const weekRangeLabel = React.useMemo(() => {
    if (!calendarDays.length) return '';
    const first = calendarDays[0];
    const last = calendarDays[calendarDays.length - 1];
    if (!first || !last) return '';
    if (first.month === last.month) {
      return `${first.month} ${first.date} - ${last.date}`;
    }
    return `${first.month} ${first.date} - ${last.month} ${last.date}`;
  }, [calendarDays]);

  // Disable eager per-carousel fetch on dashboard to avoid repeated Supabase calls.

  // Calculate time saved (assuming each carousel saves ~2.5 hours of manual work)
  const timeSavedHours = user ? Math.round(user.carouselsGenerated * 2.5 * 10) / 10 : 0;

  const handleCarouselClick = async (carousel: Carousel) => {
    try {
      const fullCarousel = await fetchCarousel(carousel.id);
      if (fullCarousel) {
        setCurrentCarousel(fullCarousel);
      }
    } catch (error) {
      console.error('Error loading carousel:', error);
      // Fall through to Generate Caption where it will refetch by ID.
    } finally {
      navigate(`/generate-caption/${carousel.id}`, { state: { carouselId: carousel.id } });
    }
  };

  const handleCreateNewCarousel = async () => {
    if (!user || creatingCarousel) return;
    setCreatingCarousel(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        alert('Please log in again to create a carousel.');
        return;
      }

      const title = 'Untitled Carousel';
      const { data, error } = await supabase
        .from('carousel')
        .insert({
          user_id: user.id,
          title,
          aspect: 'square',
          status: 'draft',
        })
        .select('id, created_at, title, aspect, status')
        .single();

      if (error || !data?.id) {
        throw error || new Error('Failed to create carousel');
      }

      const createdCarousel = {
        id: data.id,
        title: data.title || title,
        caption: data.title || title,
        description: data.title || title,
        createdAt: data.created_at || new Date().toISOString(),
        style: 'minimalist' as const,
        status: (data.status as string) || 'draft',
        slides: [],
      };

      addCarousel(createdCarousel);
      setCurrentCarousel(createdCarousel);
      navigate('/slideboard', { state: { carousel: createdCarousel } });
    } catch (err: unknown) {
      console.error('Create carousel failed', err);
      alert('Failed to create a new carousel. Please try again.');
    } finally {
      setCreatingCarousel(false);
    }
  };

  const startEditingTitle = (carousel: Carousel, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setTitleDrafts((prev) => ({ ...prev, [carousel.id]: carousel.title }));
    setEditingTitleId(carousel.id);
  };

  const cancelTitleEdit = (carousel: Carousel) => {
    setTitleDrafts((prev) => ({ ...prev, [carousel.id]: carousel.title }));
    setEditingTitleId(null);
  };

  const saveTitleEdit = async (carousel: Carousel) => {
    const draft = titleDrafts[carousel.id] ?? carousel.title;
    const trimmed = draft.trim();
    if (!trimmed) {
      cancelTitleEdit(carousel);
      return;
    }
    if (trimmed === carousel.title) {
      setEditingTitleId(null);
      return;
    }

    const result = await updateCarousel(carousel.id, { title: trimmed });
    if (!result) {
      alert('Failed to rename carousel. Please try again.');
      setTitleDrafts((prev) => ({ ...prev, [carousel.id]: carousel.title }));
    }
    setEditingTitleId(null);
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent, carousel: Carousel) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveTitleEdit(carousel);
    } else if (event.key === 'Escape') {
      cancelTitleEdit(carousel);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <Navbar />
        <main className="pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tropical"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const createButtonImageSrc = creatingCarousel
    ? '/Deactivated%20Next%20Button.png'
    : '/Next%20Button.png';
  const createButtonOverlayText = creatingCarousel ? 'Creating…' : null;

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-vanilla">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-vanilla/70 mt-2">
              Create and manage your Instagram carousel posts
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="sf-card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-stormy/15 text-stormy">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-vanilla/70">Carousels Created</p>
                  <p className="text-2xl font-bold text-vanilla">{carousels.length}</p>
                </div>
              </div>
            </div>
            
            <div className="sf-card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-tropical/15 text-tropical">
                  <CalendarCheck2 className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-vanilla/70">This Month</p>
                  <p className="text-2xl font-bold text-vanilla">{carousels.length}</p>
                </div>
              </div>
            </div>
            
            <div className="sf-card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-surface-alt/10 text-vanilla">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-vanilla/70">Time Saved</p>
                  <p className="text-2xl font-bold text-vanilla">{timeSavedHours}h</p>
                </div>
              </div>
            </div>
            
            <div className="sf-card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-surface/15 text-vanilla">
                  <Star className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-vanilla/70">Plan</p>
                  <p className={`text-2xl font-bold capitalize ${planTextClass}`}>{planLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-8">
            {canGenerate ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/media-library"
                      className="sf-btn-secondary"
                    >
                      <ImageIcon className="h-5 w-5 mr-2" />
                      Media Library
                    </Link>
                    <Link
                      to="/brand-profile"
                      className="sf-btn-secondary"
                    >
                      <Palette className="h-5 w-5 mr-2" />
                      Brand Profile
                    </Link>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-vanilla/60">
                      Hint: Click to create a new carousel.
                    </span>
                    <div className="relative w-24 h-20 group">
                    <div
                      className="absolute inset-0 z-0 rounded-[4px] bg-[#0c0c0c] pointer-events-none"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewCarousel}
                      disabled={creatingCarousel}
                      className={`group relative z-10 flex items-center justify-center rounded-[4px] w-full h-full overflow-hidden border transition-transform duration-200 ease-out transform-gpu ${
                        creatingCarousel
                          ? 'bg-surface opacity-70 border-charcoal/50 cursor-not-allowed pointer-events-none shadow-none'
                          : 'border-transparent shadow-lg shadow-pacific/30 hover:shadow-pacific/50 group-hover:translate-x-1'
                      }`}
                      aria-label="Create a new carousel"
                    >
                      <img
                        src={createButtonImageSrc}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 block w-full h-full object-cover select-none pointer-events-none"
                      />
                      <span className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-xl font-extrabold leading-tight text-white drop-shadow-sm">
                        <span aria-hidden="true">+</span>
                        <span>Create</span>
                      </span>
                      {createButtonOverlayText && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-[4px] bg-ink/60 text-xs font-semibold text-vanilla">
                          {createButtonOverlayText}
                        </div>
                      )}
                      <span className="sr-only">
                        {creatingCarousel ? 'Creating a new carousel' : 'Create a new carousel'}
                      </span>
                    </button>
                  </div>
                  <img
                    src="/blue_arrow.png"
                    alt=""
                    aria-hidden="true"
                    className={`w-4 h-auto sf-arrow-wiggle select-none pointer-events-none transition-opacity duration-150 ${
                      creatingCarousel ? 'opacity-40' : 'opacity-100'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-tropical/10 border border-tropical/30 rounded-lg p-4 md:max-w-md">
                <p className="text-vanilla font-medium">
                  You've reached your free carousel limit. 
                  <Link to="/profile" className="text-stormy hover:text-vanilla underline ml-1">
                    Upgrade to Premium
                  </Link> for unlimited generations.
                </p>
              </div>
            )}
          </div>
          {/* Week overview */}
          <section className="mb-8">
            <div className="sf-card border border-charcoal/40 bg-surface-alt/90 p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-vanilla/50">This week</p>
                  <h3 className="text-lg font-semibold text-vanilla">Weekly view</h3>
                </div>
                <span className="text-xs text-vanilla/60">{weekRangeLabel}</span>
              </div>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-3 text-center min-w-[460px]">
                  {calendarDays.map((day) => (
                    <div key={day.id} className="flex flex-col items-center gap-2">
                      <span className="text-[11px] tracking-[0.3em] uppercase text-vanilla/50">
                        {day.letter}
                      </span>
                      <div
                        className={`w-full aspect-square rounded-lg border transition ${
                          day.isToday
                            ? 'border-pacific bg-pacific/20 text-white'
                            : 'border-charcoal/50 bg-surface text-vanilla/80'
                        } flex items-center justify-center font-semibold text-lg`}
                      >
                        {day.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          {/* Carousels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center">
          {carousels.map((carousel) => {
            const slides = previewSlides[carousel.id] || [];
            const currentIndex = activeSlideIndex[carousel.id] ?? 0;
            const currentSlide = slides[currentIndex];
            const hasSlides = slides.length > 0;
            const handlePrevSlide = (e: React.MouseEvent) => {
              e.stopPropagation();
              setActiveSlideIndex((prev) => {
                const current = prev[carousel.id] ?? 0;
                return { ...prev, [carousel.id]: Math.max(0, current - 1) };
              });
            };
            const handleNextSlide = (e: React.MouseEvent) => {
              e.stopPropagation();
              setActiveSlideIndex((prev) => {
                const current = prev[carousel.id] ?? 0;
                return { ...prev, [carousel.id]: Math.min(slides.length - 1, current + 1) };
              });
            };
            return (
              <div key={carousel.id} className="sf-card overflow-hidden transition-transform hover:-translate-y-0.5 text-sm w-full max-w-[14rem]">
                <div 
                  className="w-full aspect-square bg-surface border-b border-charcoal/40 relative cursor-pointer"
                  onClick={() => handleCarouselClick(carousel)}
                >
                  {hasSlides ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={currentSlide?.image}
                        alt={`Slide ${currentIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-vanilla/50">
                      <div className="text-center">
                        <ImageIcon className="h-10 w-10 mx-auto mb-1.5" />
                        <p className="text-xs md:text-sm">Click to view</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 bg-surface-alt text-vanilla px-3 py-1 rounded-md text-sm font-medium transition-opacity">
                      Click to view & edit
                    </div>
                  </div>
                  {hasSlides && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevSlide}
                        disabled={currentIndex === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/70 p-1.5 text-vanilla/80 shadow-soft transition-opacity duration-150 hover:text-vanilla disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Previous slide preview"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextSlide}
                        disabled={currentIndex >= slides.length - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/70 p-1.5 text-vanilla/80 shadow-soft transition-opacity duration-150 hover:text-vanilla disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Next slide preview"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-3 right-3 bg-ink/80 text-xs text-vanilla px-2 py-0.5 rounded-full border border-surface-alt">
                        {currentIndex + 1} / {slides.length}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="p-4">
                  {editingTitleId === carousel.id ? (
                    <input
                      type="text"
                      value={titleDrafts[carousel.id] ?? carousel.title}
                      onChange={(e) =>
                        setTitleDrafts((prev) => ({ ...prev, [carousel.id]: e.target.value }))
                      }
                      onBlur={() => saveTitleEdit(carousel)}
                      onKeyDown={(event) => handleTitleKeyDown(event, carousel)}
                      className="w-full mb-1.5 text-base font-semibold text-vanilla bg-transparent border-b border-charcoal/60 focus:border-pacific focus:outline-none py-1"
                      autoFocus
                      onMouseDown={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <h3
                      className="font-semibold text-vanilla mb-1.5 text-base cursor-pointer select-text"
                      onDoubleClick={(event) => startEditingTitle(carousel, event)}
                    >
                      {carousel.title}
                    </h3>
                  )}
                  <p className="text-vanilla/80 text-xs mb-3 line-clamp-2">{carousel.caption || carousel.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-vanilla/70 mb-3">
                    <span className="px-2 py-1 rounded-full bg-surface text-vanilla/80 border border-charcoal/40 capitalize">
                      {carousel.status || carousel.style}
                    </span>
                    <span>{carousel.createdAt}</span>
                  </div>
                  
                  <div className="flex space-x-2 text-xs">
                    <button 
                      onClick={() => duplicateCarousel(carousel.id)}
                      className="flex-1 flex items-center justify-center px-2.5 py-2 bg-surface hover:bg-ink text-vanilla/80 rounded-lg border border-charcoal/40 transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </button>
                    <button className="flex-1 flex items-center justify-center px-2.5 py-2 bg-stormy/15 hover:bg-stormy/25 text-stormy rounded-lg border border-stormy/30 transition-colors">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </button>
                    <button 
                      onClick={() => deleteCarousel(carousel.id)}
                      className="px-2.5 py-2 bg-surface-alt/10 hover:bg-surface-alt/20 text-vanilla rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
            
            {carousels.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-vanilla/55" />
                  </div>
                  <h3 className="text-lg font-medium text-vanilla mb-2">No carousels yet</h3>
                  <p className="text-vanilla/80 mb-6">Get started by creating your first carousel</p>
                  {canGenerate && (
                    <button
                      type="button"
                      onClick={handleCreateNewCarousel}
                      disabled={creatingCarousel}
                      className={`sf-btn-primary ${creatingCarousel ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {creatingCarousel ? 'Creating…' : 'Create Carousel'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
