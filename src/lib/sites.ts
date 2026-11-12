// South-pole sites dataset (Phase 4): NASA Artemis III candidate landing
// regions near the lunar south pole, plus Shackleton crater.
//
// DATA HONESTY: every coordinate comes from a NASA publication or the USGS
// Gazetteer of Planetary Nomenclature, or is null when no such source could
// be verified. Coordinates are approximate (published region centres or
// named-feature centres) — never survey-grade, never guessed. Sites with
// null coordinates are excluded from all computations and shown with an
// explicit "no verified coordinates" note.
import sitesData from '../data/sites.json';
import type { SouthPoleSite } from './types';

// The cast is safe because validate.test.ts checks every record against
// the schema (same pattern as missions.ts).
export const southPoleSites: SouthPoleSite[] = sitesData as unknown as SouthPoleSite[];

export function getSouthPoleSiteById(id: string): SouthPoleSite | undefined {
  return southPoleSites.find((s) => s.id === id);
}

export function hasSiteCoordinates(s: SouthPoleSite): boolean {
  return s.latitude != null && s.longitude != null;
}

/** Sites that can be used for Sun/Earth computations. */
export function computableSites(): SouthPoleSite[] {
  return southPoleSites.filter(hasSiteCoordinates);
}

/** Artemis III candidate regions only (excludes Shackleton crater). */
export function artemisCandidateSites(): SouthPoleSite[] {
  return southPoleSites.filter((s) => s.kind === 'artemis-candidate');
}
