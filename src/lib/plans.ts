export type PlanKey = 'free' | 'starter' | 'creator' | 'studio';
export type PlanTone = 'muted' | 'standard' | 'popular' | 'premium';

export interface PlanOption {
  key: PlanKey;
  name: string;
  badge: string;
  price: string;
  cadence: string;
  creditsLabel: string;
  monthlyCredits: number;
  description: string;
  features: string[];
  tone: PlanTone;
}

export const PLAN_OPTIONS: PlanOption[] = [
  {
    key: 'free',
    name: 'Free',
    badge: 'Trial',
    price: '$0',
    cadence: '/month',
    creditsLabel: 'Trial credits',
    monthlyCredits: 0,
    description: 'Test the workflow and ship your first carousel.',
    features: [
      'Trial credits to generate a full carousel',
      'Caption + hashtag preview',
      'Export slides for sharing',
    ],
    tone: 'muted',
  },
  {
    key: 'starter',
    name: 'Starter',
    badge: 'Solo',
    price: '$9',
    cadence: '/month',
    creditsLabel: '900 monthly credits',
    monthlyCredits: 900,
    description: 'For creators posting consistently each week.',
    features: [
      '900 monthly credits (resets each month)',
      'Unlimited carousel drafts',
      'AI captions + hashtags',
      'Export updates anytime',
    ],
    tone: 'standard',
  },
  {
    key: 'creator',
    name: 'Creator',
    badge: 'Most popular',
    price: '$29',
    cadence: '/month',
    creditsLabel: '3,200 monthly credits',
    monthlyCredits: 3200,
    description: 'The go-to plan for weekly publishing.',
    features: [
      '3,200 monthly credits',
      'Brand presets + saved styles',
      'Caption + prompt library',
      'Direct posting + scheduling',
    ],
    tone: 'popular',
  },
  {
    key: 'studio',
    name: 'Studio',
    badge: 'Premium',
    price: '$79',
    cadence: '/month',
    creditsLabel: '9,000 monthly credits',
    monthlyCredits: 9000,
    description: 'High-volume workflows for teams and agencies.',
    features: [
      '9,000 monthly credits',
      'Everything in Creator',
      'Best value per credit',
      'Built for weekly multi-client output',
    ],
    tone: 'premium',
  },
] as const;

export const PLAN_MAX_CAROUSELS: Record<PlanKey, number> = {
  free: 1,
  starter: 999,
  creator: 999,
  studio: 999,
};

export const CREDIT_PACKS = [
  { price: '$10', credits: 1000, bonus: 'none' },
  { price: '$20', credits: 2200, bonus: '+10%' },
  { price: '$50', credits: 5750, bonus: '+15%' },
  { price: '$100', credits: 12000, bonus: '+20%' },
] as const;

export const PLAN_LABELS: Record<PlanKey, string> = {
  free: 'Free',
  starter: 'Starter',
  creator: 'Creator',
  studio: 'Studio',
};

export function normalizePlan(plan: string | null | undefined): PlanKey {
  const lower = (plan || '').toLowerCase();
  if (lower === 'starter') return 'starter';
  if (lower === 'creator') return 'creator';
  if (lower === 'studio') return 'studio';
  if (lower === 'premium') return 'creator';
  return 'free';
}
