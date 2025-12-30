import React, { useEffect, useState } from 'react';
import { X, Search, Image as ImageIcon } from 'lucide-react';
import { useMediaLibrary } from '../contexts/useMediaLibrary';
import type { LibraryImage, LibraryTextItem } from '../contexts/media-library-context';

export type MediaLibraryTab = 'images' | 'studio' | 'captions' | 'prompts';

interface MediaLibraryModalProps {
  isOpen: boolean;
  initialTab?: MediaLibraryTab;
  onClose: () => void;
  onSelectImage?: (image: LibraryImage) => void;
  onSelectCaption?: (text: string) => void;
  onSelectPrompt?: (text: string) => void;
}

const getTextSnippet = (text: string, limit = 180) => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
};

export default function MediaLibraryModal({
  isOpen,
  initialTab = 'images',
  onClose,
  onSelectImage,
  onSelectCaption,
  onSelectPrompt,
}: MediaLibraryModalProps) {
  const { images, studioImages, captions, prompts, studioAvailable } = useMediaLibrary();
  const [activeTab, setActiveTab] = useState<MediaLibraryTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setSearchTerm('');
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabCards = [
    { key: 'images' as const, label: 'Images', count: images.length },
    { key: 'studio' as const, label: 'Studio', count: studioImages.length },
    { key: 'captions' as const, label: 'Captions', count: captions.length },
    { key: 'prompts' as const, label: 'Prompts', count: prompts.length },
  ];

  const activeImages = activeTab === 'studio' ? (studioAvailable ? studioImages : []) : images;
  const filteredImages = activeImages.filter((image) =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCaptions = captions.filter((item) =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPrompts = prompts.filter((item) =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const isImageTab = activeTab === 'images' || activeTab === 'studio';

  const handleSelectText = (type: 'caption' | 'prompt', item: LibraryTextItem) => {
    if (type === 'caption') {
      onSelectCaption?.(item.text);
    } else {
      onSelectPrompt?.(item.text);
    }
    onClose();
  };

  const handleSelectImage = (image: LibraryImage) => {
    if (!onSelectImage) return;
    onSelectImage(image);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-xl shadow-xl border border-charcoal/60 w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-charcoal/50">
          <div>
            <h2 className="text-xl font-semibold text-vanilla">Media Library</h2>
            <p className="text-sm text-vanilla/70">
              Choose saved images, captions, or prompts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-alt text-vanilla/80 border border-charcoal/50"
            aria-label="Close media library"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {tabCards.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-3 py-2 shadow-sm min-w-[140px] text-left border transition-colors ${
                    isActive
                      ? 'bg-pacific/20 border-pacific/50 text-vanilla'
                      : 'bg-ink/40 border-charcoal/50 text-vanilla/70 hover:bg-surface-alt'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide">{tab.label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-pacific/30 text-vanilla' : 'bg-ink/40 text-vanilla/70'
                    }`}>
                      {tab.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vanilla/55" />
              <input
                type="text"
                placeholder={
                  activeTab === 'images'
                    ? 'Search images...'
                    : activeTab === 'studio'
                    ? 'Search studio images...'
                    : activeTab === 'captions'
                    ? 'Search captions...'
                    : 'Search prompts...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-charcoal/50 rounded-lg bg-surface focus:ring-2 focus:ring-pacific focus:border-pacific w-64"
              />
            </div>
            {isImageTab && onSelectImage && (
              <span className="text-xs text-vanilla/60">Click an image to insert.</span>
            )}
            {!isImageTab && (
              <span className="text-xs text-vanilla/60">Click a card to insert.</span>
            )}
          </div>

          <div className="max-h-[55vh] overflow-y-auto pr-1">
            {isImageTab ? (
              filteredImages.length === 0 ? (
                <div className="text-center py-10">
                  <ImageIcon className="h-12 w-12 text-vanilla/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-vanilla mb-2">
                    {activeTab === 'studio' ? 'No studio images yet' : 'No images found'}
                  </h3>
                  <p className="text-vanilla/70">
                    {activeTab === 'studio'
                      ? 'Run Studio tools to see your auto-saved outputs here.'
                      : 'Upload images on the Media Library page.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredImages.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => handleSelectImage(image)}
                      disabled={!onSelectImage}
                      className={`rounded-lg overflow-hidden border bg-ink/30 text-left transition-colors ${
                        onSelectImage
                          ? 'border-charcoal/50 hover:border-pacific/60 hover:shadow-[0_0_0_1px_rgba(64,160,178,0.35)]'
                          : 'border-charcoal/50 cursor-default'
                      }`}
                      aria-label={`Select ${image.name}`}
                    >
                      <div className="aspect-square">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-vanilla/80 truncate">{image.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : activeTab === 'captions' ? (
              filteredCaptions.length === 0 ? (
                <div className="text-center py-10">
                  <ImageIcon className="h-12 w-12 text-vanilla/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-vanilla mb-2">No captions saved</h3>
                  <p className="text-vanilla/70">Save captions from the Generate page.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredCaptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectText('caption', item)}
                      className="text-left bg-surface rounded-lg border border-charcoal/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square p-3 bg-ink/30 overflow-hidden">
                        <p className="text-sm text-vanilla/85 leading-relaxed">
                          {getTextSnippet(item.text, 220)}
                        </p>
                      </div>
                      <div className="px-3 py-2 border-t border-charcoal/40 text-xs text-vanilla/60">
                        Caption
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : filteredPrompts.length === 0 ? (
              <div className="text-center py-10">
                <ImageIcon className="h-12 w-12 text-vanilla/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-vanilla mb-2">No prompts saved</h3>
                <p className="text-vanilla/70">Save prompts from the Generate page.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredPrompts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectText('prompt', item)}
                    className="text-left bg-surface rounded-lg border border-charcoal/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square p-3 bg-ink/30 overflow-hidden">
                      <p className="text-sm text-vanilla/85 leading-relaxed">
                        {getTextSnippet(item.text, 220)}
                      </p>
                    </div>
                    <div className="px-3 py-2 border-t border-charcoal/40 text-xs text-vanilla/60">
                      Prompt
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
