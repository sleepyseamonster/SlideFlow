import { useContext } from 'react';
import { MediaLibraryContext } from './media-library-context';

export function useMediaLibrary() {
  const context = useContext(MediaLibraryContext);
  if (context === undefined) {
    throw new Error('useMediaLibrary must be used within a MediaLibraryProvider');
  }
  return context;
}
