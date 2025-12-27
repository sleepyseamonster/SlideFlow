export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const hexToRgb = (hex: string) => {
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

export const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();

export const normalizeHexInput = (value: string): string | null => {
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

export const rgbToHsv = (r: number, g: number, b: number) => {
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

export const hsvToRgb = (h: number, s: number, v: number) => {
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
