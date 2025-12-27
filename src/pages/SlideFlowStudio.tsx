import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import MediaLibraryModal, { type MediaLibraryTab } from '../components/MediaLibraryModal';
import { supabase } from '../lib/supabase';
import { DEFAULT_PRIMARY_FONT_ID, getFont, getFontOptions } from '../lib/fonts';
import { useAuth } from '../contexts/AuthContext';
import { type LibraryImage } from '../contexts/MediaLibraryContext';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ChevronDown,
  Crop,
  Download,
  Eraser,
  FolderOpen,
  ImageMinus,
  ImagePlus,
  Palette,
  Redo2,
  RotateCcw,
  Save,
  Sparkles,
  Type,
  Undo2,
  Upload,
  Wand2,
} from 'lucide-react';
import { type Carousel } from '../contexts/CarouselContext';

const TOTAL_APP_PAGES = 5;

type BackgroundStyleKey = 'minimal' | 'bold' | 'elegant';

type DbBrandProfileRow = {
  id: string;
  name: string | null;
  palette: { primary?: string; secondary?: string; accent1?: string; accent2?: string } | null;
  fonts: { primary?: string; body?: string; secondary?: string } | null;
  defaults: { style?: string } | null;
  is_default?: boolean | null;
  updated_at?: string | null;
};

interface StudioLocalSlide {
  id: string;
  image: string;
  label: string;
  status: 'Original' | 'Edited' | 'AI Enhanced' | 'Draft';
}

type TextOverlay = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontId: string;
  color: string;
  align: 'left' | 'center' | 'right';
};

type TextLayer = TextOverlay & {
  id: string;
};

type ImageOverlayPlacement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

type ImageOverlayConfig = {
  src: string;
  sizePercent: number; // % of canvas width
  placement: ImageOverlayPlacement;
};

type StudioEditState = {
  selectedAspect: '4:5' | '1:1' | '9:16';
  editedSlideImages: Record<string, string>;
  cropPositions: Record<string, { x: number; y: number }>;
  cropZoomLevels: Record<string, number>;
  textLayersBySlide: Record<string, TextLayer[]>;
  selectedTextLayerBySlide: Record<string, string>;
  imageOverlaysBySlide: Record<string, ImageOverlayConfig>;
};

type StudioHistory = {
  stack: StudioEditState[];
  index: number;
};

const HISTORY_LIMIT = 20;
const EXPORT_SIZES: Record<StudioEditState['selectedAspect'], { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
};

const BACKGROUND_STYLE_PROMPTS: Record<
  BackgroundStyleKey,
  {
    label: string;
    positive: string;
    negative: string;
  }
> = {
  minimal: {
    label: 'Minimal',
    positive: [
      'Create an abstract background intended to function as a neutral design surface.',
      'This image is a background surface, not a focal artwork.',
      'The visual style must be extremely minimal, restrained, and calm.',
      'Prioritize negative space above all else.',
      'The composition should consist of large, uninterrupted areas of soft color with only the faintest suggestion of form through gentle tonal shifts or barely perceptible curves.',
      'No focal points. No visual hierarchy inside the background itself.',
      'The image should feel quiet, balanced, and intentionally understated - almost invisible.',
      'The image must not depict a scene, environment, or implied physical space.',
      'Use a strictly limited color palette derived from the brand colors:',
      '- Primary color: {{PRIMARY_COLOR}}',
      '- Secondary color: {{SECONDARY_COLOR}}',
      '- Accent colors: {{ACCENT_1}}, {{ACCENT_2}}',
      'Do not introduce any colors outside the provided brand palette.',
      'Apply color as subtle tints or very soft gradients only.',
      'Keep contrast low and transitions smooth.',
      'Overall saturation and visual intensity should remain controlled and intentional.',
      'The background must remain fully text-safe and visually subordinate to any foreground content placed on top of it.',
      'The background should feel reusable across many slides, not specific to a single message.',
      'If a design choice feels unnecessary, remove it rather than adding more elements.',
    ].join('\n'),
    negative:
      'Do not include realism, photography, objects, illustrations, patterns, textures, grain, noise, decorative elements, sharp edges, dramatic lighting, strong contrast, complex shapes, or any visual element that draws attention to itself.',
  },
  bold: {
    label: 'Bold',
    positive: [
      'Create an abstract background designed to feel confident, assertive, and high-impact.',
      'This image is a background surface, not a focal artwork.',
      'The composition should be structured and intentional, using strong geometric forms and clear visual direction.',
      'Energy should come from contrast, shape, and color dominance - not from texture or decoration.',
      'Use bold, decisive geometry such as diagonals, large blocks, or layered planes.',
      'The background should feel powerful and modern, capable of supporting large headlines without competition.',
      'The image must not depict a scene, environment, or implied physical space.',
      'Use a limited color palette derived from the brand colors:',
      '- Primary color: {{PRIMARY_COLOR}} (dominant)',
      '- Secondary color: {{SECONDARY_COLOR}}',
      '- Accent colors: {{ACCENT_1}}, {{ACCENT_2}} (minimal, intentional use only)',
      'Do not introduce any colors outside the provided brand palette.',
      'Establish a clear color hierarchy: one dominant color, one supporting color, and restrained accent usage.',
      'Maintain clean edges, controlled contrast, and intentional spacing.',
      'Overall saturation and visual intensity should remain controlled and intentional.',
      'Ensure the background remains text-safe and uncluttered despite its visual strength.',
      'The background should feel reusable across many slides, not specific to a single message.',
      'If a design choice feels decorative, remove it in favor of structure.',
    ].join('\n'),
    negative:
      'Do not include realism, photography, illustrations, playful shapes, random textures, noise, painterly effects, gradients without structure, excessive color variation, decorative elements, or chaotic composition.',
  },
  elegant: {
    label: 'Elegant',
    positive: [
      'Create an abstract background designed to feel refined, premium, and quietly luxurious.',
      'This image is a background surface, not a focal artwork.',
      'The visual tone should be calm, composed, and elite.',
      'Use flowing forms, soft curves, and layered tonal depth rather than sharp geometry.',
      'Contrast should be subtle and controlled, created through gentle gradients, light falloff, and smooth transitions.',
      'The background should feel editorial and timeless, never trendy or flashy.',
      'The image must not depict a scene, environment, or implied physical space.',
      'Use a restrained color palette derived from the brand colors:',
      '- Primary color: {{PRIMARY_COLOR}}',
      '- Secondary color: {{SECONDARY_COLOR}}',
      '- Accent colors: {{ACCENT_1}}, {{ACCENT_2}}',
      'Do not introduce any colors outside the provided brand palette.',
      'Muted saturation is preferred.',
      'Accent colors should appear only as very subtle highlights or depth enhancers.',
      'Overall saturation and visual intensity should remain controlled and intentional.',
      'The composition must remain visually calm, balanced, and supportive of foreground content, never competing for attention.',
      'The background should feel reusable across many slides, not specific to a single message.',
      'If a design choice feels modern or trendy, replace it with something more timeless.',
    ].join('\n'),
    negative:
      'Do not include harsh contrast, bold geometry, playful or decorative shapes, bright saturation, modern graphic styles, textures, realism, illustrations, noise, or attention-grabbing focal points.',
  },
};

const IMAGE_STYLE_PROMPTS: Record<
  BackgroundStyleKey,
  {
    label: string;
    prompt: string;
  }
> = {
  minimal: {
    label: 'Minimal',
    prompt:
      'Minimal, restrained composition with generous negative space, soft transitions, and clean structure.',
  },
  bold: {
    label: 'Bold',
    prompt:
      'Bold, high-contrast composition with confident geometry, clear hierarchy, and strong visual impact.',
  },
  elegant: {
    label: 'Elegant',
    prompt:
      'Elegant, refined composition with soft curves, subtle gradients, and a premium editorial feel.',
  },
};

const normalizeStyleKey = (styleLabel?: string | null): BackgroundStyleKey | null => {
  if (!styleLabel) return null;
  const normalized = styleLabel.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith('min')) return 'minimal';
  if (normalized.startsWith('bold')) return 'bold';
  if (normalized.startsWith('eleg')) return 'elegant';
  return null;
};

const safeSetStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const safeGetStorage = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeRemoveStorage = (key: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const DEFAULT_STORAGE_KEY_PREFIX = 'slideflow_default_brand_profile_';

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '').trim();
  if (!normalized) return null;
  const full = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized;
  if (full.length !== 6) return null;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();

const normalizeHexInput = (value: string): string | null => {
  const trimmed = value.trim().replace('#', '');
  if (!trimmed) return null;
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(trimmed)) return null;
  const full = trimmed.length === 3
    ? trimmed
        .split('')
        .map((char) => char + char)
        .join('')
    : trimmed;
  return `#${full}`.toUpperCase();
};

const rgbToHsv = (r: number, g: number, b: number) => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === rNorm) hue = ((gNorm - bNorm) / delta) % 6;
    else if (max === gNorm) hue = (bNorm - rNorm) / delta + 2;
    else hue = (rNorm - gNorm) / delta + 4;
  }
  hue = Math.round(((hue * 60) + 360) % 360);
  const sat = max === 0 ? 0 : Math.round((delta / max) * 100);
  const val = Math.round(max * 100);
  return { h: hue, s: sat, v: val };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  const sat = s / 100;
  const val = v / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

export default function SlideFlowStudio() {
  const location = useLocation();
  const { user } = useAuth();
  const navState = location.state as
    | { from?: 'generate' | 'publish' | 'dashboard'; carousel?: Carousel; caption?: string }
    | null;
  const navCarousel = navState?.carousel;
  const navCaption = navState?.caption ?? '';
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeTool, setActiveTool] = useState('crop');
  const [selectedAspect, setSelectedAspect] = useState<'4:5' | '1:1' | '9:16'>('4:5');
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedBrandProfile, setSelectedBrandProfile] = useState('');
  const [brandProfiles, setBrandProfiles] = useState<
    Array<{
      id: string;
      label: string;
      colors: string[];
      primaryFontId?: string;
      bodyFontId?: string;
      style?: string | null;
      isDefault?: boolean;
    }>
  >([]);
  const [brandProfilesLoading, setBrandProfilesLoading] = useState(false);
  const [brandProfilesError, setBrandProfilesError] = useState<string | null>(null);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [textPickerOpen, setTextPickerOpen] = useState(false);
  const [textPickerHue, setTextPickerHue] = useState(210);
  const [textPickerSat, setTextPickerSat] = useState(20);
  const [textPickerVal, setTextPickerVal] = useState(90);
  const [textHexInput, setTextHexInput] = useState('E9E3CD');
  const [localSlides, setLocalSlides] = useState<StudioLocalSlide[]>([]);
  const [editedSlideImages, setEditedSlideImages] = useState<Record<string, string>>({});
  const [textLayersBySlide, setTextLayersBySlide] = useState<Record<string, TextLayer[]>>({});
  const [selectedTextLayerBySlide, setSelectedTextLayerBySlide] = useState<Record<string, string>>({});
  const [imageOverlaysBySlide, setImageOverlaysBySlide] = useState<Record<string, ImageOverlayConfig>>({});
  const [bgRemoveWorking, setBgRemoveWorking] = useState(false);
  const [bgReplaceWorking, setBgReplaceWorking] = useState(false);
  const [bgReplaceMode, setBgReplaceMode] = useState<'image' | 'prompt'>('image');
  const [bgReplacePrompt, setBgReplacePrompt] = useState('');
  const [bgReplaceRef, setBgReplaceRef] = useState<{
    file?: File;
    previewUrl: string;
    sourceUrl?: string;
    label?: string;
    revokeOnCleanup?: boolean;
  } | null>(null);
  const [bgReplaceUseBrandProfile, setBgReplaceUseBrandProfile] = useState(false);
  const [bgReplaceStylePreset, setBgReplaceStylePreset] = useState<BackgroundStyleKey | null>(null);
  const [bgGeneratePrompt, setBgGeneratePrompt] = useState('');
  const [bgGenerateUseBrandProfile, setBgGenerateUseBrandProfile] = useState(false);
  const [bgGenerateStylePreset, setBgGenerateStylePreset] = useState<BackgroundStyleKey | null>(null);
  const [bgGenerateWorking, setBgGenerateWorking] = useState(false);
  const [vectorizeWorking, setVectorizeWorking] = useState(false);
  const [vectorizeResultUrl, setVectorizeResultUrl] = useState<string | null>(null);
  const [bgReplaceDragActive, setBgReplaceDragActive] = useState(false);
  const [imageOverlayDragActive, setImageOverlayDragActive] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryTab, setLibraryTab] = useState<MediaLibraryTab>('images');
  const [upscaleWorking, setUpscaleWorking] = useState(false);
  const [upscaleModel] = useState<'seedvr2'>('seedvr2');
  const [upscaleStatus, setUpscaleStatus] = useState<string | null>(null);
  const [upscaleTargetSlideId, setUpscaleTargetSlideId] = useState<string | null>(null);
  const [upscaleTargetSlideLabel, setUpscaleTargetSlideLabel] = useState<string | null>(null);
  const [upscaleLastOutputUrl, setUpscaleLastOutputUrl] = useState<string | null>(null);
  const [upscaleElapsedMs, setUpscaleElapsedMs] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [saveWorking, setSaveWorking] = useState(false);
  const [aiEditWorking, setAiEditWorking] = useState(false);
  const [draggingSlideId, setDraggingSlideId] = useState<string | null>(null);
  const previewInputRef = useRef<HTMLInputElement | null>(null);
  const bgReplaceInputRef = useRef<HTMLInputElement | null>(null);
  const imageOverlayInputRef = useRef<HTMLInputElement | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const upscalePollTimeoutRef = useRef<number | null>(null);
  const upscalePollTokenRef = useRef(0);
  const upscaleStartAtRef = useRef<number | null>(null);
  const createdObjectUrls = useRef<string[]>([]);
  const createdOverlayUrls = useRef<string[]>([]);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const [cropPositions, setCropPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [cropZoomLevels, setCropZoomLevels] = useState<Record<string, number>>({});
  const cropDragRef = useRef<{
    key: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    frameWidth: number;
    frameHeight: number;
  } | null>(null);
  const textDragRef = useRef<{
    slideId: string;
    layerId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    frameWidth: number;
    frameHeight: number;
  } | null>(null);
  const brandMenuRef = useRef<HTMLDivElement | null>(null);
  const fontMenuRef = useRef<HTMLDivElement | null>(null);
  const textColorSquareRef = useRef<HTMLDivElement | null>(null);
  const textPickerDragRef = useRef(false);
  const isRestoringHistoryRef = useRef(false);
  const [history, setHistory] = useState<StudioHistory>({ stack: [], index: 0 });
  const [historyCommitTick, setHistoryCommitTick] = useState(0);
  const historyCommitTimeoutRef = useRef<number | null>(null);

  const cloneEditState = (state: StudioEditState): StudioEditState => {
    if (typeof structuredClone === 'function') return structuredClone(state);
    return JSON.parse(JSON.stringify(state)) as StudioEditState;
  };

  const getCurrentEditState = (): StudioEditState => ({
    selectedAspect,
    editedSlideImages,
    cropPositions,
    cropZoomLevels,
    textLayersBySlide,
    selectedTextLayerBySlide,
    imageOverlaysBySlide,
  });

  const captureEditState = (): StudioEditState => cloneEditState(getCurrentEditState());

  const deepEqual = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true;
    if (typeof a !== typeof b) return false;
    if (!a || !b) return false;
    if (typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!(key in objB)) return false;
      if (!deepEqual(objA[key], objB[key])) return false;
    }
    return true;
  };

  const requestHistoryCommit = () => {
    if (isRestoringHistoryRef.current) return;
    setHistoryCommitTick((prev) => prev + 1);
  };

  const requestHistoryCommitDebounced = (delayMs = 450) => {
    if (isRestoringHistoryRef.current) return;
    if (historyCommitTimeoutRef.current) {
      window.clearTimeout(historyCommitTimeoutRef.current);
    }
    historyCommitTimeoutRef.current = window.setTimeout(() => {
      historyCommitTimeoutRef.current = null;
      requestHistoryCommit();
    }, delayMs);
  };

  const restoreEditState = (state: StudioEditState) => {
    const snapshot = cloneEditState(state);
    setSelectedAspect(snapshot.selectedAspect);
    setEditedSlideImages(snapshot.editedSlideImages);
    setCropPositions(snapshot.cropPositions);
    setCropZoomLevels(snapshot.cropZoomLevels);
    setTextLayersBySlide(snapshot.textLayersBySlide);
    setSelectedTextLayerBySlide(snapshot.selectedTextLayerBySlide);
    setImageOverlaysBySlide(snapshot.imageOverlaysBySlide);
  };

  useEffect(() => {
    if (history.stack.length) return;
    setHistory({ stack: [captureEditState()], index: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!history.stack.length) return;
    if (isRestoringHistoryRef.current) return;

    const nextSnapshot = captureEditState();
    setHistory((prev) => {
      const base = prev.stack.slice(0, prev.index + 1);
      const last = base[base.length - 1];
      if (last && deepEqual(last, nextSnapshot)) return prev;

      let merged = [...base, nextSnapshot];
      let nextIndex = merged.length - 1;
      if (merged.length > HISTORY_LIMIT) {
        const overflow = merged.length - HISTORY_LIMIT;
        merged = merged.slice(overflow);
        nextIndex = Math.max(0, nextIndex - overflow);
      }
      return { stack: merged, index: nextIndex };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyCommitTick]);

  useEffect(() => {
    if (!brandMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!brandMenuRef.current) return;
      if (!brandMenuRef.current.contains(event.target as Node)) {
        setBrandMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [brandMenuOpen]);

  useEffect(() => {
    if (!fontMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!fontMenuRef.current) return;
      if (!fontMenuRef.current.contains(event.target as Node)) {
        setFontMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [fontMenuOpen]);

  const handleStudioPreviewClick = () => {
    previewInputRef.current?.click();
  };

  const handlePreviewInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;

    setLocalSlides((prev) => {
      const newSlides = files.map((file, index) => {
        const objectUrl = URL.createObjectURL(file);
        createdObjectUrls.current.push(objectUrl);
        return {
          id: `studio-local-${Date.now()}-${index}`,
          image: objectUrl,
          label: `Slide ${carouselSlides.length + prev.length + index + 1}`,
          status: 'Draft',
        };
      });
      const updated = [...prev, ...newSlides];
      setActiveSlideIndex(carouselSlides.length + updated.length - 1);
      return updated;
    });

    event.target.value = '';
  };

  const handleLibraryImageSelect = (image: LibraryImage) => {
    if (!image?.url) return;
    setLocalSlides((prev) => {
      const nextIndex = carouselSlides.length + prev.length + 1;
      const newSlide: StudioLocalSlide = {
        id: `studio-library-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        image: image.url,
        label: `Slide ${nextIndex}`,
        status: 'Draft',
      };
      const updated = [...prev, newSlide];
      setActiveSlideIndex(carouselSlides.length + updated.length - 1);
      return updated;
    });
  };

  const appendGeneratedSlide = (params: { image: string; status?: StudioLocalSlide['status'] }) => {
    const { image, status = 'AI Enhanced' } = params;
    setLocalSlides((prev) => {
      const nextIndex = carouselSlides.length + prev.length + 1;
      const newSlide: StudioLocalSlide = {
        id: `studio-generated-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        image,
        label: `Slide ${nextIndex}`,
        status,
      };
      const updated = [...prev, newSlide];
      setActiveSlideIndex(carouselSlides.length + updated.length - 1);
      return updated;
    });
  };

  useEffect(() => {
    return () => {
      createdObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      createdOverlayUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    return () => {
      if (bgReplaceRef?.previewUrl && bgReplaceRef.revokeOnCleanup) {
        URL.revokeObjectURL(bgReplaceRef.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCropKey = (slideId: string) => `${slideId}:${selectedAspect}`;

  const getCropPosition = (key: string) => cropPositions[key] ?? { x: 50, y: 50 };
  const getCropZoom = (key: string) => cropZoomLevels[key] ?? 0;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (upscalePollTimeoutRef.current) {
        window.clearTimeout(upscalePollTimeoutRef.current);
      }
      if (historyCommitTimeoutRef.current) {
        window.clearTimeout(historyCommitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!upscaleWorking) {
      setUpscaleElapsedMs(0);
      return;
    }

    const interval = window.setInterval(() => {
      const startedAt = upscaleStartAtRef.current;
      if (!startedAt) return;
      setUpscaleElapsedMs(Date.now() - startedAt);
    }, 500);

    return () => window.clearInterval(interval);
  }, [upscaleWorking]);

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const textFontOptions = useMemo(() => getFontOptions('primary'), []);

  const defaultTextPalette = useMemo(() => ['#FFFFFF', '#000000', '#9E9E9E', '#4A4A4A'], []);

  const getPromptPalette = (colors: string[]) => {
    const merged = [...(colors ?? []), ...defaultTextPalette].filter(Boolean);
    return merged.slice(0, 4);
  };

  const buildStylePrompt = (styleKey: BackgroundStyleKey, colors: string[], extraPrompt: string) => {
    const palette = getPromptPalette(colors);
    const [primary, secondary, accent1, accent2] = palette;
    const stylePrompt = BACKGROUND_STYLE_PROMPTS[styleKey];
    const positive = stylePrompt.positive
      .replace('{{PRIMARY_COLOR}}', primary)
      .replace('{{SECONDARY_COLOR}}', secondary)
      .replace('{{ACCENT_1}}', accent1)
      .replace('{{ACCENT_2}}', accent2);
    const trimmedExtra = extraPrompt.trim();
    let prompt = `${positive}\n\nNegative prompt: ${stylePrompt.negative}`;
    if (trimmedExtra) {
      prompt += `\n\nAdditional instructions: ${trimmedExtra}`;
    }
    return prompt;
  };

  const buildImageStylePrompt = (styleKey: BackgroundStyleKey, colors: string[], extraPrompt: string) => {
    const palette = getPromptPalette(colors);
    const [primary, secondary, accent1, accent2] = palette;
    const stylePrompt = IMAGE_STYLE_PROMPTS[styleKey];
    const trimmedExtra = extraPrompt.trim();
    let prompt = `${stylePrompt.prompt}\nUse this palette: ${primary}, ${secondary}, ${accent1}, ${accent2}.`;
    if (trimmedExtra) {
      prompt += `\n\n${trimmedExtra}`;
    }
    return prompt;
  };

  const resolveBackgroundReplacePrompt = () => {
    if (bgReplaceMode !== 'prompt') return '';
    const manualPrompt = bgReplacePrompt.trim();
    const styleFromBrand = bgReplaceUseBrandProfile ? normalizeStyleKey(activeBrandProfile?.style) : null;
    const styleFromPreset = !bgReplaceUseBrandProfile ? bgReplaceStylePreset : null;
    const styleKey = styleFromBrand ?? styleFromPreset;
    if (styleKey) {
      const palette = bgReplaceUseBrandProfile && activeBrandProfile?.colors?.length
        ? activeBrandProfile.colors
        : defaultTextPalette;
      return buildStylePrompt(styleKey, palette, manualPrompt);
    }
    return manualPrompt;
  };

  const fluxAspectRatioTokens: Record<StudioEditState['selectedAspect'], string> = {
    '1:1': '1:1',
    '4:5': '4:5',
    '9:16': '9:16',
  };

  const getBackgroundGenerateBasePrompt = () => {
    const manualPrompt = bgGeneratePrompt.trim();
    const styleFromBrand = bgGenerateUseBrandProfile ? normalizeStyleKey(activeBrandProfile?.style) : null;
    const styleFromPreset = !bgGenerateUseBrandProfile ? bgGenerateStylePreset : null;
    const styleKey = styleFromBrand ?? styleFromPreset;
    const palette = bgGenerateUseBrandProfile && activeBrandProfile?.colors?.length
      ? activeBrandProfile.colors
      : defaultTextPalette;
    return styleKey ? buildImageStylePrompt(styleKey, palette, manualPrompt) : manualPrompt;
  };

  const resolveBackgroundGeneratePrompt = () => {
    const basePrompt = getBackgroundGenerateBasePrompt().trim();
    const aspectToken = fluxAspectRatioTokens[selectedAspect];
    if (!aspectToken) return basePrompt;
    return basePrompt ? `${basePrompt}\n\nAspect ratio: ${aspectToken}` : `Aspect ratio: ${aspectToken}`;
  };

  const getDisplayedSlideImage = (slide: { id: string; image: string }) => editedSlideImages[slide.id] ?? slide.image;

  const clearSlideDragPreview = () => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove();
      dragPreviewRef.current = null;
    }
  };

  const createSlideDragPreview = (imageUrl: string, index: number) => {
    clearSlideDragPreview();

    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.pointerEvents = 'none';
    ghost.style.top = '-9999px';
    ghost.style.left = '-9999px';
    ghost.style.width = '96px';
    ghost.style.height = '96px';
    ghost.style.borderRadius = '10px';
    ghost.style.overflow = 'hidden';
    ghost.style.border = '2px solid rgba(64,160,178,0.75)';
    ghost.style.boxShadow = '0 10px 28px rgba(0,0,0,0.35)';
    ghost.style.backgroundColor = '#242321';
    ghost.style.backgroundImage = imageUrl ? `url(${imageUrl})` : '';
    ghost.style.backgroundSize = 'cover';
    ghost.style.backgroundPosition = 'center';

    const badge = document.createElement('div');
    badge.textContent = String(index + 1);
    badge.style.position = 'absolute';
    badge.style.top = '6px';
    badge.style.left = '6px';
    badge.style.width = '26px';
    badge.style.height = '26px';
    badge.style.borderRadius = '9999px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.background = 'rgba(12,18,19,0.9)';
    badge.style.color = '#f5f0e8';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '800';
    badge.style.border = '1px solid rgba(57,74,77,0.8)';

    ghost.appendChild(badge);
    document.body.appendChild(ghost);
    dragPreviewRef.current = ghost;
    return ghost;
  };

  const handleSlideThumbnailDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    slide: { id: string; label: string },
    index: number,
    src: string
  ) => {
    if (!src) return;

    setDraggingSlideId(slide.id);

    const payload = JSON.stringify({ id: slide.id, src, label: slide.label });
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-slideflow-slide', payload);
    event.dataTransfer.setData('text/plain', payload);

    try {
      const preview = createSlideDragPreview(src, index);
      const rect = preview.getBoundingClientRect();
      event.dataTransfer.setDragImage(preview, rect.width / 2, rect.height / 2);
    } catch {
      // ignore drag preview failures
    }
  };

  const handleSlideThumbnailDragEnd = () => {
    clearSlideDragPreview();
    setDraggingSlideId(null);
  };

  useEffect(() => {
    return () => {
      clearSlideDragPreview();
    };
  }, []);

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(blob);
    });

  const handleBgReplacePick = () => {
    bgReplaceInputRef.current?.click();
  };

  const handleBgReplaceInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBgReplaceRef((prev) => {
      if (prev?.previewUrl && prev.revokeOnCleanup) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file), revokeOnCleanup: true, label: file.name };
    });
    setBgReplaceMode('image');
    event.target.value = '';
  };

  const revokeIfObjectUrl = (src: string) => {
    if (!src.startsWith('blob:')) return;
    try {
      URL.revokeObjectURL(src);
    } catch {
      // ignore
    }
  };

  const handleImageOverlayPick = () => {
    imageOverlayInputRef.current?.click();
  };

  const handleBgReplaceDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setBgReplaceDragActive(false);

    const payload = event.dataTransfer.getData('application/x-slideflow-slide');
    if (!payload) return;

    try {
      const parsed = JSON.parse(payload) as { src?: string; label?: string };
      if (!parsed.src) return;
      setBgReplaceRef((prev) => {
        if (prev?.previewUrl && prev.revokeOnCleanup) URL.revokeObjectURL(prev.previewUrl);
        return {
          previewUrl: parsed.src,
          sourceUrl: parsed.src,
          label: parsed.label ?? 'Slide background',
          revokeOnCleanup: false,
        };
      });
      setBgReplaceMode('image');
      setBgReplaceUseBrandProfile(false);
      setBgReplaceStylePreset(null);
    } catch {
      // ignore invalid payloads
    }
  };

  const handleImageOverlayInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!activeSlide) {
      setToast('Select a slide first.');
      event.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    createdOverlayUrls.current.push(objectUrl);
    setImageOverlaysBySlide((prev) => {
      const existing = prev[activeSlide.id];
      if (existing?.src) revokeIfObjectUrl(existing.src);
      return {
        ...prev,
        [activeSlide.id]: {
          src: objectUrl,
          sizePercent: existing?.sizePercent ?? 22,
          placement: existing?.placement ?? 'bottom-right',
        },
      };
    });
    requestHistoryCommit();
    event.target.value = '';
  };

  const handleImageOverlayDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setImageOverlayDragActive(false);

    if (!activeSlide) {
      setToast('Select a slide first.');
      return;
    }

    const payload = event.dataTransfer.getData('application/x-slideflow-slide');
    if (!payload) return;

    try {
      const parsed = JSON.parse(payload) as { src?: string; label?: string };
      if (!parsed.src) return;
      setImageOverlaysBySlide((prev) => {
        const existing = prev[activeSlide.id];
        if (existing?.src) revokeIfObjectUrl(existing.src);
        return {
          ...prev,
          [activeSlide.id]: {
            src: parsed.src,
            sizePercent: existing?.sizePercent ?? 22,
            placement: existing?.placement ?? 'bottom-right',
          },
        };
      });
      requestHistoryCommit();
    } catch {
      // ignore invalid payloads
    }
  };

  const getOverlayCssPlacement = (placement: ImageOverlayPlacement): React.CSSProperties => {
    if (placement === 'top-left') return { left: 14, top: 14 };
    if (placement === 'top-center') return { left: '50%', top: 14, transform: 'translateX(-50%)' };
    if (placement === 'top-right') return { right: 14, top: 14 };
    if (placement === 'middle-left') return { left: 14, top: '50%', transform: 'translateY(-50%)' };
    if (placement === 'center') return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    if (placement === 'middle-right') return { right: 14, top: '50%', transform: 'translateY(-50%)' };
    if (placement === 'bottom-left') return { left: 14, bottom: 14 };
    if (placement === 'bottom-center') return { left: '50%', bottom: 14, transform: 'translateX(-50%)' };
    return { right: 14, bottom: 14 };
  };

  const updateImageOverlay = (slideId: string, patch: Partial<ImageOverlayConfig>, commit: 'none' | 'debounced' | 'immediate' = 'debounced') => {
    setImageOverlaysBySlide((prev) => {
      const existing = prev[slideId];
      if (!existing) return prev;
      return { ...prev, [slideId]: { ...existing, ...patch } };
    });
    if (commit === 'immediate') requestHistoryCommit();
    if (commit === 'debounced') requestHistoryCommitDebounced(300);
  };

  const removeImageOverlay = (slideId: string) => {
    setImageOverlaysBySlide((prev) => {
      const existing = prev[slideId];
      if (existing?.src) revokeIfObjectUrl(existing.src);
      const next = { ...prev };
      delete next[slideId];
      return next;
    });
    requestHistoryCommit();
  };

  const handleUseBrandProfile = () => {
    if (!activeBrandProfile) {
      setToast('Select a brand profile to use its colors and style.');
      return;
    }

    setBgReplaceMode('prompt');
    setBgReplaceUseBrandProfile(true);
    setBgReplaceStylePreset(null);
  };

  const handleUseBrandProfileForGenerate = () => {
    if (!activeBrandProfile) {
      setToast('Select a brand profile to use its colors and style.');
      return;
    }

    setBgGenerateUseBrandProfile(true);
    setBgGenerateStylePreset(null);
  };

  const handleBackgroundReplacePreview = async () => {
    if (!activeSlideImageSrc) {
      setToast('Add or select an image first.');
      return;
    }
    if (bgReplaceWorking) return;

    const resolvedPrompt = resolveBackgroundReplacePrompt();
    const hasPrompt = bgReplaceMode === 'prompt' && resolvedPrompt.trim().length > 0;
    const hasRef = bgReplaceMode === 'image' && Boolean(bgReplaceRef?.file || bgReplaceRef?.sourceUrl);
    if (!hasPrompt && !hasRef) {
      setToast(bgReplaceMode === 'prompt' ? 'Add a background prompt or pick a style first.' : 'Choose a background image first.');
      return;
    }

    setBgReplaceWorking(true);
    try {
      const parseFunctionError = async (err: unknown) => {
        const errorContext = err as { context?: { body?: unknown }; message?: string };
        const contextBody = errorContext?.context?.body;
        let rawBody = '';

        if (typeof contextBody === 'string') {
          rawBody = contextBody;
        } else if (contextBody && typeof (contextBody as ReadableStream).getReader === 'function') {
          rawBody = await new Response(contextBody as ReadableStream).text();
        } else if (contextBody) {
          rawBody = String(contextBody);
        }

        if (!rawBody) return errorContext?.message || 'Background replace failed.';

        try {
          const parsed = JSON.parse(rawBody) as { error?: string; details?: string };
          if (parsed.error) {
            return parsed.details ? `${parsed.error} (${parsed.details})` : parsed.error;
          }
          return rawBody;
        } catch {
          return rawBody;
        }
      };

      const isLocalSrc = activeSlideImageSrc.startsWith('blob:') || activeSlideImageSrc.startsWith('data:');
      const imageBody = isLocalSrc
        ? { imageBase64: activeSlideImageSrc.startsWith('data:') ? activeSlideImageSrc : await blobToDataUrl(await (await fetch(activeSlideImageSrc)).blob()) }
        : { imageUrl: activeSlideImageSrc };

      const body: Record<string, unknown> = { ...imageBody };
      if (hasPrompt) {
        body.prompt = resolvedPrompt.trim();
      } else if (bgReplaceRef?.file) {
        body.refImageBase64 = await blobToDataUrl(bgReplaceRef.file);
      } else if (bgReplaceRef?.sourceUrl) {
        const refSource = bgReplaceRef.sourceUrl;
        if (refSource.startsWith('blob:') || refSource.startsWith('data:')) {
          body.refImageBase64 = refSource.startsWith('data:')
            ? refSource
            : await blobToDataUrl(await (await fetch(refSource)).blob());
        } else {
          body.refImageUrl = refSource;
        }
      }

      const { data, error } = await supabase.functions.invoke('replace-background', { body });
      if (error) {
        throw new Error(await parseFunctionError(error));
      }

      const response = data as
        | {
            dataUrl?: string | null;
            url?: string | null;
            images?: Array<{ url?: string; file_data?: string }> | null;
            image?: { url?: string; file_data?: string } | null;
            error?: string;
          }
        | null;
      const fnError = response?.error;
      if (fnError) {
        throw new Error(fnError);
      }

      const returnedSrc =
        response?.dataUrl ||
        response?.image?.file_data ||
        response?.url ||
        response?.image?.url ||
        response?.images?.[0]?.file_data ||
        response?.images?.[0]?.url ||
        '';
      if (!returnedSrc) {
        throw new Error('No image returned from background replace.');
      }

      if (activeSlide) {
        setEditedSlideImages((prev) => ({ ...prev, [activeSlide.id]: returnedSrc }));
      }
      requestHistoryCommit();
      setToast('Background replaced (preview).');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Background replace failed.';
      setToast(message);
    } finally {
      setBgReplaceWorking(false);
    }
  };

  const handleGenerateBackground = async () => {
    if (bgGenerateWorking) return;

    const basePrompt = getBackgroundGenerateBasePrompt();
    if (!basePrompt.trim()) {
      setToast('Add a prompt or pick a style first.');
      return;
    }
    const prompt = resolveBackgroundGeneratePrompt();

    setBgGenerateWorking(true);
    try {
      const parseFunctionError = async (err: unknown) => {
        const errorContext = err as { context?: { body?: unknown }; message?: string };
        const contextBody = errorContext?.context?.body;
        let rawBody = '';

        if (typeof contextBody === 'string') {
          rawBody = contextBody;
        } else if (contextBody && typeof (contextBody as ReadableStream).getReader === 'function') {
          rawBody = await new Response(contextBody as ReadableStream).text();
        } else if (contextBody) {
          rawBody = String(contextBody);
        }

        if (!rawBody) return errorContext?.message || 'Image generation failed.';

        try {
          const parsed = JSON.parse(rawBody) as { error?: string; details?: string };
          if (parsed.error) {
            return parsed.details ? `${parsed.error} (${parsed.details})` : parsed.error;
          }
          return rawBody;
        } catch {
          return rawBody;
        }
      };

      const size = EXPORT_SIZES[selectedAspect];
      const body = {
        prompt,
        imageSize: { width: size.width, height: size.height },
        guidanceScale: 10,
        numImages: 1,
        outputFormat: 'jpeg',
        enableSafetyChecker: true,
      };

      const { data, error } = await supabase.functions.invoke('generate-background', { body });
      if (error) {
        throw new Error(await parseFunctionError(error));
      }

      const response = data as
        | {
            dataUrl?: string | null;
            url?: string | null;
            images?: Array<{ url?: string; file_data?: string }> | null;
            image?: { url?: string; file_data?: string } | null;
            error?: string;
          }
        | null;
      const fnError = response?.error;
      if (fnError) {
        throw new Error(fnError);
      }

      const returnedSrc =
        response?.dataUrl ||
        response?.image?.file_data ||
        response?.url ||
        response?.image?.url ||
        response?.images?.[0]?.file_data ||
        response?.images?.[0]?.url ||
        '';
      if (!returnedSrc) {
        throw new Error('No image returned from image generation.');
      }

      appendGeneratedSlide({ image: returnedSrc, status: 'AI Enhanced' });
      setToast('Image generated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image generation failed.';
      setToast(message);
    } finally {
      setBgGenerateWorking(false);
    }
  };

  const handleVectorizeImage = async () => {
    if (!activeSlideImageSrc) {
      setToast('Add or select an image first.');
      return;
    }
    if (vectorizeWorking) return;

    setVectorizeWorking(true);
    setVectorizeResultUrl(null);
    try {
      const parseFunctionError = async (err: unknown) => {
        const errorContext = err as { context?: { body?: unknown }; message?: string };
        const contextBody = errorContext?.context?.body;
        let rawBody = '';

        if (typeof contextBody === 'string') {
          rawBody = contextBody;
        } else if (contextBody && typeof (contextBody as ReadableStream).getReader === 'function') {
          rawBody = await new Response(contextBody as ReadableStream).text();
        } else if (contextBody) {
          rawBody = String(contextBody);
        }

        if (!rawBody) return errorContext?.message || 'Vectorize failed.';

        try {
          const parsed = JSON.parse(rawBody) as { error?: string; details?: string };
          if (parsed.error) {
            return parsed.details ? `${parsed.error} (${parsed.details})` : parsed.error;
          }
          return rawBody;
        } catch {
          return rawBody;
        }
      };

      const isLocalSrc = activeSlideImageSrc.startsWith('blob:') || activeSlideImageSrc.startsWith('data:');
      const body = isLocalSrc
        ? {
            imageBase64: activeSlideImageSrc.startsWith('data:')
              ? activeSlideImageSrc
              : await blobToDataUrl(await (await fetch(activeSlideImageSrc)).blob()),
          }
        : { imageUrl: activeSlideImageSrc };

      const { data, error } = await supabase.functions.invoke('vectorize-image', { body });
      if (error) {
        throw new Error(await parseFunctionError(error));
      }

      const response = data as
        | {
            url?: string | null;
            image?: { url?: string | null };
            error?: string;
          }
        | null;
      const fnError = response?.error;
      if (fnError) {
        throw new Error(fnError);
      }

      const svgUrl = response?.url || response?.image?.url || '';
      if (!svgUrl) {
        throw new Error('No SVG returned from vectorize.');
      }

      setVectorizeResultUrl(svgUrl);
      appendGeneratedSlide({ image: svgUrl, status: 'AI Enhanced' });
      setToast('Vectorized to SVG.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vectorize failed.';
      setToast(message);
    } finally {
      setVectorizeWorking(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!activeSlide?.image) {
      setToast('Add or select an image first.');
      return;
    }
    if (bgRemoveWorking) return;

    setBgRemoveWorking(true);
    try {
      const parseFunctionError = async (err: unknown) => {
        const errorContext = err as { context?: { body?: unknown }; message?: string };
        const contextBody = errorContext?.context?.body;
        let rawBody = '';

        if (typeof contextBody === 'string') {
          rawBody = contextBody;
        } else if (contextBody && typeof (contextBody as ReadableStream).getReader === 'function') {
          rawBody = await new Response(contextBody as ReadableStream).text();
        } else if (contextBody) {
          rawBody = String(contextBody);
        }

        if (!rawBody) return errorContext?.message || 'Background removal failed.';

        try {
          const parsed = JSON.parse(rawBody) as { error?: string; details?: string };
          if (parsed.error) {
            return parsed.details ? `${parsed.error} (${parsed.details})` : parsed.error;
          }
          return rawBody;
        } catch {
          return rawBody;
        }
      };

      const src = getDisplayedSlideImage(activeSlide);
      const isLocal = src.startsWith('blob:') || src.startsWith('data:');
      const body = isLocal
        ? { imageBase64: await blobToDataUrl(await (await fetch(src)).blob()) }
        : { imageUrl: src };

      const { data, error } = await supabase.functions.invoke('remove-background', { body });
      if (error) {
        throw new Error(await parseFunctionError(error));
      }

      const response = data as
        | { dataUrl?: string | null; url?: string | null; image?: { url?: string; file_data?: string } | null; error?: string }
        | null;
      const fnError = response?.error;
      if (fnError) {
        throw new Error(fnError);
      }
      const returnedSrc =
        response?.dataUrl ||
        response?.image?.file_data ||
        response?.url ||
        response?.image?.url ||
        '';
      if (!returnedSrc) {
        throw new Error('No image returned from background removal.');
      }

      setEditedSlideImages((prev) => ({ ...prev, [activeSlide.id]: returnedSrc }));
      requestHistoryCommit();
      setToast('Background removed (preview).');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Background removal failed.';
      setToast(message);
    } finally {
      setBgRemoveWorking(false);
    }
  };

  const handleUpscalePreview = async () => {
    if (!activeSlideImageSrc || !activeSlide) {
      setToast('Add or select an image first.');
      return;
    }
    if (upscaleWorking) return;

    setUpscaleWorking(true);
    setUpscaleStatus('Starting…');
    setUpscaleTargetSlideId(activeSlide.id);
    setUpscaleTargetSlideLabel(activeSlide.label);
    setUpscaleLastOutputUrl(null);
    upscaleStartAtRef.current = Date.now();
    upscalePollTokenRef.current += 1;
    const token = upscalePollTokenRef.current;
    const chosenModel = upscaleModel;
    if (upscalePollTimeoutRef.current) {
      window.clearTimeout(upscalePollTimeoutRef.current);
      upscalePollTimeoutRef.current = null;
    }
    try {
      const parseFunctionError = async (err: unknown) => {
        const errorContext = err as { context?: { body?: unknown }; message?: string };
        const contextBody = errorContext?.context?.body;
        let rawBody = '';

        if (typeof contextBody === 'string') {
          rawBody = contextBody;
        } else if (contextBody && typeof (contextBody as ReadableStream).getReader === 'function') {
          rawBody = await new Response(contextBody as ReadableStream).text();
        } else if (contextBody) {
          rawBody = String(contextBody);
        }

        if (!rawBody) return errorContext?.message || 'Upscale failed.';

        try {
          const parsed = JSON.parse(rawBody) as { error?: string; details?: string };
          if (parsed.error) {
            return parsed.details ? `${parsed.error} (${parsed.details})` : parsed.error;
          }
          return rawBody;
        } catch {
          return rawBody;
        }
      };

      const isLocalSrc = activeSlideImageSrc.startsWith('blob:') || activeSlideImageSrc.startsWith('data:');
      const imageBody = isLocalSrc
        ? { imageBase64: activeSlideImageSrc.startsWith('data:') ? activeSlideImageSrc : await blobToDataUrl(await (await fetch(activeSlideImageSrc)).blob()) }
        : { imageUrl: activeSlideImageSrc };

      const invokeAndMaybePoll = async (body: Record<string, unknown>) => {
        const startedAt = upscaleStartAtRef.current ?? Date.now();
        const elapsedMs = Date.now() - startedAt;
        if (elapsedMs > 2 * 60 * 1000) {
          throw new Error('Upscale is taking longer than expected. Please try again.');
        }

        setUpscaleStatus(`Working… (${formatElapsed(elapsedMs)})`);
        const { data, error } = await supabase.functions.invoke('upscale-image', { body });
        if (error) {
          throw new Error(await parseFunctionError(error));
        }

        const response = data as
          | {
              status?: string;
              model?: string;
              requestId?: string;
              statusUrl?: string | null;
              responseUrl?: string | null;
              retry_after_seconds?: number;
              dataUrl?: string | null;
              url?: string | null;
              image?: { url?: string; file_data?: string } | null;
              error?: string;
            }
          | null;

        const fnError = response?.error;
        if (fnError) throw new Error(fnError);

        if (!response) throw new Error('No response from upscale.');

        if (response.status === 'processing') {
          const retryAfter = typeof response.retry_after_seconds === 'number' ? response.retry_after_seconds : 3;
          if (!response.requestId) throw new Error('Upscale is processing but requestId is missing.');
          if (token !== upscalePollTokenRef.current) return;

          const elapsedLabel = formatElapsed(Date.now() - startedAt);
          setUpscaleStatus(`Still processing… checking again in ${retryAfter}s (${elapsedLabel})`);
          upscalePollTimeoutRef.current = window.setTimeout(() => {
            if (token !== upscalePollTokenRef.current) return;
            invokeAndMaybePoll({
              requestId: response.requestId,
              statusUrl: response.statusUrl,
              responseUrl: response.responseUrl,
              model: chosenModel,
            }).catch((err) => {
              if (token !== upscalePollTokenRef.current) return;
              const message = err instanceof Error ? err.message : 'Upscale failed.';
              setToast(message);
              setUpscaleStatus(null);
              if (upscalePollTimeoutRef.current) {
                window.clearTimeout(upscalePollTimeoutRef.current);
                upscalePollTimeoutRef.current = null;
              }
              setUpscaleWorking(false);
            });
          }, retryAfter * 1000);
          return;
        }

        const returnedSrc =
          response.dataUrl || response.image?.file_data || response.url || response.image?.url || '';
        if (!returnedSrc) {
          throw new Error('No image returned from upscale.');
        }

        if (token !== upscalePollTokenRef.current) return;
        setEditedSlideImages((prev) => ({ ...prev, [activeSlide.id]: returnedSrc }));
        requestHistoryCommit();
        setUpscaleLastOutputUrl(returnedSrc);
        const modelLabel =
          response.model === 'seedvr2'
            ? 'SeedVR2 Upscale'
            : 'AI Upscale';
        setToast(`Upscale complete (${modelLabel}).`);
        setUpscaleStatus(null);
        setUpscaleTargetSlideId(null);
        setUpscaleTargetSlideLabel(null);
        if (upscalePollTimeoutRef.current) {
          window.clearTimeout(upscalePollTimeoutRef.current);
          upscalePollTimeoutRef.current = null;
        }
        setUpscaleWorking(false);
      };

      await invokeAndMaybePoll({ ...(imageBody as Record<string, unknown>), model: chosenModel });
    } catch (err) {
      if (token !== upscalePollTokenRef.current) return;
      const message = err instanceof Error ? err.message : 'Upscale failed.';
      setToast(message);
      setUpscaleStatus(null);
      setUpscaleTargetSlideId(null);
      setUpscaleTargetSlideLabel(null);
      if (upscalePollTimeoutRef.current) {
        window.clearTimeout(upscalePollTimeoutRef.current);
        upscalePollTimeoutRef.current = null;
      }
      setUpscaleWorking(false);
    }
  };

  const handleUpscaleCancel = () => {
    upscalePollTokenRef.current += 1;
    if (upscalePollTimeoutRef.current) {
      window.clearTimeout(upscalePollTimeoutRef.current);
      upscalePollTimeoutRef.current = null;
    }
    upscaleStartAtRef.current = null;
    setUpscaleWorking(false);
    setUpscaleStatus(null);
    setUpscaleTargetSlideId(null);
    setUpscaleTargetSlideLabel(null);
    setUpscaleLastOutputUrl(null);
    setToast('Upscale canceled.');
  };

  useEffect(() => {
    if (!user) {
      setBrandProfiles([]);
      setBrandProfilesLoading(false);
      setBrandProfilesError(null);
      setSelectedBrandProfile('');
      return;
    }
    let cancelled = false;
    const loadBrandProfiles = async () => {
      setBrandProfilesLoading(true);
      setBrandProfilesError(null);
      const { data, error } = await supabase
        .from('brand_profile')
        .select('id, name, palette, fonts, defaults, is_default, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        setBrandProfilesError(error.message);
        setBrandProfiles([]);
        setBrandProfilesLoading(false);
        return;
      }
      const rows = (data ?? []) as DbBrandProfileRow[];
      const mapped = rows.map((row) => {
        const palette = row.palette ?? {};
        const fonts = row.fonts ?? {};
        const defaults = row.defaults ?? {};
        const colors = [palette.primary, palette.secondary, palette.accent1, palette.accent2].filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        );
        return {
          id: row.id,
          label: row.name || 'Brand preset',
          colors,
          primaryFontId: fonts.primary,
          bodyFontId: fonts.body ?? fonts.secondary,
          style: defaults.style ?? null,
          isDefault: Boolean(row.is_default),
        };
      });
      setBrandProfiles(mapped);
      setBrandProfilesLoading(false);
    };
    void loadBrandProfiles();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (selectedBrandProfile) return;
    const defaultProfile = brandProfiles.find((profile) => profile.isDefault);
    if (defaultProfile) {
      setSelectedBrandProfile(defaultProfile.id);
      return;
    }
    const key = `${DEFAULT_STORAGE_KEY_PREFIX}${user.id}`;
    const stored = safeGetStorage(key);
    if (!stored) return;
    if (brandProfiles.some((profile) => profile.id === stored)) {
      setSelectedBrandProfile(stored);
    }
  }, [brandProfiles, selectedBrandProfile, user]);

  const creatorToolIds = ['bg-remove', 'bg-replace', 'smart-enhance'];
  const studioToolIds = ['bg-generate', 'vectorize', 'ai-edit'];

  const tools = useMemo(
    () => [
      { id: 'crop', label: 'Crop & Resize', description: 'Adjust framing and aspect ratio presets.', icon: Crop },
      { id: 'bg-remove', label: 'Background Remove', description: 'Cleanly isolate your subject from the background.', icon: Eraser },
      { id: 'bg-replace', label: 'Background Replace', description: 'Swap in a clean backdrop.', icon: ImageMinus },
      { id: 'bg-generate', label: 'Generate Image', description: 'Generate a fresh, on-brand image.', icon: Sparkles, ai: true },
      { id: 'ai-edit', label: 'AI Image Edit', description: 'Describe the change in plain language.', icon: Sparkles, ai: true },
      { id: 'vectorize', label: 'Vectorize', description: 'Convert a raster image into SVG.', icon: Sparkles, ai: true },
      { id: 'smart-enhance', label: 'AI Upscale', description: 'Upscale your image for clarity.', icon: Wand2 },
      { id: 'text', label: 'Add Text', description: 'Overlay text onto your image.', icon: Type },
      { id: 'brand', label: 'Brand Profile', description: 'Set palette defaults for this Studio session.', icon: Palette },
      { id: 'image-overlay', label: 'Image Overlay', description: 'Overlay a logo or image on top.', icon: ImagePlus },
    ],
    []
  );

  const activeBrandProfile = useMemo(
    () => brandProfiles.find((profile) => profile.id === selectedBrandProfile) ?? null,
    [brandProfiles, selectedBrandProfile]
  );
  const brandColors = activeBrandProfile?.colors ?? [];
  const defaultTextColor = brandColors[0] ?? defaultTextPalette[0] ?? '#E9E3CD';
  const defaultTextFontId = activeBrandProfile?.primaryFontId ?? DEFAULT_PRIMARY_FONT_ID;
  const activeBrandFontLabel = useMemo(() => {
    if (!activeBrandProfile) return '—';
    const primary = activeBrandProfile.primaryFontId ? getFont(activeBrandProfile.primaryFontId).name : '—';
    const body = activeBrandProfile.bodyFontId
      ? getFont(activeBrandProfile.bodyFontId).name
      : primary;
    return body && body !== primary ? `${primary} / ${body}` : primary;
  }, [activeBrandProfile]);
  const activeBrandStyleLabel = useMemo(() => {
    const key = normalizeStyleKey(activeBrandProfile?.style);
    return key ? IMAGE_STYLE_PROMPTS[key].label : activeBrandProfile?.style ?? '—';
  }, [activeBrandProfile?.style]);

  const carouselSlides = useMemo(() => {
    if (!navCarousel?.slides?.length) return [];
    return navCarousel.slides.map((slide, index) => ({
      id: slide.id,
      image: slide.image,
      label: `Slide ${index + 1}`,
      status: index === 0 ? 'Original' : index === 1 ? 'Edited' : index === 2 ? 'AI Enhanced' : 'Draft',
    }));
  }, [navCarousel]);

  const slides = useMemo(() => [...carouselSlides, ...localSlides], [carouselSlides, localSlides]);

  const selectedTool = useMemo(() => tools.find((tool) => tool.id === activeTool) ?? null, [activeTool, tools]);

  const activeSlide = slides[activeSlideIndex];
  const activeSlideImageSrc = activeSlide?.image ? getDisplayedSlideImage(activeSlide) : '';
  const activeTextLayers = activeSlide?.id ? textLayersBySlide[activeSlide.id] ?? [] : [];
  const activeSelectedTextLayerId = activeSlide?.id ? selectedTextLayerBySlide[activeSlide.id] ?? '' : '';
  const activeImageOverlay = activeSlide?.id ? imageOverlaysBySlide[activeSlide.id] ?? null : null;
  const activeSelectedTextLayer =
    activeSlide?.id && activeTextLayers.length
      ? activeTextLayers.find((layer) => layer.id === activeSelectedTextLayerId) ?? activeTextLayers[0] ?? null
      : null;
  const activeTextColor = activeSelectedTextLayer?.color ?? '#E9E3CD';
  const activeTextFontId = activeSelectedTextLayer?.fontId ?? DEFAULT_PRIMARY_FONT_ID;
  const activeTextFont = getFont(activeTextFontId);
  const activeCropKey = activeSlide ? getCropKey(activeSlide.id) : null;
  const activeCropPosition = activeCropKey ? getCropPosition(activeCropKey) : { x: 50, y: 50 };
  const activeCropZoomLevel = activeCropKey ? getCropZoom(activeCropKey) : 0;
  const activeCropZoomScale = 1 + (activeCropZoomLevel / 100) * 2;
  const canvasAspectClass =
    selectedAspect === '1:1' ? 'aspect-square' : selectedAspect === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/5]';


  const backLink = navCarousel?.id
    ? navState?.from === 'generate'
      ? { to: `/generate-caption/${navCarousel.id}`, label: 'Back to Generate' }
      : navState?.from === 'publish'
        ? { to: `/publish/${navCarousel.id}`, label: 'Back to Publish' }
        : { to: '/dashboard', label: 'Back to Dashboard' }
    : { to: '/dashboard', label: 'Back to Dashboard' };
  const backState = navCarousel ? { carousel: navCarousel, caption: navCaption } : undefined;

  const showPageDots = false;

  useEffect(() => {
    if (!slides.length) {
      setActiveSlideIndex(0);
      return;
    }
    setActiveSlideIndex((prev) => (prev >= slides.length ? slides.length - 1 : prev));
  }, [slides.length]);

  useEffect(() => {
    if (activeTool !== 'text') return;
    if (!activeSlide) return;
    const layers = textLayersBySlide[activeSlide.id] ?? [];
    if (!layers.length) return;
    const selected = selectedTextLayerBySlide[activeSlide.id] ?? '';
    if (selected) return;
    setSelectedTextLayerBySlide((prev) => ({ ...prev, [activeSlide.id]: layers[0]!.id }));
  }, [activeTool, activeSlide?.id, activeTextLayers.length, activeSelectedTextLayerId]);

  useEffect(() => {
    const rgb = hexToRgb(activeTextColor);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setTextPickerHue(hsv.h);
    setTextPickerSat(hsv.s);
    setTextPickerVal(hsv.v);
    setTextHexInput(activeTextColor.replace('#', ''));
  }, [activeTextColor, activeSelectedTextLayer?.id]);


  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'crop') return;
    if (!activeCropKey) return;
    if (!cropFrameRef.current) return;

    const frameRect = cropFrameRef.current.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const currentPosition = getCropPosition(activeCropKey);
    cropDragRef.current = {
      key: activeCropKey,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: currentPosition.x,
      startY: currentPosition.y,
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
    };
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = cropDragRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;

    const nextX = Math.min(100, Math.max(0, dragState.startX - (deltaX / dragState.frameWidth) * 100));
    const nextY = Math.min(100, Math.max(0, dragState.startY - (deltaY / dragState.frameHeight) * 100));

    setCropPositions((prev) => ({
      ...prev,
      [dragState.key]: { x: nextX, y: nextY },
    }));
  };

  const handleCropPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = cropDragRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== event.pointerId) return;
    cropDragRef.current = null;
    requestHistoryCommit();
  };

  const createTextLayer = (patch?: Partial<TextOverlay>): TextLayer => ({
    id: `text-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: 'Your headline',
    x: 50,
    y: 18,
    fontSize: 54,
    fontId: defaultTextFontId,
    color: defaultTextColor,
    align: 'center',
    ...(patch ?? {}),
  });

  const selectTextLayer = (slideId: string, layerId: string) => {
    setSelectedTextLayerBySlide((prev) => ({ ...prev, [slideId]: layerId }));
  };

  const addTextLayer = (slideId: string) => {
    const layer = createTextLayer({ y: 22 });
    setTextLayersBySlide((prev) => {
      const existing = prev[slideId] ?? [];
      return { ...prev, [slideId]: [...existing, layer] };
    });
    setSelectedTextLayerBySlide((prev) => ({ ...prev, [slideId]: layer.id }));
    requestHistoryCommit();
  };

  const updateTextLayer = (
    slideId: string,
    layerId: string,
    patch: Partial<TextOverlay>,
    commit: 'none' | 'debounced' | 'immediate' = 'debounced'
  ) => {
    setTextLayersBySlide((prev) => {
      const layers = prev[slideId] ?? [];
      const nextLayers = layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer));
      return { ...prev, [slideId]: nextLayers };
    });
    if (commit === 'immediate') requestHistoryCommit();
    if (commit === 'debounced') requestHistoryCommitDebounced();
  };

  const removeTextLayer = (slideId: string, layerId: string) => {
    setTextLayersBySlide((prev) => {
      const layers = prev[slideId] ?? [];
      const nextLayers = layers.filter((layer) => layer.id !== layerId);
      setSelectedTextLayerBySlide((selectedPrev) => {
        if (selectedPrev[slideId] !== layerId) return selectedPrev;
        const nextSelected = nextLayers[nextLayers.length - 1]?.id ?? '';
        return { ...selectedPrev, [slideId]: nextSelected };
      });
      return { ...prev, [slideId]: nextLayers };
    });
    requestHistoryCommit();
  };

  const getTextAnchorTransform = (align: TextOverlay['align']) => {
    if (align === 'left') return 'translate(0%, -50%)';
    if (align === 'right') return 'translate(-100%, -50%)';
    return 'translate(-50%, -50%)';
  };

  const handleTextPointerDown = (event: React.PointerEvent<HTMLDivElement>, layerId: string) => {
    if (activeTool !== 'text') return;
    if (!activeSlide) return;
    if (!cropFrameRef.current) return;

    const frameRect = cropFrameRef.current.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height) return;

    const layers = textLayersBySlide[activeSlide.id] ?? [];
    const layer = layers.find((candidate) => candidate.id === layerId);
    if (!layer) return;

    selectTextLayer(activeSlide.id, layerId);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    textDragRef.current = {
      slideId: activeSlide.id,
      layerId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
    };
  };

  const handleTextPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = textDragRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    const nextX = Math.min(98, Math.max(2, dragState.startX + (deltaX / dragState.frameWidth) * 100));
    const nextY = Math.min(98, Math.max(2, dragState.startY + (deltaY / dragState.frameHeight) * 100));
    updateTextLayer(dragState.slideId, dragState.layerId, { x: nextX, y: nextY }, 'none');
  };

  const handleTextPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = textDragRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== event.pointerId) return;
    textDragRef.current = null;
    requestHistoryCommit();
  };

  const handleCropZoomChange = (nextValue: number) => {
    if (!activeCropKey) return;
    setCropZoomLevels((prev) => ({ ...prev, [activeCropKey]: nextValue }));
    requestHistoryCommitDebounced(300);
  };

  const currentEditState = getCurrentEditState();
  const historySnapshot = history.stack[history.index];
  const historyDirty = historySnapshot ? !deepEqual(historySnapshot, currentEditState) : false;
  const canUndo = historyDirty || history.index > 0;
  const canRedo = !historyDirty && history.index < history.stack.length - 1;

  const handleUndo = () => {
    if (historyCommitTimeoutRef.current) {
      window.clearTimeout(historyCommitTimeoutRef.current);
      historyCommitTimeoutRef.current = null;
    }
    setHistory((prev) => {
      let stack = prev.stack;
      let index = prev.index;

      const currentAtIndex = stack[index];
      if (currentAtIndex && !deepEqual(currentAtIndex, currentEditState)) {
        const base = stack.slice(0, index + 1);
        const nextSnapshot = captureEditState();
        base.push(nextSnapshot);
        stack = base;
        index = base.length - 1;
        if (stack.length > HISTORY_LIMIT) {
          const overflow = stack.length - HISTORY_LIMIT;
          stack = stack.slice(overflow);
          index = Math.max(0, index - overflow);
        }
      }

      if (index <= 0) return { stack, index };
      const nextIndex = index - 1;
      const snapshot = stack[nextIndex];
      if (!snapshot) return { stack, index };
      isRestoringHistoryRef.current = true;
      restoreEditState(snapshot);
      window.requestAnimationFrame(() => {
        isRestoringHistoryRef.current = false;
      });
      return { stack, index: nextIndex };
    });
  };

  const handleRedo = () => {
    if (historyCommitTimeoutRef.current) {
      window.clearTimeout(historyCommitTimeoutRef.current);
      historyCommitTimeoutRef.current = null;
    }
    setHistory((prev) => {
      const stack = prev.stack;
      const index = prev.index;
      const currentAtIndex = stack[index];
      if (currentAtIndex && !deepEqual(currentAtIndex, currentEditState)) {
        return prev;
      }
      if (index >= stack.length - 1) return prev;
      const nextIndex = index + 1;
      const snapshot = stack[nextIndex];
      if (!snapshot) return prev;
      isRestoringHistoryRef.current = true;
      restoreEditState(snapshot);
      window.requestAnimationFrame(() => {
        isRestoringHistoryRef.current = false;
      });
      return { stack, index: nextIndex };
    });
  };

  const getSlideHasEdits = (slideId: string) => {
    if (editedSlideImages[slideId]) return true;
    if (textLayersBySlide[slideId]?.length) return true;
    if (imageOverlaysBySlide[slideId]) return true;
    if (Object.keys(cropPositions).some((key) => key.startsWith(`${slideId}:`))) return true;
    if (Object.keys(cropZoomLevels).some((key) => key.startsWith(`${slideId}:`))) return true;
    return false;
  };

  const handleResetActiveSlide = () => {
    if (!activeSlide) return;
    const slideId = activeSlide.id;
    if (!getSlideHasEdits(slideId)) return;

    setEditedSlideImages((prev) => {
      const next = { ...prev };
      delete next[slideId];
      return next;
    });
    setTextLayersBySlide((prev) => {
      const next = { ...prev };
      delete next[slideId];
      return next;
    });
    setSelectedTextLayerBySlide((prev) => {
      const next = { ...prev };
      delete next[slideId];
      return next;
    });
    setImageOverlaysBySlide((prev) => {
      const existing = prev[slideId];
      if (existing?.src) revokeIfObjectUrl(existing.src);
      const next = { ...prev };
      delete next[slideId];
      return next;
    });
    setCropPositions((prev) => {
      const next: typeof prev = {};
      for (const [key, value] of Object.entries(prev)) {
        if (key.startsWith(`${slideId}:`)) continue;
        next[key] = value;
      }
      return next;
    });
    setCropZoomLevels((prev) => {
      const next: typeof prev = {};
      for (const [key, value] of Object.entries(prev)) {
        if (key.startsWith(`${slideId}:`)) continue;
        next[key] = value;
      }
      return next;
    });
    requestHistoryCommit();
    setToast('Reset slide edits.');
  };

  const getSafeFilename = (value: string) => value.replace(/[^\w.-]/g, '_').slice(0, 120) || 'slide';

  const canvasToBlob = (canvas: HTMLCanvasElement, type: string) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('Failed to export image.'));
        else resolve(blob);
      }, type);
    });

  const loadBitmap = async (src: string) => {
    const response = await fetch(src);
    if (!response.ok) throw new Error('Failed to load image for export.');
    const blob = await response.blob();
    if ('createImageBitmap' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).createImageBitmap(blob) as Promise<ImageBitmap>;
    }
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Failed to decode image for export.'));
        el.src = url;
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const wrapTextLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const paragraphs = text.split('\n');
    const lines: string[] = [];
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push('');
        continue;
      }
      let current = words[0]!;
      for (let i = 1; i < words.length; i += 1) {
        const word = words[i]!;
        const next = `${current} ${word}`;
        if (ctx.measureText(next).width <= maxWidth) {
          current = next;
        } else {
          lines.push(current);
          current = word;
        }
      }
      lines.push(current);
    }
    return lines;
  };

  const renderActiveSlideToPngBlob = async () => {
    if (!activeSlide || !activeSlideImageSrc) {
      throw new Error('Add or select an image first.');
    }
    const { width, height } = EXPORT_SIZES[selectedAspect];
    const previewFrameWidth = cropFrameRef.current?.getBoundingClientRect().width ?? 360;
    const previewScale = previewFrameWidth > 0 ? width / previewFrameWidth : 1;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable.');

    const bitmap = await loadBitmap(activeSlideImageSrc);
    const imgW = bitmap instanceof HTMLImageElement ? bitmap.naturalWidth : bitmap.width;
    const imgH = bitmap instanceof HTMLImageElement ? bitmap.naturalHeight : bitmap.height;
    if (!imgW || !imgH) throw new Error('Invalid image dimensions.');

    const coverScale = Math.max(width / imgW, height / imgH);
    const baseW = imgW * coverScale;
    const baseH = imgH * coverScale;
    const posX = activeCropPosition.x / 100;
    const posY = activeCropPosition.y / 100;
    const baseX = (width - baseW) * posX;
    const baseY = (height - baseH) * posY;

    const zoomScale = activeCropZoomScale;
    const originX = width * posX;
    const originY = height * posY;
    const drawX = originX + (baseX - originX) * zoomScale;
    const drawY = originY + (baseY - originY) * zoomScale;
    const drawW = baseW * zoomScale;
    const drawH = baseH * zoomScale;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap as CanvasImageSource, drawX, drawY, drawW, drawH);

    if (activeImageOverlay?.src) {
      try {
        const overlayBitmap = await loadBitmap(activeImageOverlay.src);
        const overlayW0 = overlayBitmap instanceof HTMLImageElement ? overlayBitmap.naturalWidth : overlayBitmap.width;
        const overlayH0 = overlayBitmap instanceof HTMLImageElement ? overlayBitmap.naturalHeight : overlayBitmap.height;
        if (overlayW0 > 0 && overlayH0 > 0) {
          const desiredW = (width * activeImageOverlay.sizePercent) / 100;
          const desiredH = (desiredW * overlayH0) / overlayW0;
          const maxH = height * 0.55;
          const drawOverlayH = Math.min(desiredH, maxH);
          const drawOverlayW = (drawOverlayH * overlayW0) / overlayH0;
          const padding = Math.round(width * 0.045);

          let overlayX = padding;
          let overlayY = padding;
          const placement = activeImageOverlay.placement;
          const centeredX = (width - drawOverlayW) / 2;
          const centeredY = (height - drawOverlayH) / 2;

          if (placement === 'top-center') {
            overlayX = centeredX;
            overlayY = padding;
          } else if (placement === 'top-right') {
            overlayX = width - drawOverlayW - padding;
            overlayY = padding;
          } else if (placement === 'middle-left') {
            overlayX = padding;
            overlayY = centeredY;
          } else if (placement === 'center') {
            overlayX = centeredX;
            overlayY = centeredY;
          } else if (placement === 'middle-right') {
            overlayX = width - drawOverlayW - padding;
            overlayY = centeredY;
          } else if (placement === 'bottom-left') {
            overlayX = padding;
            overlayY = height - drawOverlayH - padding;
          } else if (placement === 'bottom-center') {
            overlayX = centeredX;
            overlayY = height - drawOverlayH - padding;
          } else if (placement === 'bottom-right') {
            overlayX = width - drawOverlayW - padding;
            overlayY = height - drawOverlayH - padding;
          }

          overlayX = Math.max(0, Math.min(width - drawOverlayW, overlayX));
          overlayY = Math.max(0, Math.min(height - drawOverlayH, overlayY));
          ctx.drawImage(overlayBitmap as CanvasImageSource, overlayX, overlayY, drawOverlayW, drawOverlayH);
        }
      } catch {
        // ignore overlay render errors
      }
    }

    const layers = activeTextLayers.filter((layer) => layer.text.trim().length > 0);
    if (layers.length) {
      const drawOrder = [...layers].reverse();
      for (const layer of drawOrder) {
        const fontFamily = getFont(layer.fontId).cssFamily;
        const fontSize = Math.max(8, layer.fontSize * previewScale);
        if (document.fonts?.load) {
          try {
            await document.fonts.load(`${fontSize}px ${fontFamily}`);
          } catch {
            // best-effort font load
          }
        }

        const boxW = width * 0.92;
        const paddingX = 10 * previewScale;
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = layer.color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = layer.align;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12 * previewScale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2 * previewScale;

        const contentW = Math.max(10, boxW - paddingX * 2);
        const lines = wrapTextLines(ctx, layer.text, contentW);
        const lineHeight = fontSize * 1.05;
        const boxH = lines.length * lineHeight;

        const anchorX = (layer.x / 100) * width;
        const anchorY = (layer.y / 100) * height;
        const boxLeft =
          layer.align === 'center' ? anchorX - boxW / 2 : layer.align === 'right' ? anchorX - boxW : anchorX;
        const boxTop = anchorY - boxH / 2;
        const textX =
          layer.align === 'center'
            ? boxLeft + boxW / 2
            : layer.align === 'right'
              ? boxLeft + boxW - paddingX
              : boxLeft + paddingX;

        lines.forEach((line, idx) => {
          const y = boxTop + idx * lineHeight + lineHeight / 2;
          ctx.fillText(line, textX, y);
        });

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
    }

    return canvasToBlob(canvas, 'image/png');
  };

  const handleExportActiveSlide = async () => {
    try {
      const blob = await renderActiveSlideToPngBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const name = `${getSafeFilename(activeSlide?.label ?? 'Slide')}_${selectedAspect.replace(':', 'x')}.png`;
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast('Exported PNG.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.';
      setToast(message);
    }
  };

  const uploadToMediaLibrary = async (userId: string, file: File) => {
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const ts = Date.now();
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(16).slice(2);
    const path = `user_${userId}/${new Date().toISOString().slice(0, 10)}/${ts}_${uuid}_${safeName}`;
    const filename = path.split('/').pop() || safeName;

    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
    if (error) throw error;

    return {
      bucket: 'media',
      path,
      filename,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      created_at: new Date().toISOString(),
    };
  };

  const handleSaveToLibrary = async () => {
    if (saveWorking) return;
    if (!user) {
      setToast('Please log in to save to your media library.');
      return;
    }
    if (!activeSlide || !activeSlideImageSrc) {
      setToast('Add or select an image first.');
      return;
    }

    setSaveWorking(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Your session expired. Please log back in to save.');
      }
      try {
        await supabase.auth.setSession({
          access_token: session.data.session.access_token,
          refresh_token: session.data.session.refresh_token ?? '',
        });
      } catch (err) {
        console.warn('Failed to refresh Supabase session before save:', err);
      }

      const blob = await renderActiveSlideToPngBlob();
      const filename = `${getSafeFilename(activeSlide.label)}_${selectedAspect.replace(':', 'x')}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      const uploaded = await uploadToMediaLibrary(user.id, file);
      const row = {
        user_id: user.id,
        bucket: uploaded.bucket,
        path: uploaded.path,
        filename: uploaded.filename,
        mime_type: uploaded.mime_type,
        size_bytes: uploaded.size_bytes,
        media_type: 'image',
        visibility: 'private',
        is_library: true,
      };
      const { error } = await supabase.from('media').insert([row]);
      if (error) throw error;

      setToast('Saved to Media Library.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed. Please try again.';
      console.error('Save to media library failed:', err);
      setToast(message);
    } finally {
      setSaveWorking(false);
    }
  };

  const handleAiEditGenerate = async () => {
    if (!activeSlide || !activeSlideImageSrc) {
      setToast('Add or select an image first.');
      return;
    }
    if (!aiPrompt.trim()) {
      setToast('Describe what you want to change first.');
      return;
    }
    if (aiEditWorking) return;

    setAiEditWorking(true);
    try {
      const parseFunctionError = async (err: unknown) => {
        const errorContext = err as { context?: { body?: unknown }; message?: string };
        const contextBody = errorContext?.context?.body;
        let rawBody = '';

        if (typeof contextBody === 'string') {
          rawBody = contextBody;
        } else if (contextBody && typeof (contextBody as ReadableStream).getReader === 'function') {
          rawBody = await new Response(contextBody as ReadableStream).text();
        } else if (contextBody) {
          rawBody = String(contextBody);
        }

        if (!rawBody) return errorContext?.message || 'AI edit failed.';

        try {
          const parsed = JSON.parse(rawBody) as { error?: string; details?: string };
          if (parsed.error) {
            return parsed.details ? `${parsed.error} (${parsed.details})` : parsed.error;
          }
          return rawBody;
        } catch {
          return rawBody;
        }
      };

      const isLocalSrc = activeSlideImageSrc.startsWith('blob:') || activeSlideImageSrc.startsWith('data:');
      const imageBody = isLocalSrc
        ? {
            imageBase64: activeSlideImageSrc.startsWith('data:')
              ? activeSlideImageSrc
              : await blobToDataUrl(await (await fetch(activeSlideImageSrc)).blob()),
          }
        : { imageUrl: activeSlideImageSrc };

      const body: Record<string, unknown> = {
        ...(imageBody as Record<string, unknown>),
        prompt: aiPrompt.trim(),
        aspectRatio: selectedAspect,
        outputFormat: 'png',
        numImages: 1,
        resolution: '1K',
      };

      const { data, error } = await supabase.functions.invoke('nano-banana-edit', { body });
      if (error) {
        throw new Error(await parseFunctionError(error));
      }

      const response = data as
        | { dataUrl?: string | null; url?: string | null; image?: { url?: string; file_data?: string } | null; error?: string }
        | null;
      const fnError = response?.error;
      if (fnError) throw new Error(fnError);

      const returnedSrc = response?.dataUrl || response?.image?.file_data || response?.url || response?.image?.url || '';
      if (!returnedSrc) throw new Error('No image returned from AI edit.');

      appendGeneratedSlide({ image: returnedSrc, status: 'AI Enhanced' });
      setToast('AI edit generated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI edit failed.';
      setToast(message);
    } finally {
      setAiEditWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      <input
        ref={previewInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePreviewInputChange}
      />
      <input
        ref={bgReplaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBgReplaceInputChange}
      />
      <input
        ref={imageOverlayInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageOverlayInputChange}
      />
      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={backLink.to}
              state={backState}
              className="inline-flex items-center text-pacific hover:text-vanilla font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLink.label}
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="inline-flex items-center gap-2 rounded-md border border-charcoal/50 bg-surface-alt px-3 py-2 text-sm text-vanilla/80 hover:bg-surface-muted disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className="inline-flex items-center gap-2 rounded-md border border-charcoal/50 bg-surface-alt px-3 py-2 text-sm text-vanilla/80 hover:bg-surface-muted disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Redo2 className="h-4 w-4" />
                Redo
              </button>
              <button
                type="button"
                onClick={handleResetActiveSlide}
                disabled={!activeSlide || !getSlideHasEdits(activeSlide.id)}
                className="inline-flex items-center gap-2 rounded-md border border-charcoal/50 bg-surface-alt px-3 py-2 text-sm text-vanilla/80 hover:bg-surface-muted disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveToLibrary();
                }}
                disabled={!activeSlideImageSrc || saveWorking}
                className="inline-flex items-center gap-2 rounded-md border border-pacific/40 bg-pacific/10 px-3 py-2 text-sm text-vanilla hover:bg-pacific/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {saveWorking ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleExportActiveSlide();
                }}
                disabled={!activeSlideImageSrc}
                className="inline-flex items-center gap-2 rounded-md border border-pacific/40 bg-pacific/15 px-3 py-2 text-sm text-vanilla hover:bg-pacific/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[max-content_minmax(0,1fr)_320px]">
            <section className="sf-card p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-vanilla/50">Brand</p>
                <button
                  type="button"
                  onClick={() => setActiveTool('brand')}
                  className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    activeTool === 'brand'
                      ? 'border-pacific/70 bg-pacific/15 text-vanilla'
                      : 'border-charcoal/50 bg-surface-alt text-vanilla/75 hover:bg-surface-muted'
                  }`}
                  aria-pressed={activeTool === 'brand'}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Palette className="h-4 w-4 text-pacific" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {activeBrandProfile ? activeBrandProfile.label : 'Set brand profile'}
                      </div>
                      <div className="truncate text-[11px] text-vanilla/55">
                        {activeBrandProfile ? 'Applies to new text by default' : 'Choose palette defaults for this session'}
                      </div>
                    </div>
                  </div>
                  {brandColors.length ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0" aria-hidden="true">
                      {brandColors.slice(0, 4).map((color) => (
                        <span
                          key={color}
                          className="h-3 w-3 rounded-full border border-charcoal/50"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  ) : (
                    <ChevronDown className="h-4 w-4 text-vanilla/50 flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-vanilla/50">Tools</p>
              </div>
              <div className="space-y-2">
                {tools.filter((tool) => ['crop', 'text', 'image-overlay'].includes(tool.id)).map((tool) => {
                  const ToolIcon = tool.icon;
                  const isActive = tool.id === activeTool;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'border-pacific/70 bg-pacific/15 text-vanilla'
                          : 'border-charcoal/50 text-vanilla/75 hover:bg-surface-muted'
                      }`}
                      aria-pressed={isActive}
                    >
                      <ToolIcon className="h-4 w-4 text-vanilla/70" />
                      <span className="text-sm font-medium whitespace-nowrap">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-[0.2em] text-vanilla/50">AI Tools</p>
              </div>
              <div className="space-y-2">
                {tools.filter((tool) => creatorToolIds.includes(tool.id)).map((tool) => {
                  const ToolIcon = tool.icon;
                  const isActive = tool.id === activeTool;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'border-pacific/70 bg-pacific/15 text-vanilla'
                          : 'border-charcoal/50 text-vanilla/75 hover:bg-surface-muted'
                      }`}
                      aria-pressed={isActive}
                    >
                      <ToolIcon className="h-4 w-4 text-vanilla/70" />
                      <span className="text-sm font-medium whitespace-nowrap">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-[0.2em] text-vanilla/50">Creator Tools</p>
              </div>
              <div className="space-y-2">
                {tools.filter((tool) => studioToolIds.includes(tool.id)).map((tool) => {
                  const ToolIcon = tool.icon;
                  const isActive = tool.id === activeTool;
                  const isStudioAiTool = ['bg-generate', 'vectorize', 'ai-edit'].includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'border-pacific/70 bg-pacific/15 text-vanilla'
                          : 'border-charcoal/50 text-vanilla/75 hover:bg-surface-muted'
                      }`}
                      aria-pressed={isActive}
                    >
                      <span className="flex items-center gap-2">
                        <ToolIcon className={`h-4 w-4 ${isStudioAiTool ? 'text-pacific' : 'text-vanilla/70'}`} />
                        <span className="text-sm font-medium whitespace-nowrap">{tool.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4 sticky top-24 self-start">
              <div className="sf-panel p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-vanilla">{navCarousel?.title || 'Studio Preview'}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={handleStudioPreviewClick}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border border-[#225561] bg-[#225561] text-sand hover:bg-[#2f7f90] hover:border-[#2f7f90]"
                    >
                      <Upload className="h-4 w-4" />
                      Add files
                    </button>
                    <span className="text-xs text-vanilla/60">or</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLibraryTab('images');
                        setShowLibraryModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border border-[#225561] bg-[#225561] text-sand hover:bg-[#2f7f90] hover:border-[#2f7f90]"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Media Library
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative rounded-2xl border border-charcoal/60 bg-ink/70 p-4 shadow-soft">
                <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: 'radial-gradient(circle at top, rgba(64,160,178,0.08), transparent 55%)' }} />
                <div className={`relative mx-auto w-full max-w-[360px] ${canvasAspectClass}`}>
                  <div
                    ref={cropFrameRef}
                    className={`relative h-full w-full rounded-2xl border bg-surface-alt/80 shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${
                      activeTool === 'crop' ? 'border-pacific/40' : 'border-charcoal/60'
                    }`}
                  >
                    {activeSlideImageSrc ? (
                      <div
                        className={`relative h-full w-full overflow-hidden rounded-2xl ${
                          activeTool === 'crop' ? 'cursor-grab active:cursor-grabbing' : ''
                        }`}
                        onPointerDown={handleCropPointerDown}
                        onPointerMove={handleCropPointerMove}
                        onPointerUp={handleCropPointerEnd}
                        onPointerCancel={handleCropPointerEnd}
                      >
                        <img
                          key={activeSlideImageSrc}
                          src={activeSlideImageSrc}
                          alt={activeSlide.label}
                          draggable={false}
                          className="h-full w-full select-none object-cover"
                          style={{
                            objectPosition: `${activeCropPosition.x}% ${activeCropPosition.y}%`,
                            transform: `scale(${activeCropZoomScale})`,
                            transformOrigin: `${activeCropPosition.x}% ${activeCropPosition.y}%`,
                          }}
                        />
                        {activeImageOverlay?.src && (
                          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 5 }}>
                            <img
                              key={activeImageOverlay.src}
                              src={activeImageOverlay.src}
                              alt="Image overlay"
                              className="absolute select-none"
                              style={{
                                width: `${activeImageOverlay.sizePercent}%`,
                                height: 'auto',
                                ...getOverlayCssPlacement(activeImageOverlay.placement),
                              }}
                              draggable={false}
                            />
                          </div>
                        )}
                        {activeTextLayers.length > 0 && (
                          <div
                            className={`absolute left-0 top-0 h-full w-full ${
                              activeTool === 'text' ? 'pointer-events-auto' : 'pointer-events-none'
                            }`}
                            style={{ zIndex: 10 }}
                          >
                            {activeTextLayers.map((layer, index) => {
                              const isSelected = layer.id === activeSelectedTextLayerId;
                              const showLayer = layer.text.trim().length > 0;
                              if (!showLayer) return null;
                              const zIndex = activeTextLayers.length - index;
                              return (
                                <div
                                  key={layer.id}
                                  onPointerDown={(event) => handleTextPointerDown(event, layer.id)}
                                  onPointerMove={handleTextPointerMove}
                                  onPointerUp={handleTextPointerEnd}
                                  onPointerCancel={handleTextPointerEnd}
                                  className={`absolute ${activeTool === 'text' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                  style={{
                                    left: `${layer.x}%`,
                                    top: `${layer.y}%`,
                                    transform: getTextAnchorTransform(layer.align),
                                    width: '92%',
                                    textAlign: layer.align,
                                    color: layer.color,
                                    fontFamily: getFont(layer.fontId).cssFamily,
                                    fontSize: `${layer.fontSize}px`,
                                    lineHeight: 1.05,
                                    textShadow: '0 2px 12px rgba(0,0,0,0.5)',
                                    padding: '0 10px',
                                    userSelect: 'none',
                                    zIndex,
                                  }}
                                >
                                  <span className="block break-words">{layer.text}</span>
                                  {activeTool === 'text' && isSelected && (
                                    <span
                                      className="pointer-events-none absolute -inset-1 rounded-md border border-pacific/60"
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {activeTool === 'crop' && (
                          <div className="pointer-events-none absolute inset-0">
                            <div className="absolute inset-0 border border-vanilla/10" />
                            <div className="absolute left-1/3 top-0 h-full w-px bg-vanilla/15" />
                            <div className="absolute left-2/3 top-0 h-full w-px bg-vanilla/15" />
                            <div className="absolute top-1/3 left-0 h-px w-full bg-vanilla/15" />
                            <div className="absolute top-2/3 left-0 h-px w-full bg-vanilla/15" />
                            <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-b from-black/10 via-transparent to-black/10" />
                          </div>
                        )}
                        {activeTool === 'crop' && (
                          <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-vanilla/70">
                            Drag to reposition inside the frame
                          </div>
                        )}
                        {activeTool === 'text' && activeTextLayers.some((layer) => layer.text.trim().length > 0) && (
                          <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-vanilla/70">
                            Drag text to position
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStudioPreviewClick}
                        aria-label="Upload an image for the Studio workspace"
                        className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-surface via-ink to-ink cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-pacific/70"
                      >
                        <div className="text-center space-y-2 px-3">
                          <Sparkles className="mx-auto h-6 w-6 text-pacific/70" />
                          <p className="text-sm text-vanilla/70">Your preview appears here.</p>
                          <p className="text-xs text-pacific/70">Click to upload an image from your computer.</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
                {activeTool === 'crop' && activeSlideImageSrc && (
                  <div className="mt-4 flex items-center gap-3 text-xs text-vanilla/70">
                    <span className="min-w-10 text-[11px] uppercase tracking-[0.2em] text-vanilla/50">Zoom</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={activeCropZoomLevel}
                      onChange={(event) => handleCropZoomChange(Number(event.target.value))}
                      className="w-full accent-pacific"
                      aria-label="Zoom"
                    />
                    <span className="w-12 text-right text-[11px] text-vanilla/60">{Math.round(activeCropZoomScale * 100)}%</span>
                  </div>
                )}
              </div>

              <div className="sf-panel p-3">
                <div className="flex items-center justify-between text-xs text-vanilla/60 mb-3">
                  <span>Slides</span>
                  <span>{slides.length} total</span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {slides.length ? (
                    slides.map((slide, index) => {
                      const isActive = index === activeSlideIndex;
                      const src = getDisplayedSlideImage(slide);
                      const isDragging = draggingSlideId === slide.id;
                      const statusColor =
                        slide.status === 'AI Enhanced'
                          ? 'bg-pacific'
                          : slide.status === 'Edited'
                            ? 'bg-vanilla/70'
                            : slide.status === 'Original'
                              ? 'bg-vanilla/50'
                              : 'bg-charcoal/70';
                      return (
                        <button
                          key={slide.id}
                          type="button"
                          onClick={() => setActiveSlideIndex(index)}
                          draggable={Boolean(src)}
                          onDragStart={(event) => handleSlideThumbnailDragStart(event, slide, index, src)}
                          onDragEnd={handleSlideThumbnailDragEnd}
                          className={`group flex-shrink-0 rounded-lg border p-2 text-left cursor-grab active:cursor-grabbing transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ease-out ${
                            isActive ? 'border-pacific/70 bg-pacific/10' : 'border-charcoal/50 bg-ink/40 hover:bg-surface-muted'
                          } ${
                            isDragging ? 'border-tropical ring-2 ring-tropical/30 shadow-lg shadow-tropical/25 scale-[1.02] -rotate-1 opacity-70' : ''
                          }`}
                        >
                          <div className="h-16 w-16 rounded-md bg-surface-alt/80 overflow-hidden">
                            {src ? (
                              <img
                                key={src}
                                src={src}
                                alt={slide.label}
                                className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-surface to-ink" />
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-vanilla/70">
                            <span>{slide.label}</span>
                            <span className={`h-2 w-2 rounded-full ${statusColor}`} aria-hidden="true" />
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-charcoal/50 bg-ink/40 px-4 py-6 text-center text-xs text-vanilla/60">
                      <span>No slides loaded yet.</span>
                      <Link to="/media-library" className="text-pacific">
                        Open Media Library
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="sf-card sf-studio-toolpanel p-3 space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-vanilla/50">Tool</p>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-vanilla">{selectedTool?.label || 'Select a tool'}</span>
                  {selectedTool?.ai && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-pacific/30 bg-pacific/15 text-pacific">
                      <Sparkles className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-vanilla/70">{selectedTool?.description || 'Choose a tool from the left to begin.'}</p>
              </div>

              <div className="space-y-2">
                {activeTool === 'crop' && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-vanilla/50">Aspect Ratio</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(['1:1', '4:5', '9:16'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => {
                              setSelectedAspect(ratio);
                              requestHistoryCommitDebounced(250);
                            }}
                            className={`rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                              selectedAspect === ratio
                                ? 'border-pacific/70 bg-pacific/20 text-vanilla'
                                : 'border-charcoal/50 text-vanilla/70 hover:bg-surface-muted'
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === 'bg-remove' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleRemoveBackground}
                      disabled={!activeSlideImageSrc || bgRemoveWorking}
                      className="sf-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {bgRemoveWorking ? 'Removing…' : 'Remove Background'}
                    </button>
                  </div>
                )}

                {activeTool === 'bg-generate' && (
                  <div className="space-y-2">
                    <p className="text-xs text-vanilla/60">Generate a new image and add it as a new slide.</p>
                    <div className="space-y-2">
                      <label className="sf-label">Image prompt</label>
                      <textarea
                        value={bgGeneratePrompt}
                        onChange={(event) => setBgGeneratePrompt(event.target.value)}
                        placeholder="Describe the image you want to generate..."
                        className="sf-input min-h-[110px] resize-none"
                      />
                    </div>
                    {!bgGenerateUseBrandProfile && (
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { label: IMAGE_STYLE_PROMPTS.minimal.label, value: 'minimal' },
                            { label: IMAGE_STYLE_PROMPTS.bold.label, value: 'bold' },
                            { label: IMAGE_STYLE_PROMPTS.elegant.label, value: 'elegant' },
                          ] as Array<{ label: string; value: BackgroundStyleKey }>
                        ).map((preset) => {
                          const isActive = bgGenerateStylePreset === preset.value;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                if (isActive) {
                                  setBgGenerateStylePreset(null);
                                  return;
                                }
                                setBgGenerateUseBrandProfile(false);
                                setBgGenerateStylePreset(preset.value);
                              }}
                              className={`rounded-md border px-2 py-2 text-xs transition-colors ${
                                isActive
                                  ? 'border-pacific bg-pacific/25 text-vanilla ring-1 ring-pacific/60 shadow-soft'
                                  : 'border-charcoal/50 text-vanilla/70 hover:bg-surface-muted'
                              }`}
                              aria-pressed={isActive}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleUseBrandProfileForGenerate}
                      className="sf-btn-secondary w-full"
                    >
                      Use Brand Profile
                    </button>
                    {bgGenerateUseBrandProfile && activeBrandProfile && (
                      <div className="rounded-md border border-charcoal/50 bg-ink/40 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-vanilla/50">Brand profile</span>
                          <span className="text-xs font-semibold text-vanilla/80">{activeBrandProfile.label}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          {(activeBrandProfile.colors ?? []).slice(0, 4).map((color) => (
                            <span
                              key={color}
                              className="h-4 w-4 rounded-md border border-charcoal/50"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          {!(activeBrandProfile.colors ?? []).length && (
                            <span className="text-xs text-vanilla/50">No colors set</span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-vanilla/50">Style</span>
                          <span className="text-xs font-semibold text-vanilla/80">
                            {activeBrandProfile.style || '—'}
                          </span>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void handleGenerateBackground();
                      }}
                      disabled={bgGenerateWorking}
                      className="sf-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {bgGenerateWorking ? 'Generating…' : 'Generate Image'}
                    </button>
                    <div className="rounded-md border border-charcoal/50 bg-surface-alt/60 px-3 py-2 text-[11px] text-vanilla/60">
                      This tool uses AI credits.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBgGenerateUseBrandProfile(false);
                        setBgGenerateStylePreset(null);
                      }}
                      disabled={!bgGenerateStylePreset && !bgGenerateUseBrandProfile}
                      className={`w-full rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                        !bgGenerateStylePreset && !bgGenerateUseBrandProfile
                          ? 'border-charcoal/50 text-vanilla/40'
                          : 'border-pacific/70 bg-pacific/20 text-pacific shadow-soft hover:bg-pacific/30 hover:text-vanilla'
                      }`}
                    >
                      Clear Presets
                    </button>
                  </div>
                )}

                {activeTool === 'vectorize' && (
                  <div className="space-y-2">
                    <p className="text-xs text-vanilla/60">Turn a raster image into an editable SVG.</p>
                    <button
                      type="button"
                      onClick={() => {
                        void handleVectorizeImage();
                      }}
                      disabled={!activeSlideImageSrc || vectorizeWorking}
                      className="sf-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {vectorizeWorking ? 'Vectorizing…' : 'Vectorize to SVG'}
                    </button>
                    {vectorizeResultUrl && (
                      <a
                        href={vectorizeResultUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-pacific hover:text-vanilla"
                      >
                        Open vector SVG
                      </a>
                    )}
                    <div className="rounded-md border border-charcoal/50 bg-surface-alt/60 px-3 py-2 text-[11px] text-vanilla/60">
                      This tool uses AI credits.
                    </div>
                  </div>
                )}

                {activeTool === 'bg-replace' && (
                  <div className="space-y-2">
                    <p className="text-xs text-vanilla/60">Choose a clean backdrop or use your brand profile.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBgReplaceMode('image');
                          setBgReplaceUseBrandProfile(false);
                        }}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                          bgReplaceMode === 'image'
                            ? 'border-pacific/70 bg-pacific/20 text-vanilla'
                            : 'border-charcoal/50 text-vanilla/70 hover:bg-surface-muted'
                        }`}
                        aria-pressed={bgReplaceMode === 'image'}
                      >
                        Use image
                      </button>
                      <button
                        type="button"
                        onClick={() => setBgReplaceMode('prompt')}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                          bgReplaceMode === 'prompt'
                            ? 'border-pacific/70 bg-pacific/20 text-vanilla'
                            : 'border-charcoal/50 text-vanilla/70 hover:bg-surface-muted'
                        }`}
                        aria-pressed={bgReplaceMode === 'prompt'}
                      >
                        Use prompt
                      </button>
                    </div>

                    {bgReplaceMode === 'image' ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleBgReplacePick}
                          className="sf-btn-secondary w-full inline-flex items-center justify-center gap-2"
                        >
                          <ImagePlus className="h-4 w-4" />
                          Choose background image
                        </button>
                        <div
                          className={`rounded-md border px-3 py-3 text-xs transition-colors ${
                            bgReplaceDragActive
                              ? 'border-pacific/70 bg-pacific/15 text-vanilla'
                              : bgReplaceRef?.previewUrl
                                ? 'border-charcoal/50 bg-surface-alt/60 text-vanilla/70'
                                : 'border-dashed border-charcoal/50 bg-ink/40 text-vanilla/50'
                          }`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'copy';
                            setBgReplaceDragActive(true);
                          }}
                          onDragLeave={() => setBgReplaceDragActive(false)}
                          onDrop={handleBgReplaceDrop}
                        >
                          {bgReplaceRef?.previewUrl ? (
                            <div className="flex items-center gap-3">
                              <img
                                src={bgReplaceRef.previewUrl}
                                alt="Selected background"
                                className="h-10 w-10 rounded-md object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs text-vanilla/80">
                                  {bgReplaceRef.label || bgReplaceRef.file?.name || 'Selected background'}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (bgReplaceRef.previewUrl && bgReplaceRef.revokeOnCleanup) {
                                      URL.revokeObjectURL(bgReplaceRef.previewUrl);
                                    }
                                    setBgReplaceRef(null);
                                  }}
                                  className="text-[11px] text-pacific hover:text-vanilla"
                                >
                                  Remove selection
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p>Select a background image to replace behind your subject.</p>
                              <p className="text-[11px] text-vanilla/50">Tip: drag a slide thumbnail here.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="sf-label">Background prompt</label>
                        <textarea
                          value={bgReplacePrompt}
                          onChange={(event) => setBgReplacePrompt(event.target.value)}
                          placeholder="e.g., clean studio wall, soft warm gradient, beach at sunset..."
                          className="sf-input min-h-[90px] resize-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              { label: BACKGROUND_STYLE_PROMPTS.minimal.label, value: 'minimal' },
                              { label: BACKGROUND_STYLE_PROMPTS.bold.label, value: 'bold' },
                              { label: BACKGROUND_STYLE_PROMPTS.elegant.label, value: 'elegant' },
                            ] as Array<{ label: string; value: BackgroundStyleKey }>
                          ).map((preset) => {
                            const isActive = !bgReplaceUseBrandProfile && bgReplaceStylePreset === preset.value;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setBgReplaceMode('prompt');
                                  setBgReplaceUseBrandProfile(false);
                                  setBgReplaceStylePreset(preset.value);
                                }}
                                className={`rounded-md border px-2 py-2 text-xs transition-colors ${
                                  isActive
                                    ? 'border-pacific/70 bg-pacific/20 text-vanilla'
                                    : 'border-charcoal/50 text-vanilla/70 hover:bg-surface-muted'
                                }`}
                                aria-pressed={isActive}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleUseBrandProfile}
                      className="sf-btn-secondary w-full"
                    >
                      Use Brand Profile
                    </button>
                    {bgReplaceUseBrandProfile && activeBrandProfile && (
                      <div className="rounded-md border border-charcoal/50 bg-ink/40 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-vanilla/50">Brand profile</span>
                          <span className="text-xs font-semibold text-vanilla/80">{activeBrandProfile.label}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          {(activeBrandProfile.colors ?? []).slice(0, 4).map((color) => (
                            <span
                              key={color}
                              className="h-4 w-4 rounded-md border border-charcoal/50"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          {!(activeBrandProfile.colors ?? []).length && (
                            <span className="text-xs text-vanilla/50">No colors set</span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-vanilla/50">Style</span>
                          <span className="text-xs font-semibold text-vanilla/80">
                            {activeBrandProfile.style || '—'}
                          </span>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void handleBackgroundReplacePreview();
                      }}
                      disabled={!activeSlideImageSrc || bgReplaceWorking}
                      className="sf-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {bgReplaceWorking ? 'Generating…' : 'Generate Background'}
                    </button>
                    <div className="rounded-md border border-charcoal/50 bg-surface-alt/60 px-3 py-2 text-[11px] text-vanilla/60">
                      This tool uses AI credits.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBgReplaceUseBrandProfile(false);
                        setBgReplaceStylePreset(null);
                      }}
                      disabled={!bgReplaceStylePreset && !bgReplaceUseBrandProfile}
                      className={`w-full rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                        !bgReplaceStylePreset && !bgReplaceUseBrandProfile
                          ? 'border-charcoal/50 text-vanilla/40'
                          : 'border-pacific/70 bg-pacific/20 text-pacific shadow-soft hover:bg-pacific/30 hover:text-vanilla'
                      }`}
                    >
                      Clear Presets
                    </button>
                  </div>
                )}
                {activeTool === 'smart-enhance' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleUpscalePreview();
                      }}
                      disabled={!activeSlideImageSrc || upscaleWorking}
                      className="sf-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {upscaleWorking ? 'Upscaling…' : 'Upscale Image'}
                    </button>
                    <div className="rounded-md border border-charcoal/50 bg-surface-alt/60 px-3 py-2 text-[11px] text-vanilla/60">
                      This tool uses AI credits.
                    </div>
                    {(upscaleStatus || upscaleTargetSlideLabel || upscaleLastOutputUrl) && (
                      <div className="rounded-md border border-charcoal/50 bg-ink/40 px-3 py-2 text-xs text-vanilla/70">
                        {upscaleTargetSlideLabel && upscaleTargetSlideId && upscaleTargetSlideId !== activeSlide?.id && (
                          <p>Upscaling {upscaleTargetSlideLabel}…</p>
                        )}
                        {upscaleStatus && <p>{upscaleStatus}</p>}
                        {upscaleWorking && <p className="text-vanilla/50">Elapsed: {formatElapsed(upscaleElapsedMs)}</p>}
                        {upscaleLastOutputUrl && (
                          <a
                            href={upscaleLastOutputUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-pacific hover:text-vanilla"
                          >
                            Open upscaled image
                          </a>
                        )}
                      </div>
                    )}
                    {upscaleWorking && (
                      <button
                        type="button"
                        onClick={handleUpscaleCancel}
                        className="sf-btn-secondary w-full"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}

                {activeTool === 'text' && (
                  <div className="space-y-2">
                    <p className="text-xs text-vanilla/60">Overlay multiple text boxes on your image (session-only preview).</p>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        disabled={!activeSlide}
                        onClick={() => {
                          if (!activeSlide) return;
                          addTextLayer(activeSlide.id);
                        }}
                        className="sf-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Add text box
                      </button>
                    </div>

                    {activeTextLayers.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="sf-label mb-0">Text boxes</label>
                          <span className="text-[11px] text-vanilla/50">{activeTextLayers.length}</span>
                        </div>
                        <div className="space-y-2">
                          {activeTextLayers.map((layer, index) => {
                            const isSelected = layer.id === activeSelectedTextLayer?.id;
                            const label = layer.text.trim().split('\n')[0] || `Text box ${index + 1}`;
                            return (
                              <button
                                key={layer.id}
                                type="button"
                                onClick={() => {
                                  if (!activeSlide) return;
                                  selectTextLayer(activeSlide.id, layer.id);
                                }}
                                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                                  isSelected
                                    ? 'border-pacific/70 bg-pacific/15 text-vanilla'
                                    : 'border-charcoal/50 bg-surface-alt text-vanilla/70 hover:bg-surface-muted hover:text-vanilla'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate font-medium">{label}</span>
                                  <span className="text-[11px] text-vanilla/50">#{index + 1}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="sf-label">Text</label>
                      <textarea
                        value={activeSelectedTextLayer?.text ?? ''}
                        onChange={(event) => {
                          if (!activeSlide || !activeSelectedTextLayer) return;
                          updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { text: event.target.value });
                        }}
                        placeholder="Type your text…"
                        className="sf-input min-h-[90px] resize-none"
                        disabled={!activeSlide || !activeSelectedTextLayer}
                      />
                    </div>
                    <div>
                      <label className="sf-label">Font</label>
                      <div ref={fontMenuRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setFontMenuOpen((prev) => !prev)}
                          className={`sf-input flex w-full items-center justify-between gap-2 ${
                            fontMenuOpen ? 'border-pacific/70 ring-2 ring-pacific/30' : ''
                          }`}
                          disabled={!activeSlide || !activeSelectedTextLayer}
                          aria-haspopup="listbox"
                          aria-expanded={fontMenuOpen}
                        >
                          <span className="truncate text-sm" style={{ fontFamily: activeTextFont.cssFamily }}>
                            {activeTextFont.name}
                          </span>
                          <ChevronDown className="h-4 w-4 text-vanilla/60" />
                        </button>
                        {fontMenuOpen && (
                          <div className="absolute left-0 right-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-md border border-charcoal/60 bg-surface-alt shadow-soft">
                            {textFontOptions.map((option) => {
                              const fontDef = getFont(option.id);
                              const isSelected = activeTextFontId === option.id;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    if (!activeSlide || !activeSelectedTextLayer) return;
                                    updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { fontId: option.id });
                                    setFontMenuOpen(false);
                                  }}
                                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                                    isSelected
                                      ? 'bg-pacific/20 text-vanilla'
                                      : 'text-vanilla/80 hover:bg-surface-muted hover:text-vanilla'
                                  }`}
                                  style={{ fontFamily: fontDef.cssFamily }}
                                >
                                  {option.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="sf-label">Size</label>
                        <input
                          type="range"
                          min={16}
                          max={140}
                          value={activeSelectedTextLayer?.fontSize ?? 54}
                          onChange={(event) => {
                            if (!activeSlide || !activeSelectedTextLayer) return;
                            updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { fontSize: Number(event.target.value) });
                          }}
                          className="w-full accent-pacific"
                          disabled={!activeSlide || !activeSelectedTextLayer}
                        />
                        <div className="mt-1 text-xs text-vanilla/50">{activeSelectedTextLayer?.fontSize ?? 54}px</div>
                      </div>
                      <div>
                        <label className="sf-label">Alignment</label>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!activeSlide || !activeSelectedTextLayer) return;
                              updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { align: 'left' });
                            }}
                            className={`rounded-md border p-2 transition-colors ${
                              (activeSelectedTextLayer?.align ?? 'center') === 'left'
                                ? 'border-pacific/70 bg-pacific/20 text-vanilla'
                                : 'border-charcoal/50 text-vanilla/70 hover:bg-surface-muted'
                            }`}
                            aria-pressed={(activeSelectedTextLayer?.align ?? 'center') === 'left'}
                            disabled={!activeSlide || !activeSelectedTextLayer}
                          >
                            <AlignLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!activeSlide || !activeSelectedTextLayer) return;
                              updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { align: 'center' });
                            }}
                            className={`rounded-md border p-2 transition-colors ${
                              (activeSelectedTextLayer?.align ?? 'center') === 'center'
                                ? 'border-pacific/70 bg-pacific/20 text-vanilla'
                                : 'border-charcoal/50 text-vanilla/70 hover:bg-surface-muted'
                            }`}
                            aria-pressed={(activeSelectedTextLayer?.align ?? 'center') === 'center'}
                            disabled={!activeSlide || !activeSelectedTextLayer}
                          >
                            <AlignCenter className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!activeSlide || !activeSelectedTextLayer) return;
                              updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { align: 'right' });
                            }}
                            className={`rounded-md border p-2 transition-colors ${
                              (activeSelectedTextLayer?.align ?? 'center') === 'right'
                                ? 'border-pacific/70 bg-pacific/20 text-vanilla'
                                : 'border-charcoal/50 text-vanilla/70 hover:bg-surface-muted'
                            }`}
                            aria-pressed={(activeSelectedTextLayer?.align ?? 'center') === 'right'}
                            disabled={!activeSlide || !activeSelectedTextLayer}
                          >
                            <AlignRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="sf-label mb-0">Color</label>
                        <button
                          type="button"
                          onClick={() => setTextPickerOpen((prev) => !prev)}
                          className="inline-flex items-center gap-2 rounded-md border border-charcoal/50 bg-surface-alt px-2 py-1 text-[11px] font-semibold text-vanilla/80 hover:bg-surface-muted hover:text-vanilla"
                          disabled={!activeSlide || !activeSelectedTextLayer}
                        >
                          <span
                            className="h-4 w-4 rounded-sm border border-charcoal/60"
                            style={{ backgroundColor: activeTextColor }}
                          />
                          {textPickerOpen ? 'Hide' : 'Pick'}
                        </button>
                      </div>
                      {textPickerOpen && (
                        <div className="mt-2 space-y-3 rounded-md border border-charcoal/60 bg-surface-alt/70 p-2">
                          <div
                            ref={textColorSquareRef}
                            className="sf-color-square"
                            style={{ backgroundColor: `hsl(${textPickerHue} 100% 50%)` }}
                            onPointerDown={(event) => {
                              if (!activeSlide || !activeSelectedTextLayer || !textColorSquareRef.current) return;
                              textPickerDragRef.current = true;
                              const rect = textColorSquareRef.current.getBoundingClientRect();
                              const x = clampNumber(event.clientX - rect.left, 0, rect.width);
                              const y = clampNumber(event.clientY - rect.top, 0, rect.height);
                              const nextSat = Math.round((x / rect.width) * 100);
                              const nextVal = Math.round(100 - (y / rect.height) * 100);
                              setTextPickerSat(nextSat);
                              setTextPickerVal(nextVal);
                              const rgb = hsvToRgb(textPickerHue, nextSat, nextVal);
                              const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                              updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { color: hex });
                              event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerMove={(event) => {
                              if (!textPickerDragRef.current) return;
                              if (!activeSlide || !activeSelectedTextLayer || !textColorSquareRef.current) return;
                              const rect = textColorSquareRef.current.getBoundingClientRect();
                              const x = clampNumber(event.clientX - rect.left, 0, rect.width);
                              const y = clampNumber(event.clientY - rect.top, 0, rect.height);
                              const nextSat = Math.round((x / rect.width) * 100);
                              const nextVal = Math.round(100 - (y / rect.height) * 100);
                              setTextPickerSat(nextSat);
                              setTextPickerVal(nextVal);
                              const rgb = hsvToRgb(textPickerHue, nextSat, nextVal);
                              const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                              updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { color: hex });
                            }}
                            onPointerUp={(event) => {
                              textPickerDragRef.current = false;
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }}
                            onPointerLeave={() => {
                              textPickerDragRef.current = false;
                            }}
                          >
                            <div className="sf-color-square-white" />
                            <div className="sf-color-square-black" />
                            <div
                              className="sf-color-thumb"
                              style={{
                                left: `${textPickerSat}%`,
                                top: `${100 - textPickerVal}%`,
                              }}
                            />
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={360}
                            value={textPickerHue}
                            onChange={(event) => {
                              if (!activeSlide || !activeSelectedTextLayer) return;
                              const nextHue = Number(event.target.value);
                              setTextPickerHue(nextHue);
                              const rgb = hsvToRgb(nextHue, textPickerSat, textPickerVal);
                              const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                              updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { color: hex });
                              setTextHexInput(hex.replace('#', ''));
                            }}
                            className="sf-color-hue"
                            aria-label="Hue"
                            disabled={!activeSlide || !activeSelectedTextLayer}
                          />
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-md border border-charcoal/60 shadow-inner"
                              style={{ backgroundColor: activeTextColor }}
                              aria-hidden="true"
                            />
                            <div className="sf-color-hex">
                              <span className="text-[10px] font-semibold text-vanilla/60">#</span>
                              <input
                                type="text"
                                value={textHexInput}
                                onChange={(event) => {
                                  if (!activeSlide || !activeSelectedTextLayer) return;
                                  const nextValue = event.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                                  setTextHexInput(nextValue);
                                  const normalized = normalizeHexInput(nextValue);
                                  if (!normalized) return;
                                  const rgb = hexToRgb(normalized);
                                  if (!rgb) return;
                                  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                                  setTextPickerHue(hsv.h);
                                  setTextPickerSat(hsv.s);
                                  setTextPickerVal(hsv.v);
                                  updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { color: normalized });
                                }}
                                onBlur={() => {
                                  const normalized = normalizeHexInput(textHexInput) ?? activeTextColor;
                                  setTextHexInput(normalized.replace('#', ''));
                                }}
                                className="sf-color-hex-input"
                                inputMode="text"
                                autoCapitalize="characters"
                                spellCheck={false}
                                aria-label="Hex color"
                                disabled={!activeSlide || !activeSelectedTextLayer}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {(brandColors.length ? brandColors : defaultTextPalette).slice(0, 8).map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              if (!activeSlide || !activeSelectedTextLayer) return;
                              updateTextLayer(activeSlide.id, activeSelectedTextLayer.id, { color });
                            }}
                            className={`h-8 rounded-md border transition-colors ${
                              (activeSelectedTextLayer?.color ?? '') === color
                                ? 'border-pacific/80 ring-2 ring-pacific/30'
                                : 'border-charcoal/50 hover:border-pacific/40'
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select ${color}`}
                            disabled={!activeSlide || !activeSelectedTextLayer}
                          />
                        ))}
                      </div>
                      {!brandColors.length && (
                        <p className="mt-2 text-[11px] text-vanilla/50">
                          Tip: set your Brand Profile to use your brand palette here.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!activeSlide || !activeSelectedTextLayer}
                      onClick={() => {
                        if (!activeSlide || !activeSelectedTextLayer) return;
                        removeTextLayer(activeSlide.id, activeSelectedTextLayer.id);
                      }}
                      className="sf-btn-secondary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {activeTool === 'brand' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="sf-label mb-0">Saved profile</label>
                      <Link
                        to="/brand-profile"
                        className="inline-flex items-center rounded-md border border-charcoal/50 bg-surface-alt px-2 py-1 text-[11px] font-semibold text-vanilla/70 hover:bg-surface-muted hover:text-vanilla"
                      >
                        Brand Profile
                      </Link>
                    </div>
                    <div ref={brandMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setBrandMenuOpen((prev) => !prev)}
                        className={`w-full inline-flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm text-vanilla/80 transition-colors ${
                          brandMenuOpen
                            ? 'border-pacific/70 bg-surface-alt'
                            : 'border-charcoal/50 bg-surface-alt hover:bg-surface-muted'
                        }`}
                        aria-haspopup="listbox"
                        aria-expanded={brandMenuOpen}
                      >
                        <span className="text-sm font-medium">
                          {activeBrandProfile?.label ?? 'Select a saved profile'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-vanilla/60" />
                      </button>
                      {brandMenuOpen && (
                        <div className="absolute z-20 mt-2 w-full rounded-md border border-charcoal/60 bg-surface shadow-soft p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBrandProfile('');
                              if (user) {
                                safeRemoveStorage(`${DEFAULT_STORAGE_KEY_PREFIX}${user.id}`);
                              }
                              setBrandMenuOpen(false);
                            }}
                            className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                              selectedBrandProfile === ''
                                ? 'bg-pacific/20 text-vanilla'
                                : 'text-vanilla/70 hover:bg-surface-muted hover:text-vanilla'
                            }`}
                            role="option"
                            aria-selected={selectedBrandProfile === ''}
                          >
                            Select a saved profile
                          </button>
                          {brandProfilesLoading && (
                            <div className="px-3 py-2 text-sm text-vanilla/60">Loading presets…</div>
                          )}
                          {!brandProfilesLoading && brandProfilesError && (
                            <div className="px-3 py-2 text-sm text-rose-200/80">{brandProfilesError}</div>
                          )}
                          {!brandProfilesLoading && !brandProfilesError && brandProfiles.length === 0 && (
                            <div className="px-3 py-2 text-sm text-vanilla/60">No saved presets yet.</div>
                          )}
                          {brandProfiles.map((profile) => {
                            const isActive = profile.id === selectedBrandProfile;
                            return (
                              <button
                                key={profile.id}
                                type="button"
                                onClick={() => {
                              setSelectedBrandProfile(profile.id);
                              if (user) {
                                safeSetStorage(`${DEFAULT_STORAGE_KEY_PREFIX}${user.id}`, profile.id);
                              }
                              setBrandMenuOpen(false);
                                }}
                                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                  isActive
                                    ? 'bg-pacific/20 text-vanilla'
                                    : 'text-vanilla/70 hover:bg-surface-muted hover:text-vanilla'
                                }`}
                                role="option"
                                aria-selected={isActive}
                              >
                                {profile.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {brandColors.length ? (
                      <div className="grid grid-cols-4 gap-2">
                        {brandColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="h-8 rounded-md border border-charcoal/50"
                            style={{ backgroundColor: color }}
                            aria-label={`Select ${color}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-charcoal/50 bg-ink/40 px-3 py-3 text-xs text-vanilla/50">
                        Select a saved profile to load brand colors.
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-charcoal/50 bg-surface-alt px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-vanilla/50">Font</p>
                        <p className="text-sm text-vanilla/80">{activeBrandFontLabel}</p>
                      </div>
                      <div className="rounded-md border border-charcoal/50 bg-surface-alt px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-vanilla/50">Style</p>
                        <p className="text-sm text-vanilla/80">{activeBrandStyleLabel}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === 'image-overlay' && (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleImageOverlayPick}
                        disabled={!activeSlide}
                        className="sf-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {activeImageOverlay ? 'Replace overlay image' : 'Upload overlay image'}
                      </button>
                      {activeImageOverlay ? (
                        <div
                          className={`rounded-md border p-2 transition-colors ${
                            imageOverlayDragActive
                              ? 'border-pacific/70 bg-pacific/15'
                              : 'border-charcoal/50 bg-surface-alt/60'
                          }`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'copy';
                            setImageOverlayDragActive(true);
                          }}
                          onDragLeave={() => setImageOverlayDragActive(false)}
                          onDrop={handleImageOverlayDrop}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={activeImageOverlay.src}
                              alt="Overlay preview"
                              className="h-10 w-10 rounded-md object-contain bg-ink/30 border border-charcoal/50"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-vanilla/70">Overlay active</p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!activeSlide) return;
                                  removeImageOverlay(activeSlide.id);
                                }}
                                className="text-[11px] text-pacific hover:text-vanilla"
                              >
                                Remove overlay
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`rounded-md border px-3 py-3 text-xs transition-colors ${
                            imageOverlayDragActive
                              ? 'border-pacific/70 bg-pacific/15 text-vanilla'
                              : 'border-dashed border-charcoal/50 bg-ink/40 text-vanilla/50'
                          }`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'copy';
                            setImageOverlayDragActive(true);
                          }}
                          onDragLeave={() => setImageOverlayDragActive(false)}
                          onDrop={handleImageOverlayDrop}
                        >
                          Upload a transparent PNG or logo to place on the image.
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="sf-label">Size</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={
                          activeImageOverlay
                            ? Math.max(
                                0,
                                Math.min(
                                  100,
                                  Math.round(((activeImageOverlay.sizePercent - 15) / 85) * 100)
                                )
                              )
                            : 0
                        }
                        onChange={(event) => {
                          if (!activeSlide || !activeImageOverlay) return;
                          const sliderValue = Number(event.target.value);
                          const nextSize = Math.round(15 + (sliderValue / 100) * 85);
                          updateImageOverlay(activeSlide.id, { sizePercent: nextSize }, 'debounced');
                        }}
                        className="w-full accent-pacific"
                        disabled={!activeSlide || !activeImageOverlay}
                      />
                      <div className="mt-1 text-xs text-vanilla/50">
                        {activeImageOverlay ? Math.max(15, Math.min(100, Math.round(activeImageOverlay.sizePercent))) : 15}%
                      </div>
                    </div>

                    <div>
                      <label className="sf-label">Placement</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'top-left', label: 'Top left' },
                          { id: 'top-center', label: 'Top center' },
                          { id: 'top-right', label: 'Top right' },
                          { id: 'middle-left', label: 'Middle left' },
                          { id: 'center', label: 'Center' },
                          { id: 'middle-right', label: 'Middle right' },
                          { id: 'bottom-left', label: 'Bottom left' },
                          { id: 'bottom-center', label: 'Bottom center' },
                          { id: 'bottom-right', label: 'Bottom right' },
                        ] as const
                      ).map((option) => {
                        const isActive = activeImageOverlay?.placement === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              if (!activeSlide || !activeImageOverlay) return;
                              updateImageOverlay(activeSlide.id, { placement: option.id }, 'immediate');
                            }}
                            className={`flex h-10 items-center justify-center rounded-md border px-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                              isActive
                                ? 'border-pacific/80 bg-gradient-to-br from-pacific/30 via-surface-alt to-pacific/60 text-vanilla shadow-[0_0_0_2px_rgba(64,160,178,0.8)]'
                                : 'border-charcoal/50 bg-surface-alt/70 text-vanilla/70 hover:border-pacific/70 hover:bg-pacific/25 hover:text-vanilla'
                            }`}
                            aria-label={option.label}
                            title={option.label}
                            aria-pressed={isActive}
                            disabled={!activeSlide || !activeImageOverlay}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    </div>
                  </div>
                )}

                {activeTool === 'ai-edit' && (
                  <div className="space-y-2">
                    <div>
                      <label className="sf-label">Optional instructions</label>
                      <textarea
                        value={aiPrompt}
                        onChange={(event) => setAiPrompt(event.target.value)}
                        placeholder="Describe how you want this image refined..."
                        className="sf-input min-h-[120px] resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void handleAiEditGenerate();
                      }}
                      disabled={!activeSlideImageSrc || aiEditWorking || !aiPrompt.trim()}
                      className="sf-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {aiEditWorking ? 'Generating…' : 'Generate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiPrompt('')}
                      className="sf-btn-secondary w-full"
                      disabled={aiEditWorking || !aiPrompt.trim()}
                    >
                      Clear
                    </button>
                    <div className="rounded-md border border-charcoal/50 bg-surface-alt/60 px-3 py-2 text-[11px] text-vanilla/60">
                      This tool uses AI credits.
                    </div>
                  </div>
                )}
              </div>

              {navCaption && (
                <div className="rounded-lg border border-charcoal/50 bg-surface-alt/60 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-vanilla/50">Caption handoff</p>
                  <p className="mt-2 max-h-20 overflow-hidden text-sm text-vanilla/70">{navCaption}</p>
                </div>
              )}

              </section>
          </div>
        </div>
      </main>
      <MediaLibraryModal
        isOpen={showLibraryModal}
        initialTab={libraryTab}
        onClose={() => setShowLibraryModal(false)}
        onSelectImage={(image) => {
          handleLibraryImageSelect(image);
          setShowLibraryModal(false);
        }}
      />
      {toast && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center px-4 z-50">
          <div className="rounded-md bg-surface border border-charcoal/50 px-4 py-3 text-sm text-vanilla shadow-soft">
            {toast}
          </div>
        </div>
      )}
      {showPageDots && <PageDots total={TOTAL_APP_PAGES} active={5} />}
    </div>
  );
}
