// Site hazard briefings (Science Context, Phase 3).
//
// Generic context cards, NOT per-site risk scores — no hazard rating is
// invented for any site. The only site-specific numbers are the computed
// illumination geometry (longest dark stretch, sunlit %) from the existing
// astro engine, shown beside the thermal and static-charge cards.
import hazardsData from '../data/hazards.json';

export interface Hazard {
  id: string;
  icon: string;
  title: string;
  summary: string;
  sourceIds: string[];
  lastVerified: string;
}

export const hazards: Hazard[] = hazardsData as unknown as Hazard[];
