import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchUserCarousels, fetchCarouselWithSlides, deleteCarousel as dbDeleteCarousel } from '../lib/database';

export interface CarouselSlide {
  id: string;
  image: string;
  caption: string;
  design?: 'minimalist' | 'bold' | 'elegant';
  originalMedia?: any;
  derivatives?: any[];
}

export interface Carousel {
  id: string;
  title: string;
  description: string;
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
  const refreshCarousels = async () => {
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
        description: dbCarousel.title, // Using title as description for now
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
  };

  // Load carousels when user changes
  React.useEffect(() => {
    refreshCarousels();
  }, [user]);

  // Fetch a specific carousel with all its data
  const fetchCarousel = async (id: string): Promise<Carousel | null> => {
    if (!user) return null;

    try {
      const carouselData = await fetchCarouselWithSlides(id, user.id);
      
      // Transform to app format
      const transformedCarousel: Carousel = {
        id: carouselData.id,
        title: carouselData.title,
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
  };
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
  };

  return <CarouselContext.Provider value={value}>{children}</CarouselContext.Provider>;
}