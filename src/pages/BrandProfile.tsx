import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  SwatchBook,
  Palette,
  Type,
  Check,
  Sparkles,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { DEFAULT_BODY_FONT_ID, DEFAULT_PRIMARY_FONT_ID, getFont, getFontOptions } from '../lib/fonts';

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

const styleOptions = [
  {
    value: 'minimalist',
    title: 'Minimal',
    description: 'Clean, calm backgrounds that keep focus on your message. Ideal for education, clarity, and structured content.',
    image: '/Minimal%20Card.png',
  },
  {
    value: 'bold',
    title: 'Bold',
    description: 'High-contrast backgrounds built to command attention. Ideal for launches, announcements, and standout moments.',
    image: '/Bold%20Card.png',
  },
  {
    value: 'elegant',
    title: 'Elegant',
    description: 'Refined and flowing, premium backgrounds with subtle depth. Ideal for authority, trust, and polished brand presence.',
    image: '/Elegant.png',
  },
] as const;

type StyleValue = (typeof styleOptions)[number]['value'];

type HoveredStyleState = {
  value: StyleValue;
  x: number;
  y: number;
};

type BrandProfilePreset = {
  id: string;
  name: string | null;
  palette?: Partial<typeof defaultPalette> | null;
  fonts?: { primary?: string; body?: string; secondary?: string } | null;
  defaults?: { style?: StyleValue | string } | null;
  is_default?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const HoverTooltip = ({ hoveredStyle }: { hoveredStyle: HoveredStyleState }) => {
  const option = styleOptions.find((entry) => entry.value === hoveredStyle.value);
  if (!option) return null;
  return (
        <div
          className="pointer-events-none fixed z-[1000]"
          style={{
            left: hoveredStyle.x + 18,
            top: hoveredStyle.y - 96,
          }}
        >
      <div className="max-w-[160px] rounded-xl border border-charcoal/60 bg-surface p-3 shadow-soft">
        <p className="text-xs uppercase tracking-[0.3em] text-vanilla/60">{option.title}</p>
        <img
          src={option.image}
          alt={`${option.title} preview`}
          className="mt-2 h-24 w-24 rounded-lg border border-charcoal/50 object-cover"
        />
      </div>
    </div>
  );
};

const defaultPalette = {
  primary: '#3BB0B2',
  secondary: '#454440',
  accent1: '#EDE0C9',
  accent2: '#31666A',
};

type PaletteKey = keyof typeof defaultPalette;

const PaletteColorPicker = ({
  color,
  onChange,
}: {
  color: string;
  onChange: (next: string) => void;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerHue, setPickerHue] = useState(0);
  const [pickerSat, setPickerSat] = useState(100);
  const [pickerVal, setPickerVal] = useState(100);
  const [hexInput, setHexInput] = useState(color.replace('#', ''));
  const squareRef = useRef<HTMLDivElement | null>(null);
  const squareDragRef = useRef(false);

  useEffect(() => {
    const normalized = normalizeHexInput(color);
    if (!normalized) return;
    const rgb = hexToRgb(normalized);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setPickerHue(hsv.h);
    setPickerSat(hsv.s);
    setPickerVal(hsv.v);
    setHexInput(normalized.replace('#', ''));
  }, [color]);

  const applyColorFromHSV = (nextHue: number, nextSat: number, nextVal: number) => {
    const rgb = hsvToRgb(nextHue, nextSat, nextVal);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    onChange(hex);
    setHexInput(hex.replace('#', ''));
  };

  const handleSquarePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!squareRef.current) return;
    squareDragRef.current = true;
    const rect = squareRef.current.getBoundingClientRect();
    const x = clampNumber(event.clientX - rect.left, 0, rect.width);
    const y = clampNumber(event.clientY - rect.top, 0, rect.height);
    const nextSat = Math.round((x / rect.width) * 100);
    const nextVal = Math.round(100 - (y / rect.height) * 100);
    setPickerSat(nextSat);
    setPickerVal(nextVal);
    applyColorFromHSV(pickerHue, nextSat, nextVal);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSquareMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!squareDragRef.current || !squareRef.current) return;
    const rect = squareRef.current.getBoundingClientRect();
    const x = clampNumber(event.clientX - rect.left, 0, rect.width);
    const y = clampNumber(event.clientY - rect.top, 0, rect.height);
    const nextSat = Math.round((x / rect.width) * 100);
    const nextVal = Math.round(100 - (y / rect.height) * 100);
    setPickerSat(nextSat);
    setPickerVal(nextVal);
    applyColorFromHSV(pickerHue, nextSat, nextVal);
  };

  const handleSquareUp = (event: React.PointerEvent<HTMLDivElement>) => {
    squareDragRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg border border-charcoal/60 shadow-inner"
            style={{ backgroundColor: color }}
          />
          <button
            type="button"
            onClick={() => setPickerOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-md border border-charcoal/50 bg-surface-alt px-2 py-1 text-[11px] font-semibold text-vanilla/80 hover:bg-surface-muted hover:text-vanilla"
          >
            {pickerOpen ? 'Hide picker' : 'Pick color'}
          </button>
        </div>
      </div>
      {pickerOpen && (
        <div className="space-y-3 rounded-xl border border-charcoal/60 bg-surface-alt/70 p-3">
          <div
            ref={squareRef}
            className="sf-color-square"
            style={{ backgroundColor: `hsl(${pickerHue} 100% 50%)` }}
            onPointerDown={handleSquarePointer}
            onPointerMove={handleSquareMove}
            onPointerUp={handleSquareUp}
            onPointerLeave={() => {
              squareDragRef.current = false;
            }}
          >
            <div className="sf-color-square-white" />
            <div className="sf-color-square-black" />
            <div
              className="sf-color-thumb"
              style={{
                left: `${pickerSat}%`,
                top: `${100 - pickerVal}%`,
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={pickerHue}
            onChange={(event) => {
              const nextHue = Number(event.target.value);
              setPickerHue(nextHue);
              applyColorFromHSV(nextHue, pickerSat, pickerVal);
            }}
            className="sf-color-hue"
            aria-label="Hue"
          />
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-md border border-charcoal/60 shadow-inner"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <div className="sf-color-hex">
              <span className="text-[10px] font-semibold text-vanilla/60">#</span>
              <input
                type="text"
                value={hexInput}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                  setHexInput(nextValue.toUpperCase());
                  const normalized = normalizeHexInput(nextValue);
                  if (!normalized) return;
                  const rgb = hexToRgb(normalized);
                  if (!rgb) return;
                  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                  setPickerHue(hsv.h);
                  setPickerSat(hsv.s);
                  setPickerVal(hsv.v);
                  onChange(normalized);
                }}
                onBlur={() => {
                  const normalized = normalizeHexInput(hexInput) ?? color;
                  setHexInput((normalized ?? '#000000').replace('#', ''));
                }}
                className="sf-color-hex-input"
                inputMode="text"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Hex color"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function BrandProfile() {
  const { user } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState<(typeof styleOptions)[number]['value']>('minimalist');
  const [palette, setPalette] = useState(defaultPalette);
  const [primaryFontId, setPrimaryFontId] = useState(DEFAULT_PRIMARY_FONT_ID);
  const [bodyFontId, setBodyFontId] = useState(DEFAULT_BODY_FONT_ID);
  const [hoveredStyle, setHoveredStyle] = useState<HoveredStyleState | null>(null);
  const [presets, setPresets] = useState<BrandProfilePreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const presetMessageTimeout = useRef<number | null>(null);
  const [hasDefaultColumn, setHasDefaultColumn] = useState<boolean | null>(null);

  const primaryFont = useMemo(() => getFont(primaryFontId), [primaryFontId]);
  const bodyFont = useMemo(() => getFont(bodyFontId || primaryFontId), [bodyFontId, primaryFontId]);

  const primaryOptions = useMemo(() => getFontOptions('primary'), []);
  const bodyOptions = useMemo(() => getFontOptions('body'), []);

  const resolveStyleValue = (value?: string | null): StyleValue => {
    const match = styleOptions.find((option) => option.value === value);
    return match?.value ?? 'minimalist';
  };

  useEffect(() => {
    if (!user) {
      setPresets([]);
      setLoadingPresets(false);
      setPresetError(null);
      return;
    }
    let cancelled = false;
    const loadPresets = async () => {
      setLoadingPresets(true);
      setPresetError(null);
      try {
        const { data, error } = await supabase
          .from('brand_profile')
          .select('id, name, palette, fonts, defaults, is_default, created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        if (!cancelled && !error) {
          setHasDefaultColumn(true);
          setPresets((data as BrandProfilePreset[]) ?? []);
        } else if (!cancelled && error) {
          if (error.message?.includes('column brand_profile.is_default does not exist')) {
            setHasDefaultColumn(false);
            const fallback = await supabase
              .from('brand_profile')
              .select('id, name, palette, fonts, defaults, created_at, updated_at')
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false });
            if (!cancelled) {
              setPresets((fallback.data as BrandProfilePreset[]) ?? []);
            }
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Failed to load presets.';
          setPresetError(message);
          setPresets([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingPresets(false);
        }
      }
    };
    void loadPresets();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (activePresetId) return;
    if (!presets.length) return;
    const defaultPreset = presets.find((preset) => preset.is_default);
    if (defaultPreset) {
      applyPreset(defaultPreset, { persist: false });
      return;
    }
    const stored = safeGetStorage(`${DEFAULT_STORAGE_KEY_PREFIX}${user.id}`);
    if (!stored) return;
    const match = presets.find((preset) => preset.id === stored);
    if (match) {
      applyPreset(match, { persist: false });
    }
  }, [activePresetId, presets, user]);

  useEffect(() => {
    return () => {
      if (presetMessageTimeout.current) {
        window.clearTimeout(presetMessageTimeout.current);
      }
    };
  }, []);

  const setDefaultPreset = async (presetId: string) => {
    if (!user || hasDefaultColumn === false) return;
    const { error: clearError } = await supabase
      .from('brand_profile')
      .update({ is_default: false })
      .eq('user_id', user.id);
    if (clearError) {
      console.warn('Failed to clear default brand profile:', clearError);
      return;
    }
    const { error: setError } = await supabase
      .from('brand_profile')
      .update({ is_default: true })
      .eq('id', presetId)
      .eq('user_id', user.id);
    if (setError) {
      console.warn('Failed to set default brand profile:', setError);
      return;
    }
    setPresets((prev) => prev.map((item) => ({ ...item, is_default: item.id === presetId })));
  };

  const applyPreset = (preset: BrandProfilePreset, options: { persist?: boolean } = {}) => {
    const nextPalette = { ...defaultPalette, ...(preset.palette ?? {}) };
    const nextFonts = preset.fonts ?? {};
    const nextPrimary = nextFonts.primary ?? DEFAULT_PRIMARY_FONT_ID;
    const nextBody = nextFonts.body ?? nextFonts.secondary ?? DEFAULT_BODY_FONT_ID;
    setPalette(nextPalette);
    setPrimaryFontId(nextPrimary);
    setBodyFontId(nextBody);
    setSelectedStyle(resolveStyleValue(preset.defaults?.style));
    setActivePresetId(preset.id);
    if (user) {
      safeSetStorage(`${DEFAULT_STORAGE_KEY_PREFIX}${user.id}`, preset.id);
      if (options.persist !== false) {
        void setDefaultPreset(preset.id);
      }
    }
  };

  const handleSavePreset = async () => {
    if (!user) {
      setPresetError('Please sign in to save presets.');
      setPresetMessage(null);
      return;
    }
    const trimmedName = presetName.trim();
    if (!trimmedName) {
      setPresetError('Add a preset name before saving.');
      setPresetMessage(null);
      return;
    }
    const { error: clearError } = await supabase
      .from('brand_profile')
      .update({ is_default: false })
      .eq('user_id', user.id);
    if (clearError) {
      setPresetError(clearError.message);
      setSavingPreset(false);
      return;
    }
    setSavingPreset(true);
    setPresetError(null);
    const payload: Record<string, unknown> = {
      user_id: user.id,
      name: trimmedName,
      palette,
      fonts: {
        primary: primaryFontId,
        body: bodyFontId || primaryFontId,
      },
      defaults: {
        style: selectedStyle,
      },
    };
    if (hasDefaultColumn !== false) {
      payload.is_default = true;
    }

    const { data, error } = await supabase
      .from('brand_profile')
      .insert(payload)
      .select('id, name, palette, fonts, defaults, is_default, created_at, updated_at')
      .single();

    if (error) {
      setPresetError(error.message);
      setSavingPreset(false);
      return;
    }
    if (data) {
      const savedPreset = data as BrandProfilePreset;
      setPresets((prev) => [savedPreset, ...prev.map((item) => ({ ...item, is_default: false }))]);
      setActivePresetId(savedPreset.id);
      setPresetName('');
      setPresetMessage('Preset saved!');
      safeSetStorage(`${DEFAULT_STORAGE_KEY_PREFIX}${user.id}`, savedPreset.id);
      if (presetMessageTimeout.current) {
        window.clearTimeout(presetMessageTimeout.current);
      }
      presetMessageTimeout.current = window.setTimeout(() => {
        setPresetMessage(null);
      }, 3500);
    }
    setSavingPreset(false);
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!user) return;
    setPresetError(null);
    const storageKey = `${DEFAULT_STORAGE_KEY_PREFIX}${user.id}`;
    try {
      const { error } = await supabase
        .from('brand_profile')
        .delete()
        .eq('id', presetId)
        .eq('user_id', user.id);
      if (error) throw error;
      setPresets((prev) => prev.filter((preset) => preset.id !== presetId));
      if (activePresetId === presetId) {
        setActivePresetId(null);
      }
      if (safeGetStorage(storageKey) === presetId) {
        safeRemoveStorage(storageKey);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete preset.';
      setPresetError(message);
    }
  };

  const FontDropdown = (props: {
    label: string;
    value: string;
    onChange: (next: string) => void;
    options: Array<{ id: string; name: string }>;
    allowInherit?: boolean;
    inheritLabel?: string;
    inheritValue?: string;
    help?: string;
  }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null);

    useEffect(() => {
      if (!open) return;
      const onDocClick = (event: MouseEvent) => {
        const target = event.target as Node;
        if (containerRef.current?.contains(target)) return;
        if (menuRef.current?.contains(target)) return;
        if (triggerRef.current?.contains(target)) return;
        {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const updatePosition = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setMenuRect({
          left: rect.left,
          top: rect.bottom,
          width: rect.width,
        });
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }, [open]);

    const activeId = props.value || props.inheritValue || DEFAULT_PRIMARY_FONT_ID;
    const activeFont = getFont(activeId);

    return (
      <div ref={containerRef} className="relative">
        <div className="space-y-2">
          <label className="text-sm text-vanilla/80 block">{props.label}</label>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="w-full px-3 py-2 rounded-lg border border-charcoal/60 bg-surface focus:border-pacific focus:ring-2 focus:ring-pacific/60 text-left flex items-center justify-between"
          >
            <span style={{ fontFamily: activeFont.cssFamily }}>
              {props.value ? getFont(props.value).name : props.allowInherit ? props.inheritLabel ?? 'Same as primary' : activeFont.name}
            </span>
            <span className="text-vanilla/60">▾</span>
          </button>
        </div>

        {open &&
          menuRect &&
          createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] mt-2 rounded-lg border border-charcoal/60 bg-surface shadow-soft overflow-hidden"
              style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
            >
              <div className="max-h-72 overflow-y-auto">
                {props.allowInherit && (
                  <button
                    type="button"
                    onClick={() => {
                      props.onChange('');
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      props.value === '' ? 'bg-pacific/15 text-vanilla' : 'text-vanilla/70 hover:bg-surface-muted hover:text-vanilla'
                    }`}
                  >
                    {props.inheritLabel ?? 'Same as primary'}
                  </button>
                )}
                {props.options.map((opt) => {
                  const isActive = props.value === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        props.onChange(opt.id);
                        setOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        isActive ? 'bg-pacific/15 text-vanilla' : 'text-vanilla/70 hover:bg-surface-muted hover:text-vanilla'
                      }`}
                      style={{ fontFamily: getFont(opt.id).cssFamily }}
                    >
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )}

        {props.help && <p className="mt-2 text-[11px] text-vanilla/50">{props.help}</p>}
      </div>
    );
  };

  const formatLabel = (key: string) => {
    if (key.startsWith('accent')) {
      return `Accent ${key.slice(-1)}`;
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />

      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-3">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center text-pacific hover:text-vanilla font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-vanilla">Brand Profile</h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="sf-card p-6 space-y-4 lg:col-span-3">
              <div className="flex items-center gap-3">
                <SwatchBook className="h-5 w-5 text-pacific" />
                <div>
                  <h2 className="text-xl font-semibold text-vanilla">Style</h2>
                  <p className="text-vanilla/70">Choose your brand style preset.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {styleOptions.map(({ value, title, description }) => {
                  const active = selectedStyle === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedStyle(value)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        active
                          ? 'border-pacific bg-pacific/10 shadow-soft'
                          : 'border-charcoal/50 hover:border-charcoal/70 bg-surface'
                      }`}
                      onMouseEnter={(event) => {
                        setHoveredStyle({ value, x: event.clientX, y: event.clientY });
                      }}
                      onMouseMove={(event) => {
                        setHoveredStyle({ value, x: event.clientX, y: event.clientY });
                      }}
                      onMouseLeave={() => setHoveredStyle(null)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-vanilla">{title}</h3>
                          {active && <Check className="h-4 w-4 text-pacific" />}
                        </div>
                        <p className="text-xs text-vanilla/70">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sf-card p-6 space-y-3">
              <div>
                <p className="text-sm font-semibold text-vanilla mb-1">Save this preset</p>
              </div>
              <label className="text-xs uppercase tracking-[0.2em] text-vanilla/60">Preset name</label>
              <input
                type="text"
                value={presetName}
                onChange={(event) => {
                  setPresetName(event.target.value);
                  if (presetError) setPresetError(null);
                }}
                placeholder="e.g. SlideFlow"
                className="w-full rounded-lg border border-charcoal/60 bg-surface-alt px-3 py-2 text-sm text-vanilla/90 placeholder:text-vanilla/40 focus:border-pacific focus:outline-none focus:ring-2 focus:ring-pacific/40"
              />
              <button
                type="button"
                onClick={() => {
                  void handleSavePreset();
                }}
                className="sf-btn-primary w-full justify-center"
                disabled={!user || savingPreset || !presetName.trim()}
              >
                {savingPreset ? 'Saving preset...' : 'Save preset'}
              </button>
              <div className="min-h-[20px]">
                {presetError && <p className="text-xs text-rose-200/80">{presetError}</p>}
                {!presetError && presetMessage && (
                  <p className="text-xs text-pacific/80">{presetMessage}</p>
                )}
              </div>
            </div>
          </div>
          {hoveredStyle && (
            <HoverTooltip hoveredStyle={hoveredStyle} />
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="sf-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-pacific" />
                <div>
                  <h2 className="text-xl font-semibold text-vanilla">Color palette</h2>
                  <p className="text-vanilla/70">Primary, secondary, and accent colors that stay consistent.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {(Object.entries(palette) as [PaletteKey, string][]).map(([key, value]) => (
                  <div key={key} className="p-4 rounded-xl border border-charcoal/50 bg-surface space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-vanilla">{formatLabel(key)}</span>
                      <span className="text-vanilla/70">{value}</span>
                    </div>
                    <PaletteColorPicker
                      color={value}
                      onChange={(next) =>
                        setPalette((prev) => ({
                          ...prev,
                          [key]: next,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="sf-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Type className="h-5 w-5 text-pacific" />
                <div>
                  <h2 className="text-xl font-semibold text-vanilla">Typography</h2>
                  <p className="text-vanilla/70">Choose your go-to type pair for headers and body text.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FontDropdown
                    label="Primary font"
                    value={primaryFontId}
                    onChange={setPrimaryFontId}
                    options={primaryOptions.map((f) => ({ id: f.id, name: f.name }))}
                    help="Used for headlines and emphasis."
                  />
                  <FontDropdown
                    label="Body font"
                    value={bodyFontId}
                    onChange={setBodyFontId}
                    options={bodyOptions.map((f) => ({ id: f.id, name: f.name }))}
                    allowInherit
                    inheritLabel="Same as primary"
                    inheritValue={primaryFontId}
                    help="Used for captions and smaller text."
                  />
                </div>
                <div
                  className="p-4 rounded-xl border border-charcoal/50 bg-surface-alt space-y-1.5"
                >
                  <p className="text-xs uppercase text-vanilla/60 tracking-[0.2em]">Preview</p>
                  <p className="text-lg font-semibold" style={{ fontFamily: primaryFont.cssFamily, lineHeight: 1.15 }}>
                    Consistent brand text
                  </p>
                  <p className="text-sm text-vanilla/80" style={{ fontFamily: bodyFont.cssFamily, lineHeight: 1.5 }}>
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sf-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-pacific" />
              <div>
          <h2 className="text-xl font-semibold text-vanilla">Saved Profiles</h2>
          <p className="text-vanilla/70">Select a saved preset to apply its style, palette, and fonts.</p>
              </div>
            </div>
            {loadingPresets ? (
              <div className="bg-surface rounded-lg border border-charcoal/50 p-4 text-sm text-vanilla/75">
                Loading presets...
              </div>
            ) : presets.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {presets.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  const presetStyle = resolveStyleValue(preset.defaults?.style);
                  const styleLabel = styleOptions.find((option) => option.value === presetStyle)?.title ?? 'Preset';
                  const paletteColors = Object.values({ ...defaultPalette, ...(preset.palette ?? {}) });
                  const primaryFontName = preset.fonts?.primary ? getFont(preset.fonts.primary).name : 'Primary font';
                  const bodyFontName = preset.fonts?.body
                    ? getFont(preset.fonts.body).name
                    : primaryFontName;
                  return (
                    <div
                      key={preset.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => applyPreset(preset)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          applyPreset(preset);
                        }
                      }}
                      className={`group relative rounded-xl border px-4 py-4 text-left transition-colors ${
                        isActive
                          ? 'border-pacific/80 bg-pacific/10 shadow-soft'
                          : 'border-charcoal/50 bg-surface hover:border-charcoal/70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeletePreset(preset.id);
                        }}
                        className="absolute top-2 right-2 hidden group-hover:flex items-center justify-center h-8 w-8 rounded-full bg-ink/80 text-vanilla/80 border border-charcoal/60 hover:text-vanilla hover:bg-ink/95 transition-colors"
                        aria-label="Delete saved profile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 space-y-0">
                          <p className="text-sm font-semibold text-vanilla truncate">
                            {preset.name ?? `${styleLabel} preset`}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.3em] text-vanilla/60">
                            Style: <span className="text-vanilla">{styleLabel}</span>
                          </p>
                        </div>
                        {isActive && (
                          <span className="inline-flex items-center rounded-full border border-pacific/60 bg-pacific/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-pacific/90">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {paletteColors.slice(0, 4).map((color) => (
                          <span
                            key={`${preset.id}-${color}`}
                            className="h-4 w-4 rounded-full border border-charcoal/50 shadow-inner"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="mt-3 grid gap-1 text-xs text-vanilla/60">
                        <p>
                          Primary: <span className="font-semibold text-vanilla">{primaryFontName}</span>
                        </p>
                        <p>
                          Body: <span className="font-semibold text-vanilla">{bodyFontName}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-surface rounded-lg border border-charcoal/50 p-4 text-sm text-vanilla/75">
                No presets yet. Save a preset to see it here.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
