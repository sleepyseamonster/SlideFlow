import React, { useState, ReactNode, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  fetchUserCarousels,
  fetchCarouselWithSlides,
  deleteCarousel as dbDeleteCarousel,
  duplicateCarouselDeep,
} from '../lib/database';
import { supabase } from '../lib/supabase';
import { CarouselContext, type CarouselContextType } from './carousel-context';

interface CarouselProviderProps {
  children: ReactNode;
}

export function CarouselProvider({ children }: CarouselProviderProps) {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCarousel, setCurrentCarousel] = useState<Carousel | null>(null);
  const { user } = useAuth();

  // Load carousels from database
  const refreshCarousels = useCallback(async () => {
    if (!user) {
      setCarousels([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const dbCarousels = await fetchUserCarousels(user.id);
      
      // Transform database carousels to app format
      const transformedCarousels: Carousel[] = dbCarousels.map(dbCarousel => ({
        id: dbCarousel.id,
        title: dbCarousel.title,
        caption: dbCarousel.caption || '',
        description: dbCarousel.title,
        slides: [], // Will be loaded when needed
        createdAt: new Date(dbCarousel.created_at).toLocaleDateString(),
        style: 'minimalist' as const, // Default style
        status: dbCarousel.status,
        scheduled_at: dbCarousel.scheduled_at || null,
        posting_status: dbCarousel.posting_status || 'draft',
        publish_started_at: dbCarousel.publish_started_at || null,
        publish_completed_at: dbCarousel.publish_completed_at || null,
        publish_error: dbCarousel.publish_error || null,
      }));
      
      setCarousels(transformedCarousels);
    } catch (error) {
      console.error('Error loading carousels:', error);
      setCarousels([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load carousels when user changes
  React.useEffect(() => {
    refreshCarousels();
  }, [refreshCarousels]);

  // Fetch a specific carousel with all its data
  const fetchCarousel = useCallback(async (id: string): Promise<Carousel | null> => {
    if (!user) return null;

    try {
      const carouselData = await fetchCarouselWithSlides(id, user.id);
      
      // Transform to app format
      const transformedCarousel: Carousel = {
        id: carouselData.id,
        title: carouselData.title,
        caption: carouselData.caption || '',
        description: carouselData.title,
        createdAt: new Date(carouselData.created_at).toLocaleDateString(),
        style: 'minimalist' as const,
        status: carouselData.status,
        scheduled_at: carouselData.scheduled_at || null,
        posting_status: carouselData.posting_status || 'draft',
        publish_started_at: carouselData.publish_started_at || null,
        publish_completed_at: carouselData.publish_completed_at || null,
        publish_error: carouselData.publish_error || null,
        slides: carouselData.slides.map(slide => ({
          id: slide.id,
          image: slide.image,
          caption: slide.text?.caption || 'Generated slide',
          originalMedia: slide.originalMedia,
          derivatives: slide.derivatives
        }))
      };
      
      return transformedCarousel;
    } catch (error) {
      console.error('Error fetching carousel:', error);
      return null;
    }
  }, [user]);
  const updateCarousel = useCallback(
    async (id: string, updates: { title?: string; caption?: string | null; status?: string }) => {
      if (!user) return null;
      try {
        // Only persist fields present in the DB (title, status). Keep caption client-side.
        const dbUpdates: { title?: string; status?: string } = {};
        if (typeof updates.title !== 'undefined') dbUpdates.title = updates.title;
        if (typeof updates.status !== 'undefined') dbUpdates.status = updates.status;

        let data:
          | {
              id: string;
              title: string;
              status: string;
            }
          | null = null;

        if (Object.keys(dbUpdates).length > 0) {
          const session = await supabase.auth.getSession();
          if (!session.data.session) {
            throw new Error('Session expired');
          }

          const sessionData = session.data.session;
          await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token ?? '',
          });

          const response = await supabase
            .from('carousel')
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select('id, title, status')
            .single();

          if (response.error) {
            throw response.error;
          }
          data = response.data;
        }

        // Update local state using DB response plus any client-only fields.
        if (data) {
          setCarousels((prev) =>
            prev.map((carousel) =>
              carousel.id === id
                ? {
                    ...carousel,
                    title: data.title,
                    caption: typeof updates.caption !== 'undefined' ? updates.caption ?? '' : carousel.caption,
                    description: data.title,
                    status: data.status,
                  }
                : carousel
            )
          );

          if (currentCarousel?.id === id) {
            setCurrentCarousel((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                title: data.title,
                caption: typeof updates.caption !== 'undefined' ? updates.caption ?? '' : prev.caption,
                description: data.title,
                status: data.status,
              };
            });
          }

          return {
            id: data.id,
            title: data.title,
            caption: typeof updates.caption !== 'undefined' ? updates.caption ?? '' : currentCarousel?.caption ?? '',
            description: data.title,
            slides: currentCarousel?.slides ?? [],
            createdAt: currentCarousel?.createdAt ?? '',
            style: currentCarousel?.style ?? 'minimalist',
            status: data.status,
          } as Carousel;
        }

        // If nothing was sent to the DB, still update local caption/title if provided.
        if (typeof updates.caption !== 'undefined' || typeof updates.title !== 'undefined' || typeof updates.status !== 'undefined') {
          setCarousels((prev) =>
            prev.map((carousel) =>
              carousel.id === id
                ? {
                    ...carousel,
                    title: typeof updates.title !== 'undefined' ? updates.title : carousel.title,
                    caption: typeof updates.caption !== 'undefined' ? updates.caption ?? '' : carousel.caption,
                    status: typeof updates.status !== 'undefined' ? updates.status : carousel.status,
                  }
                : carousel
            )
          );

          if (currentCarousel?.id === id) {
            setCurrentCarousel((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                title: typeof updates.title !== 'undefined' ? updates.title : prev.title,
                caption: typeof updates.caption !== 'undefined' ? updates.caption ?? '' : prev.caption,
                status: typeof updates.status !== 'undefined' ? updates.status : prev.status,
              };
            });
          }
        }

        return currentCarousel;
      } catch (error) {
        console.error('Error updating carousel:', error);
        return null;
      }
    },
    [user, currentCarousel]
  );

  const addCarousel = (carousel: Carousel) => {
    setCarousels(prev => [...prev, carousel]);
  };

  const deleteCarousel = (id: string) => {
    if (!user) return;
    
    // Delete from database
    dbDeleteCarousel(id, user.id)
      .then(() => {
        // Remove from local state
        setCarousels(prev => prev.filter(c => c.id !== id));
        // Clear current carousel if it was deleted
        if (currentCarousel?.id === id) {
          setCurrentCarousel(null);
        }
      })
      .catch(error => {
        console.error('Error deleting carousel:', error);
        alert('Failed to delete carousel. Please try again.');
      });
  };

  const duplicateCarousel = (id: string) => {
    const carousel = carousels.find(c => c.id === id);
    if (carousel) {
      const duplicate: Carousel = {
        ...carousel,
        id: Date.now().toString(),
        title: `${carousel.title} (Copy)`,
        caption: carousel.caption,
        createdAt: new Date().toISOString().split('T')[0]
      };
      addCarousel(duplicate);
    }
  };

  const scheduleCarousel = useCallback(async (id: string, date: Date) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Store the original carousel state for rollback
    const originalCarousel = carousels.find(c => c.id === id);
    if (!originalCarousel) {
      throw new Error('Carousel not found');
    }
    if ((originalCarousel.status || '').toLowerCase() === 'published') {
      throw new Error('Published carousels cannot be scheduled.');
    }

    // Optimistically update local state
    setCarousels(prev =>
      prev.map(carousel =>
        carousel.id === id
          ? {
              ...carousel,
              scheduled_at: date.toISOString(),
              posting_status: 'scheduled' as const
            }
          : carousel
      )
    );

    try {
      // Update in database
      const { error } = await supabase
        .from('carousel')
        .update({
          scheduled_at: date.toISOString(),
          posting_status: 'scheduled'
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error scheduling carousel:', error);

      // Rollback optimistic update
      setCarousels(prev =>
        prev.map(carousel =>
          carousel.id === id ? originalCarousel : carousel
        )
      );

      throw error;
    }
  }, [user, carousels]);
  const duplicateCarouselDeepAction = async (id: string) => {
    if (!user) return null;
    try {
      const inserted = await duplicateCarouselDeep(id, user.id);
      if (inserted?.id) {
        const newCarousel: Carousel = {
          id: inserted.id,
          title: inserted.title,
          caption: inserted.caption ?? '',
          description: inserted.title,
          slides: [],
          createdAt: new Date(inserted.created_at || Date.now()).toLocaleDateString(),
          style: 'minimalist',
          status: inserted.status,
        };
        addCarousel(newCarousel);
        return newCarousel;
      }
    } catch (err) {
      console.error('Deep duplicate failed', err);
      alert('Could not duplicate this carousel right now. Please try again.');
    }
    return null;
  };

  const value: CarouselContextType = {
    carousels,
    currentCarousel,
    loading,
    setCurrentCarousel,
    addCarousel,
    deleteCarousel,
    duplicateCarousel,
    duplicateCarouselDeep: duplicateCarouselDeepAction,
    refreshCarousels,
    fetchCarousel,
    updateCarousel,
    scheduleCarousel,
  };

  return <CarouselContext.Provider value={value}>{children}</CarouselContext.Provider>;
}
