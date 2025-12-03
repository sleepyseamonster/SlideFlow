import { supabase } from './supabase';

export interface DatabaseCarousel {
  id: string;
  user_id: string;
  title: string;
  aspect: string;
  status: string;
  caption?: string | null;
  caption_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCarouselSlide {
  id: string;
  user_id: string;
  carousel_id: string;
  position: number;
  media_id: string;
  type_code: string;
  overlay?: Record<string, unknown> | null;
  text?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseMedia {
  id: string;
  user_id: string;
  bucket: string;
  path: string;
  filename: string;
  mime_type: string;
  width?: number;
  height?: number;
  created_at: string;
}

export interface DatabaseMediaDerivative {
  id: string;
  user_id: string;
  media_id: string;
  type_code: string;
  bucket: string;
  path: string;
  width?: number;
  height?: number;
  created_at: string;
}

// Fetch all carousels for the current user
export async function fetchUserCarousels(userId: string): Promise<DatabaseCarousel[]> {
  const { data, error } = await supabase
    .from('carousel')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching carousels:', error);
    throw error;
  }

  return data || [];
}

// Fetch a specific carousel with its slides and media
export async function fetchCarouselWithSlides(carouselId: string, userId: string) {
  // Fetch the carousel
  const { data: carousel, error: carouselError } = await supabase
    .from('carousel')
    .select('*')
    .eq('id', carouselId)
    .eq('user_id', userId)
    .single();

  if (carouselError) {
    console.error('Error fetching carousel:', carouselError);
    throw carouselError;
  }

  // Fetch the slides
  const { data: slides, error: slidesError } = await supabase
    .from('carousel_slide')
    .select('*')
    .eq('carousel_id', carouselId)
    .eq('user_id', userId)
    .order('position');

  if (slidesError) {
    console.error('Error fetching slides:', slidesError);
    throw slidesError;
  }

  // For each slide, fetch the media and its derivatives. Be resilient: if media is missing,
  // return a placeholder slide instead of throwing.
  const slidesWithMedia = await Promise.all(
    (slides || []).map(async (slide) => {
      try {
        // Fetch original media
        const { data: media, error: mediaError } = await supabase
          .from('media')
          .select('*')
          .eq('id', slide.media_id)
          .eq('user_id', userId)
          .single();

        if (mediaError || !media) {
          console.warn('Missing media for slide', slide.id, mediaError);
          return { ...slide, image: '', originalMedia: null, derivatives: [] };
        }

        // Fetch derivatives (generated images)
        const { data: derivatives, error: derivativesError } = await supabase
          .from('media_derivative')
          .select('*')
          .eq('media_id', slide.media_id)
          .eq('user_id', userId);

        if (derivativesError) {
          console.warn('Error fetching derivatives for slide', slide.id, derivativesError);
        }

        // Get the square derivative for display (or fall back to original)
        const squareDerivative = derivatives?.find(d => d.type_code === 'square');
        const imageToUse = squareDerivative || media;

        // Generate a signed URL for private media; fall back to public URL if signing fails.
        let signedUrl = '';
        const { data: signed, error: signedError } = await supabase.storage
          .from(imageToUse.bucket)
          .createSignedUrl(imageToUse.path, 60 * 60);
        if (signedError) {
          console.warn('Error creating signed URL, falling back to public URL:', signedError);
          const publicUrl = supabase.storage.from(imageToUse.bucket).getPublicUrl(imageToUse.path);
          signedUrl = publicUrl.data.publicUrl;
        } else {
          signedUrl = signed?.signedUrl || '';
        }

        return {
          ...slide,
          image: signedUrl,
          position: slide.position,
          originalMedia: media,
          derivatives: derivatives || []
        };
      } catch (err) {
        console.error('Failed to build slide with media', slide.id, err);
        return { ...slide, image: '', originalMedia: null, derivatives: [] };
      }
    })
  );

  return {
    ...carousel,
    slides: slidesWithMedia
  };
}

// Fetch a carousel by ID after generation
export async function fetchGeneratedCarousel(carouselId: string, userId: string) {
  return await fetchCarouselWithSlides(carouselId, userId);
}

// Delete a carousel and all its slides
export async function deleteCarousel(carouselId: string, userId: string) {
  // First delete the slides (cascade should handle this, but being explicit)
  const { error: slidesError } = await supabase
    .from('carousel_slide')
    .delete()
    .eq('carousel_id', carouselId)
    .eq('user_id', userId);

  if (slidesError) {
    console.error('Error deleting slides:', slidesError);
    throw slidesError;
  }

  // Then delete the carousel
  const { error: carouselError } = await supabase
    .from('carousel')
    .delete()
    .eq('id', carouselId)
    .eq('user_id', userId);

  if (carouselError) {
    console.error('Error deleting carousel:', carouselError);
    throw carouselError;
  }
}
