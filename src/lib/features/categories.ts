// Lunar Feature Explorer — category metadata (Phase 3b, UI).
//
// One accent colour per category, used consistently across the legend,
// filter chips, map markers and charts. Colour is never the only signal:
// every coloured element also carries the category name as text.
import type { FeatureCategory } from './engine';

export const CATEGORY_ORDER: FeatureCategory[] = [
  'Crater',
  'Maria',
  'Mountain',
  'Valley',
  'Plain',
  'Other',
];

export const CATEGORY_COLORS: Record<FeatureCategory, string> = {
  Crater: '#38bdf8', // sky — the app accent
  Maria: '#a78bfa', // violet
  Mountain: '#fbbf24', // amber
  Valley: '#34d399', // emerald
  Plain: '#fb7185', // rose
  Other: '#94a3b8', // slate
};

export function isFeatureCategory(value: string): value is FeatureCategory {
  return (CATEGORY_ORDER as string[]).includes(value);
}
