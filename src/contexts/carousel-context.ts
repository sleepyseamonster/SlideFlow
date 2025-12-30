import { createContext } from 'react';

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
  scheduled_at?: string | null;
  posting_status?: 'draft' | 'scheduled' | 'posted' | 'failed';
  publish_started_at?: string | null;
  publish_completed_at?: string | null;
  publish_error?: string | null;
}

export interface CarouselContextType {
  carousels: Carousel[];
  currentCarousel: Carousel | null;
  loading: boolean;
  setCurrentCarousel: (carousel: Carousel | null) => void;
  addCarousel: (carousel: Carousel) => void;
  deleteCarousel: (id: string) => void;
  duplicateCarousel: (id: string) => void;
  duplicateCarouselDeep: (id: string) => Promise<Carousel | null>;
  refreshCarousels: () => Promise<void>;
  fetchCarousel: (id: string) => Promise<Carousel | null>;
  updateCarousel: (id: string, updates: { title?: string; caption?: string | null; status?: string }) => Promise<Carousel | null>;
  scheduleCarousel: (id: string, date: Date) => Promise<void>;
}

export const CarouselContext = createContext<CarouselContextType | undefined>(undefined);
