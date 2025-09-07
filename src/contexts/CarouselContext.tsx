import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CarouselSlide {
  id: string;
  image: string;
  caption: string;
  design: 'minimalist' | 'bold' | 'elegant';
}

export interface Carousel {
  id: string;
  title: string;
  description: string;
  slides: CarouselSlide[];
  createdAt: string;
  style: 'minimalist' | 'bold' | 'elegant';
}

interface CarouselContextType {
  carousels: Carousel[];
  currentCarousel: Carousel | null;
  setCurrentCarousel: (carousel: Carousel | null) => void;
  addCarousel: (carousel: Carousel) => void;
  deleteCarousel: (id: string) => void;
  duplicateCarousel: (id: string) => void;
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
  const [carousels, setCarousels] = useState<Carousel[]>([
    // Mock data for demonstration
    {
      id: '1',
      title: 'Marketing Tips Carousel',
      description: 'Essential marketing strategies for entrepreneurs',
      style: 'minimalist',
      createdAt: '2024-01-15',
      slides: [
        {
          id: '1',
          image: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1080&dpr=2',
          caption: '5 Marketing Tips Every Entrepreneur Should Know',
          design: 'minimalist'
        },
        {
          id: '2',
          image: 'https://images.pexels.com/photos/3184328/pexels-photo-3184328.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1080&dpr=2',
          caption: 'Tip 1: Know Your Audience Inside and Out',
          design: 'minimalist'
        },
        {
          id: '3',
          image: 'https://images.pexels.com/photos/3184337/pexels-photo-3184337.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1080&dpr=2',
          caption: 'Tip 2: Create Compelling Content That Resonates',
          design: 'minimalist'
        }
      ]
    }
  ]);
  const [currentCarousel, setCurrentCarousel] = useState<Carousel | null>(null);

  const addCarousel = (carousel: Carousel) => {
    setCarousels(prev => [...prev, carousel]);
  };

  const deleteCarousel = (id: string) => {
    setCarousels(prev => prev.filter(c => c.id !== id));
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
    setCurrentCarousel,
    addCarousel,
    deleteCarousel,
    duplicateCarousel
  };

  return <CarouselContext.Provider value={value}>{children}</CarouselContext.Provider>;
}