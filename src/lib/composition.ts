// Composition Explorer data (Science Context, Phase 5c).
// Highlands vs maria, surface layers, and Apollo sample cards. Sample photos
// are NOT re-hosted — cards link out to the WUSTL Apollo samples page.
import compositionData from '../data/composition.json';

export interface Terrain {
  id: string;
  name: string;
  rock: string;
  chemistry: string;
  /** Age range in billions of years, as printed (e.g. "4.15–4.4"). */
  ageGa: string;
  summary: string;
  sourceIds: string[];
  lastVerified: string;
}

export interface SurfaceLayer {
  id: string;
  name: string;
  summary: string;
  sourceIds: string[];
  lastVerified: string;
}

export interface ApolloSample {
  id: string;
  rockType: string;
  note: string;
}

export interface CompositionData {
  terrains: Terrain[];
  surface: SurfaceLayer[];
  samples: ApolloSample[];
}

export const composition: CompositionData =
  compositionData as unknown as CompositionData;
