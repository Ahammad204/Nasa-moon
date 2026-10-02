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
