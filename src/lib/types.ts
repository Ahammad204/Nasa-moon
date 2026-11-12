export type MissionStatus =
  | 'upcoming'
  | 'in_flight'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled';

export type DatePrecision = 'day' | 'month' | 'year';

export interface Source {
  label: string;
  url: string;
  accessed: string;
}

export interface Payload {
  name: string;
  organization: string | null;
  purpose: string | null;
  type: string | null;
}

export interface LandingSite {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  coordinatesApproximate: boolean;
}

export interface Mission {
  id: string;
  name: string;
  taskOrder: string | null;
  // D-013: null when the vendor is unannounced (cs-8, cx-2).
  provider: string | null;
  lander: string | null;
  status: MissionStatus;
  launchDate: string | null;
  launchDatePrecision: DatePrecision | null;
  landingDate: string | null;
  landingDatePrecision: DatePrecision | null;
  landingSite: LandingSite | null;
  payloads: Payload[];
  payloadCountReported: number | null;
  objective: string | null;
  outcomeSummary: string | null;
  notes: string | null;
  sources: Source[];
  lastVerified: string;
}

/**
 * South-pole site (Phase 4): a NASA Artemis III candidate landing region
 * or a named south-pole feature (e.g. Shackleton crater).
 *
 * DATA HONESTY: coordinates come from a NASA publication or the USGS
 * Gazetteer of Planetary Nomenclature, or are null when no such source
 * could be verified. Every coordinate is approximate (feature centre or
 * published region centre) — never survey-grade, never guessed.
 */
export type SouthPoleSiteKind = 'artemis-candidate' | 'crater';

export interface SouthPoleSite {
  /** Unique id, e.g. "sp-faustini-rim-a". */
  id: string;
  name: string;
  kind: SouthPoleSiteKind;
  /** Selenographic latitude, degrees; null when unverified. */
  latitude: number | null;
  /** Selenographic longitude, east-positive degrees; null when unverified. */
  longitude: number | null;
  /** True when coordinates are an approximate feature/region centre. */
  coordinatesApproximate: boolean;
  /** Short note, e.g. what the region is / why coordinates are null. */
  notes: string | null;
  sources: Source[];
  lastVerified: string;
}
