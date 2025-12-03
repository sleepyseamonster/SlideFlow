import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchUserCarousels, fetchCarouselWithSlides, deleteCarousel as dbDeleteCarousel } from '../lib/database';

export interface CarouselSlide {
  id: string;
  image: string;
  caption: string;
  design?: 'minimalist' | 'bold' | 'elegant';
  position?: number;
  originalMedia?: Record<string, unknown> | null;
  derivatives?: Array<Record<string, unknown>>;
}

export interface Carousel {
  id: string;
  title: string;
  caption: string;
  description?: string;
  slides: CarouselSlide[];
  createdAt: string;
  style: 'minimalist' | 'bold' | 'elegant';
  status?: string;
}

interface CarouselContextType {
  carousels: Carousel[];
  currentCarousel: Carousel | null;
  loading: boolean;
  setCurrentCarousel: (carousel: Carousel | null) => void;
  addCarousel: (carousel: Carousel) => void;
  deleteCarousel: (id: string) => void;
  duplicateCarousel: (id: string) => void;
  refreshCarousels: () => Promise<void>;
  fetchCarousel: (id: string) => Promise<Carousel | null>;
  updateCarousel: (id: string, updates: { title?: string; caption?: string | null; status?: string }) => Promise<Carousel | null>;
}

const CarouselContext = createContext<CarouselContextType | undefined>(undefined);

export function useCarousel() {
  const context = useContext(CarouselContext);
  if (context === undefined) {
    throw new Error('useCarousel must be used within a CarouselProvider');
  }
  return context;
}

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
        status: dbCarousel.status
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
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          throw new Error('Session expired');
        }

        const sessionData = session.data.session;
        await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token ?? '',
        });

        const { data, error } = await supabase
          .from('carousel')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id)
          .select('*')
          .single();

        if (error || !data) {
          throw error || new Error('Failed to update carousel');
        }

        setCarousels((prev) =>
          prev.map((carousel) =>
            carousel.id === data.id
              ? {
                  ...carousel,
                  title: data.title,
                  caption: data.caption || carousel.caption,
                  description: data.title,
                  createdAt: new Date(data.created_at).toLocaleDateString(),
                  status: data.status,
                }
              : carousel
          )
        );

        if (currentCarousel?.id === data.id) {
          setCurrentCarousel((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              title: data.title,
              caption: data.caption || prev.caption,
              description: data.title,
              status: data.status,
            };
          });
        }

        return {
          ...data,
          title: data.title,
          caption: data.caption || '',
          description: data.title,
          slides: currentCarousel?.id === data.id ? currentCarousel.slides : [],
          createdAt: new Date(data.created_at).toLocaleDateString(),
          style: 'minimalist',
          status: data.status,
        };
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

  const value = {
    carousels,
    currentCarousel,
    loading,
    setCurrentCarousel,
    addCarousel,
    deleteCarousel,
    duplicateCarousel,
    refreshCarousels,
    fetchCarousel
    ,
    updateCarousel
  };

  return <CarouselContext.Provider value={value}>{children}</CarouselContext.Provider>;
}
