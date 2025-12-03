import React, { useState } from 'react';
import { useContentLibrary, type LibraryImage } from '../contexts/ContentLibraryContext';
import { X, Check, Image as ImageIcon } from 'lucide-react';

interface ImportLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (selectedImages: LibraryImage[]) => void;
  maxImages?: number;
  currentImageCount?: number;
}

export default function ImportLibraryModal({
  isOpen,
  onClose,
  onImport,
  maxImages = 10,
  currentImageCount = 0
}: ImportLibraryModalProps) {
  const { images } = useContentLibrary();
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const availableSlots = maxImages - currentImageCount;

  if (!isOpen) return null;

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else if (newSelected.size < availableSlots) {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const selectedLibraryImages = images.filter(img => selectedImages.has(img.id));
      onImport(selectedLibraryImages);
      setSelectedImages(new Set());
      onClose();
    } catch (error) {
      console.error('Failed to import images from library:', error);
      alert('Could not import some images. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-charcoal/50">
        <div className="flex items-center justify-between p-6 border-b border-charcoal/50">
          <div>
            <h2 className="text-xl font-semibold text-vanilla">Import from Library</h2>
            <p className="text-sm text-vanilla/70">
              Select up to {availableSlots} images from your library ({selectedImages.size} selected)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-alt rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-vanilla/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-vanilla mb-2">No images in library</h3>
              <p className="text-vanilla/70">Upload some images to your media library first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => {
                const isSelected = selectedImages.has(image.id);
                const canSelect = selectedImages.size < availableSlots;
                const isDisabled = !isSelected && !canSelect;

                return (
                  <div
                    key={image.id}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-pacific ring-2 ring-pacific/40'
                        : isDisabled
                        ? 'border-charcoal/40 opacity-50 cursor-not-allowed'
                        : 'border-charcoal/50 hover:border-pacific/40'
                    }`}
                    onClick={() => !isDisabled && toggleImageSelection(image.id)}
                  >
                    <div className="aspect-square">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-pacific text-white rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-xs truncate">{image.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-charcoal/50">
          <p className="text-sm text-vanilla/70">
            {selectedImages.size} of {availableSlots} available slots selected
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-alt text-vanilla/80 rounded-lg font-medium transition-colors border border-charcoal/50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedImages.size === 0 || importing}
              className="px-4 py-2 bg-pacific hover:bg-pacific-deep text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${selectedImages.size} Image${selectedImages.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
