import type { BackgroundStyleKey } from '../types';

export const DEFAULT_TEXT_PALETTE = ['#FFFFFF', '#000000', '#9E9E9E', '#4A4A4A'];

export const BACKGROUND_STYLE_PROMPTS: Record<
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

export const IMAGE_STYLE_PROMPTS: Record<
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

export const normalizeStyleKey = (styleLabel?: string | null): BackgroundStyleKey | null => {
  if (!styleLabel) return null;
  const normalized = styleLabel.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith('min')) return 'minimal';
  if (normalized.startsWith('bold')) return 'bold';
  if (normalized.startsWith('eleg')) return 'elegant';
  return null;
};

const getPromptPalette = (colors: string[]) => {
  const merged = [...(colors ?? []), ...DEFAULT_TEXT_PALETTE].filter(Boolean);
  return merged.slice(0, 4);
};

export const buildStylePrompt = (styleKey: BackgroundStyleKey, colors: string[], extraPrompt: string) => {
  const palette = getPromptPalette(colors);
  const [primary, secondary, accent1, accent2] = palette;
  const stylePrompt = BACKGROUND_STYLE_PROMPTS[styleKey];
  const positive = stylePrompt.positive
    .replace('{{PRIMARY_COLOR}}', primary)
    .replace('{{SECONDARY_COLOR}}', secondary)
    .replace('{{ACCENT_1}}', accent1)
    .replace('{{ACCENT_2}}', accent2);
  const trimmedExtra = extraPrompt.trim();
  let prompt = `${positive}

Negative prompt: ${stylePrompt.negative}`;
  if (trimmedExtra) {
    prompt += `

Additional instructions: ${trimmedExtra}`;
  }
  return prompt;
};

export const buildImageStylePrompt = (styleKey: BackgroundStyleKey, colors: string[], extraPrompt: string) => {
  const palette = getPromptPalette(colors);
  const [primary, secondary, accent1, accent2] = palette;
  const stylePrompt = IMAGE_STYLE_PROMPTS[styleKey];
  const trimmedExtra = extraPrompt.trim();
  let prompt = `${stylePrompt.prompt}
Use this palette: ${primary}, ${secondary}, ${accent1}, ${accent2}.`;
  if (trimmedExtra) {
    prompt += `

${trimmedExtra}`;
  }
  return prompt;
};
