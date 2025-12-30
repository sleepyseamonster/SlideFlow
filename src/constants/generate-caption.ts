export const ASPECT_OPTIONS = [
  { value: '4:5' as const, label: '4:5 Portrait', helper: '(Recommended)' },
  { value: '1:1' as const, label: '1:1 Square', helper: 'Consistent across previews' },
];

export type AspectRatio = (typeof ASPECT_OPTIONS)[number]['value'];
