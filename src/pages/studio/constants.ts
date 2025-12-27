import type { StudioEditState } from './types';

export const TOTAL_APP_PAGES = 5;

export const HISTORY_LIMIT = 20;

export const EXPORT_SIZES: Record<StudioEditState['selectedAspect'], { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
};

export const DEFAULT_STORAGE_KEY_PREFIX = 'slideflow_default_brand_profile_';
