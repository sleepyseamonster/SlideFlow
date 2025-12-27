export type BackgroundStyleKey = 'minimal' | 'bold' | 'elegant';

export type DbBrandProfileRow = {
  id: string;
  name: string | null;
  palette: { primary?: string; secondary?: string; accent1?: string; accent2?: string } | null;
  fonts: { primary?: string; body?: string; secondary?: string } | null;
  defaults: { style?: string } | null;
  is_default?: boolean | null;
  updated_at?: string | null;
};

export interface StudioLocalSlide {
  id: string;
  image: string;
  label: string;
  status: 'Original' | 'Edited' | 'AI Enhanced' | 'Draft';
}

export type TextOverlay = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontId: string;
  color: string;
  align: 'left' | 'center' | 'right';
};

export type TextLayer = TextOverlay & {
  id: string;
};

export type ImageOverlayLayer = {
  id: string;
  src: string;
  sizePercent: number;
  x: number;
  y: number;
};

export type StudioEditState = {
  selectedAspect: '4:5' | '1:1' | '9:16';
  editedSlideImages: Record<string, string>;
  cropPositions: Record<string, { x: number; y: number }>;
  cropZoomLevels: Record<string, number>;
  textLayersBySlide: Record<string, TextLayer[]>;
  selectedTextLayerBySlide: Record<string, string>;
  imageOverlaysBySlide: Record<string, ImageOverlayLayer[]>;
};

export type StudioHistory = {
  stack: StudioEditState[];
  index: number;
};
