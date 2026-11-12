// Lunar Atlas features (Science Context, Phase 5b).
// Every number comes from the USGS Gazetteer of Planetary Nomenclature or a
// NASA Science page; unverified values are null and render as "not verified".
import atlasData from '../data/atlas.json';

export interface AtlasFeature {
  id: string;
  name: string;
  featureType: string;
  latitude: number;
  longitude: number;
  /** Diameter in km, or null when the Gazetteer does not list it. */
  diameterKm: number | null;
  /** Depth in km, or null when not verified. */
  depthKm: number | null;
  /** Age in words, or null when not verified. */
  age: string | null;
  /** USGS Gazetteer feature id, or null when the feature is not in it. */
  gazetteerFeatureId: number | null;
  narrative: string;
  note: string;
  sourceIds: string[];
  lastVerified: string;
}

export const atlasFeatures: AtlasFeature[] =
  atlasData as unknown as AtlasFeature[];

export function getAtlasFeatureById(id: string): AtlasFeature | undefined {
  return atlasFeatures.find((f) => f.id === id);
}
