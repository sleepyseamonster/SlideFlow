import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock3, GripVertical, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import { useCarousel } from '../contexts/CarouselContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type ScheduledEntry = {
  carouselId: string;
  dateKey: string;
  scheduledAt: string;
  displayTime: string;
  title: string;
  thumbnail?: string;
  status?: string;
  timezone?: string;
};

type MonthCell = {
  date: Date | null;
  isPast: boolean;
  isToday: boolean;
  key: string;
};

const TOTAL_APP_PAGES = 5;
const DEFAULT_TIME = '09:00';

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateKeyWithZone = (utcISOString: string, timeZone?: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date(utcISOString));
};

const formatTimeLabel = (time: string) => {
  if (!time.includes(':')) return time;
  const [hourString, minute] = time.split(':');
  const hour = Number.parseInt(hourString, 10);
  const isPm = hour >= 12;
  const printableHour = ((hour + 11) % 12) + 1;
  return `${printableHour}:${minute} ${isPm ? 'PM' : 'AM'}`;
};

const formatDisplayTime = (isoString: string, timeZone?: string) =>
  new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timeZone || undefined,
  });

const toUtcISOString = (dateKey: string, timeInput: string, timeZone: string) => {
  const [year, month, day] = dateKey.split('-').map((v) => Number.parseInt(v, 10));
  const [hour, minute] = timeInput.split(':').map((v) => Number.parseInt(v, 10));
  const asUTC = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
  // Convert that instant to the target zone, then derive the offset difference.
  const asDate = new Date(asUTC);
  const tzString = asDate.toLocaleString('en-US', { timeZone, hour12: false });
  const tzDate = new Date(tzString);
  const offset = asUTC - tzDate.getTime();
  const utcMillis = asUTC + offset;
  return new Date(utcMillis).toISOString();
};

const friendlyDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map((part) => Number.parseInt(part, 10));
  const safeDate = new Date(year, month - 1, day);
  return safeDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

export default function CalendarPage() {
  const { user } = useAuth();
  const { carousels, loading, refreshCarousels } = useCarousel();
  const [thumbnails, setThumbnails] = React.useState<Record<string, string>>({});
  const [scheduled, setScheduled] = React.useState<Record<string, ScheduledEntry>>({});
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = React.useState<string | null>(null);
  const [pendingSchedule, setPendingSchedule] = React.useState<{ carouselId: string; dateKey: string } | null>(null);
  const [timeInput, setTimeInput] = React.useState(DEFAULT_TIME);
  const [showModal, setShowModal] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const timeOptions = React.useMemo(() => {
    return Array.from({ length: 24 * 4 }, (_, idx) => {
      const hours = Math.floor(idx / 4);
      const minutes = (idx % 4) * 15;
      const value = `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
      const hour12 = hours % 12 === 0 ? 12 : hours % 12;
      const label = `${hour12}:${`${minutes}`.padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
      return { value, label, sortKey: hours * 60 + minutes };
    }).sort((a, b) => a.sortKey - b.sortKey);
  }, []);

  const timeZoneLabel = React.useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Local time',
    []
  );

  const month = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cells: MonthCell[] = [];

    for (let i = 0; i < start.getDay(); i += 1) {
      cells.push({
        date: null,
        isPast: true,
        isToday: false,
        key: `pad-start-${i}`,
      });
    }

    for (let day = 1; day <= end.getDate(); day += 1) {
      const current = new Date(now.getFullYear(), now.getMonth(), day);
      cells.push({
        date: current,
        isPast: current < today,
        isToday: current.getTime() === today.getTime(),
        key: formatDateKey(current),
      });
    }

    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const padCount = 7 - remainder;
      for (let i = 0; i < padCount; i += 1) {
        cells.push({
          date: null,
          isPast: true,
          isToday: false,
          key: `pad-end-${i}`,
        });
      }
    }

    return {
      cells,
      monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      todayKey: formatDateKey(today),
    };
  }, []);

  React.useEffect(() => {
    if (!user?.id || !carousels.length) {
      setThumbnails({});
      return;
    }

    let cancelled = false;
    const loadThumbnails = async () => {
      try {
        const { data: slideRows, error } = await supabase
          .from('carousel_slide')
          .select('carousel_id, position, media:media_id(bucket,path)')
          .in(
            'carousel_id',
            carousels.map((c) => c.id)
          )
          .eq('user_id', user.id)
          .order('position', { ascending: true });

        if (error || !slideRows) {
          if (!cancelled) setThumbnails({});
          return;
        }

        const typedRows = slideRows as Array<{
          carousel_id: string;
          position: number;
          media: { bucket: string; path: string } | null;
        }>;

        const firstByCarousel = new Map<string, string>();
        typedRows.forEach((row) => {
          if (!row.media?.path) return;
          if (!firstByCarousel.has(row.carousel_id)) {
            firstByCarousel.set(row.carousel_id, row.media.path);
          }
        });

        const paths = Array.from(firstByCarousel.values());
        if (!paths.length) {
          if (!cancelled) setThumbnails({});
          return;
        }

        const { data: signedUrls, error: signedError } = await supabase.storage
          .from('media')
          .createSignedUrls(paths, 60 * 60);

        if (signedError || !signedUrls) {
          if (!cancelled) setThumbnails({});
          return;
        }

        const urlByPath = new Map<string, string>();
        paths.forEach((path, idx) => {
          const signed = signedUrls[idx];
          if (signed?.signedUrl) {
            urlByPath.set(path, signed.signedUrl);
          }
        });

        const nextThumbs: Record<string, string> = {};
        firstByCarousel.forEach((path, carouselId) => {
          const url = urlByPath.get(path);
          if (url) nextThumbs[carouselId] = url;
        });

        if (!cancelled) {
          setThumbnails(nextThumbs);
        }
      } catch (err) {
        console.error('Failed to load carousel thumbnails for calendar', err);
        if (!cancelled) setThumbnails({});
      }
    };

    void loadThumbnails();
    return () => {
      cancelled = true;
    };
  }, [user?.id, carousels]);

  const eventsByDate = React.useMemo(() => {
    return Object.values(scheduled).reduce<Record<string, ScheduledEntry[]>>((acc, entry) => {
      if (!acc[entry.dateKey]) acc[entry.dateKey] = [];
      acc[entry.dateKey].push(entry);
      return acc;
    }, {});
  }, [scheduled]);

  const availableCarousels = React.useMemo(
    () =>
      carousels.filter((carousel) => {
        const status = carousel.status?.toLowerCase();
        const isPublished = status === 'published' || status === 'posted';
        const isScheduled = status === 'scheduled' || Boolean(scheduled[carousel.id]);
        return !isPublished && !isScheduled;
      }),
    [carousels, scheduled]
  );

  const pendingCarousel = React.useMemo(() => {
    if (!pendingSchedule) return null;
    return carousels.find((carousel) => carousel.id === pendingSchedule.carouselId) ?? null;
  }, [pendingSchedule, carousels]);

  const pendingThumbnail = React.useMemo(() => {
    if (!pendingSchedule) return undefined;
    return (
      scheduled[pendingSchedule.carouselId]?.thumbnail || thumbnails[pendingSchedule.carouselId]
    );
  }, [pendingSchedule, scheduled, thumbnails]);

  const deriveTimeInput = React.useCallback(
    (carouselId: string) => {
      const entry = scheduled[carouselId];
      if (!entry?.scheduledAt) return DEFAULT_TIME;
      const date = new Date(entry.scheduledAt);
      const hhmm = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: entry.timezone || undefined,
        hour12: false,
      });
      return hhmm;
    },
    [scheduled]
  );

  const refreshScheduled = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const { data, error } = await supabase
        .from('calendar_event')
        .select('id, carousel_id, scheduled_at, timezone, status')
        .eq('user_id', user.id)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Failed to load calendar events', error);
        return;
      }

      const next: Record<string, ScheduledEntry> = {};
      (data || []).forEach((row) => {
        const carousel = carousels.find((item) => item.id === row.carousel_id);
        if ((carousel?.status || '').toLowerCase() === 'published') return;
        const scheduledAt = row.scheduled_at as string;
        const dateKey = formatDateKeyWithZone(scheduledAt, row.timezone || timeZoneLabel);
        const displayTime = formatDisplayTime(scheduledAt, row.timezone || timeZoneLabel);
        next[row.carousel_id] = {
          carouselId: row.carousel_id,
          dateKey,
          scheduledAt,
          displayTime,
          title: carousel?.title || 'Scheduled carousel',
          thumbnail: thumbnails[row.carousel_id],
          status: row.status,
          timezone: row.timezone || timeZoneLabel,
        };
      });
      setScheduled(next);
    } catch (err) {
      console.error('Unexpected error loading events', err);
    }
  }, [carousels, thumbnails, timeZoneLabel, user?.id]);

  React.useEffect(() => {
    void refreshScheduled();
  }, [refreshScheduled]);

  const openScheduleModal = (carouselId: string, dateKey?: string, defaultTime?: string) => {
    const targetDateKey = dateKey || month.todayKey;
    setPendingSchedule({ carouselId, dateKey: targetDateKey });
    setTimeInput(defaultTime || deriveTimeInput(carouselId) || DEFAULT_TIME);
    setShowModal(true);
  };

  const handleDayDragOver = (event: React.DragEvent<HTMLDivElement>, cell: MonthCell) => {
    if (!cell.date || cell.isPast) return;
    if (!draggingId) return;
    event.preventDefault();
    setHoveredDay(formatDateKey(cell.date));
  };

  const handleDayDrop = (event: React.DragEvent<HTMLDivElement>, cell: MonthCell) => {
    event.preventDefault();
    if (!cell.date || cell.isPast || !draggingId) return;
    const dateKey = formatDateKey(cell.date);
    openScheduleModal(draggingId, dateKey, scheduled[draggingId]?.time);
    setHoveredDay(null);
  };

  const confirmSchedule = () => {
    void (async () => {
      if (!pendingSchedule || !user) return;
      const found = carousels.find((c) => c.id === pendingSchedule.carouselId);
      if (!found) {
        setShowModal(false);
        return;
      }
      if ((found.status || '').toLowerCase() === 'published') {
        setToast('Published carousels cannot be scheduled.');
        setShowModal(false);
        setTimeout(() => setToast(null), 3000);
        return;
      }
      const iso = toUtcISOString(pendingSchedule.dateKey, timeInput, timeZoneLabel);

      const rescheduleNeeded = Boolean(scheduled[pendingSchedule.carouselId]);
      try {
        if (rescheduleNeeded) {
          await supabase.rpc('unschedule_carousel', {
            p_carousel_id: pendingSchedule.carouselId,
          });
        }

        const { data, error } = await supabase.rpc('schedule_carousel', {
          p_carousel_id: pendingSchedule.carouselId,
          p_scheduled_at: iso,
          p_timezone: timeZoneLabel,
        });

        if (error) {
          setToast(error.message || 'Could not schedule. Slot may be taken.');
          return;
        }

        if (data) {
          const scheduledAt = data.scheduled_at as string;
          const tz = data.timezone || timeZoneLabel;
          const dateKey = formatDateKeyWithZone(scheduledAt, tz);
          const displayTime = formatDisplayTime(scheduledAt, tz);

          setScheduled((prev) => ({
            ...prev,
            [pendingSchedule.carouselId]: {
              carouselId: pendingSchedule.carouselId,
              dateKey,
              scheduledAt,
              displayTime,
              title: found.title || 'Untitled carousel',
              thumbnail: thumbnails[pendingSchedule.carouselId],
              status: data.status,
              timezone: tz,
            },
          }));
          void refreshCarousels();
        }
      } catch (err: any) {
        setToast(err?.message || 'Could not schedule. Try another time slot.');
      } finally {
        setShowModal(false);
        setTimeout(() => setToast(null), 3000);
      }
    })();
  };

  const unschedule = () => {
    void (async () => {
      if (!pendingSchedule) return;
      try {
        await supabase.rpc('unschedule_carousel', {
          p_carousel_id: pendingSchedule.carouselId,
        });
        setScheduled((prev) => {
          const next = { ...prev };
          delete next[pendingSchedule.carouselId];
          return next;
        });
        void refreshCarousels();
      } catch (err: any) {
        setToast(err?.message || 'Could not unschedule right now.');
      } finally {
        setShowModal(false);
        setTimeout(() => setToast(null), 3000);
      }
    })();
  };

  const handleEventClick = (entry: ScheduledEntry) => {
    openScheduleModal(entry.carouselId, entry.dateKey, entry.time);
  };

  const renderDayCell = (cell: MonthCell) => {
    if (!cell.date) {
      return <div key={cell.key} className="rounded-lg border border-transparent" />;
    }

    const dateKey = formatDateKey(cell.date);
    const events = eventsByDate[dateKey] ?? [];
    const isHovered = hoveredDay === dateKey;

    return (
      <div
        key={cell.key}
        onDragOver={(event) => handleDayDragOver(event, cell)}
        onDragEnter={(event) => handleDayDragOver(event, cell)}
        onDrop={(event) => handleDayDrop(event, cell)}
        onDragLeave={() => setHoveredDay(null)}
        className={`relative min-h-[120px] rounded-md border transition-all duration-150 ${
          cell.isPast
            ? 'border-charcoal/30 bg-surface/70 text-vanilla/50'
            : 'border-charcoal/50 bg-surface text-vanilla/80'
        } ${cell.isToday ? 'border-pacific/60 shadow-[0_10px_30px_rgba(64,160,178,0.08)]' : ''} ${
          isHovered ? 'border-pacific bg-pacific/10 shadow-[0_10px_28px_rgba(64,160,178,0.18)]' : ''
        }`}
      >
        <div className="flex items-center justify-between px-3 pt-3 text-sm font-semibold">
          <span className={cell.isPast ? 'text-vanilla/40' : 'text-vanilla'}>
            {cell.date.getDate()}
          </span>
          {cell.isToday && (
            <span className="text-[10px] uppercase tracking-[0.3em] text-pacific">Today</span>
          )}
        </div>
        <div className="mt-2 space-y-2 px-2 pb-3">
          {events.map((entry) => (
            <button
              key={`${entry.carouselId}-${entry.dateKey}`}
              type="button"
              draggable
              onDragStart={() => setDraggingId(entry.carouselId)}
              onDragEnd={() => setDraggingId(null)}
              onClick={() => handleEventClick(entry)}
              className="group flex w-full items-center gap-2 rounded-md border border-charcoal/50 bg-surface-alt/90 px-2 py-2 text-left text-xs transition-all duration-150 hover:-translate-y-[1px] hover:border-pacific/60"
            >
              {entry.thumbnail ? (
                <img
                  src={entry.thumbnail}
                  alt=""
                  className="h-8 w-8 flex-shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-ink/70 text-[10px] font-semibold text-vanilla/70">
                  SF
                </div>
              )}
              <span className="text-[11px] font-semibold text-vanilla/80 whitespace-nowrap">
                {entry.displayTime}
              </span>
            </button>
          ))}
          {!events.length && !cell.isPast && (
            <div className="mx-auto h-20 w-20 rounded-lg border border-dashed border-charcoal/40 bg-ink/40" />
          )}
          {cell.isPast && (
            <div className="h-6" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 space-y-4">
          <div className="flex flex-wrap items-start justify-start gap-4">
            <div className="space-y-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-pacific font-semibold text-sm hover:text-vanilla transition-colors"
              >
                <span className="text-lg">←</span>
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-semibold">{month.monthLabel}</h1>
              <p className="max-w-2xl text-vanilla/70">
                Drag completed carousels from the right into a future date. We&apos;ll pin the time in
                your local zone and keep scheduled posts out of your unscheduled list.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="sf-pill border-pacific/50 bg-pacific/10 text-pacific">Current month</span>
                <span className="sf-pill">Today marked with a glow</span>
                <span className="sf-pill">Past dates locked</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[2.2fr_0.8fr]">
            <section className="sf-card p-2 lg:p-3">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-vanilla/50">This month</p>
                  <h2 className="text-xl font-semibold text-vanilla">Schedule board</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-surface-alt px-3 py-2 text-xs text-vanilla/70 border border-charcoal/50">
                  <Clock3 className="h-4 w-4 text-pacific" />
                  Local time • {timeZoneLabel}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-[4px] pb-1 text-center text-[11px] uppercase tracking-[0.3em] text-vanilla/50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                  <span key={label}>{label.slice(0, 1)}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-[4px]">{month.cells.map((cell) => renderDayCell(cell))}</div>
            </section>

            <aside className="sf-panel p-3 lg:p-5 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-vanilla/50">Carousels</p>
                  <h2 className="text-xl font-semibold text-vanilla">Ready to schedule</h2>
                  <p className="text-sm text-vanilla/70">
                    Drag to the calendar. Scheduled posts disappear from this list automatically.
                  </p>
                </div>
                <div className="rounded-full border border-charcoal/50 bg-ink/60 px-3 py-1 text-xs text-vanilla/60">
                  {availableCarousels.length} ready
                </div>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
                {loading && (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="animate-pulse rounded-lg border border-charcoal/40 bg-surface/70 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-md bg-charcoal/40" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/5 rounded-full bg-charcoal/40" />
                            <div className="h-3 w-2/5 rounded-full bg-charcoal/30" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && availableCarousels.length === 0 && (
                  <div className="rounded-lg border border-charcoal/50 bg-surface px-4 py-5 text-center">
                    <p className="text-sm text-vanilla/70">
                      Nothing left to schedule. Publish or create a new carousel to see it here.
                    </p>
                  </div>
                )}

                {!loading &&
                  availableCarousels.map((carousel) => (
                    <button
                      key={carousel.id}
                      type="button"
                      draggable
                      onDragStart={() => setDraggingId(carousel.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => openScheduleModal(carousel.id)}
                      className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-charcoal/50 bg-surface px-3 py-3 text-left transition-all duration-150 hover:-translate-y-[1px] hover:border-pacific/60"
                    >
                      {thumbnails[carousel.id] ? (
                        <img
                          src={thumbnails[carousel.id]}
                          alt=""
                          className="h-14 w-14 flex-shrink-0 rounded-md object-cover shadow-soft"
                        />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-ink/80 text-xs uppercase tracking-[0.2em] text-vanilla/60">
                          {carousel.title?.slice(0, 2) || 'SF'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-vanilla">{carousel.title}</p>
                        <p className="text-xs text-vanilla/60">
                          {(carousel.status || 'Draft').replace(/\b\w/g, (l) => l.toUpperCase())} • Click or drag to schedule
                        </p>
                      </div>
                      <GripVertical className="h-4 w-4 text-vanilla/40 transition group-hover:text-pacific" />
                    </button>
                  ))}
              </div>
            </aside>
          </div>
        </div>
      </main>

      <PageDots total={TOTAL_APP_PAGES} active={4} />

      {toast && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center px-4 z-50">
          <div className="rounded-md bg-surface border border-charcoal/50 px-4 py-3 text-sm text-vanilla shadow-soft">
            {toast}
          </div>
        </div>
      )}

      {showModal && pendingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="sf-panel w-full max-w-md p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-vanilla/50">Schedule</p>
                <h3 className="text-xl font-semibold text-vanilla">
                  {friendlyDate(pendingSchedule.dateKey)}
                </h3>
                <p className="text-sm text-vanilla/70">Set the go-live time in your local zone.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full border border-charcoal/60 bg-surface p-2 text-vanilla/70 hover:text-vanilla transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pendingCarousel && (
              <div className="mt-4 flex items-center gap-3 rounded-md border border-charcoal/60 bg-surface px-3 py-3">
                {pendingThumbnail ? (
                  <img
                    src={pendingThumbnail}
                    alt=""
                    className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-ink/70 text-xs uppercase tracking-[0.2em] text-vanilla/60">
                    {pendingCarousel.title?.slice(0, 2) || 'SF'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-vanilla">{pendingCarousel.title}</p>
                  <p className="text-xs text-vanilla/60">Created {pendingCarousel.createdAt}</p>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <label className="sf-label" htmlFor="schedule-time">
                Time
              </label>
              <div className="relative">
                <select
                  id="schedule-time"
                  value={timeInput}
                  onChange={(event) => setTimeInput(event.target.value)}
                  className="w-full appearance-none rounded-md border border-charcoal/50 bg-surface-alt px-4 py-3 text-vanilla shadow-soft focus:border-pacific focus:outline-none focus:ring-2 focus:ring-pacific"
                >
                  {timeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-vanilla/50">
                  <Clock3 className="h-4 w-4" />
                </div>
              </div>
              <div className="rounded-md border border-charcoal/50 bg-surface px-3 py-2 text-xs text-vanilla/60">
                Local zone: {timeZoneLabel}. Scheduled posts drop out of the unscheduled list.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              {scheduled[pendingSchedule.carouselId] && (
                <button
                  type="button"
                  onClick={unschedule}
                  className="text-sm text-vanilla/70 underline decoration-charcoal/60 decoration-2 underline-offset-4 hover:text-vanilla"
                >
                  Remove from calendar
                </button>
              )}
              <div className="flex flex-1 justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="sf-btn-secondary px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSchedule}
                  className="sf-btn-primary px-4 py-2 text-sm"
                >
                  Save schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
