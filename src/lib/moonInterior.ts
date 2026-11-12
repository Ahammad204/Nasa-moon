// Moon interior layers (Science Context, Phase 5a).
// NASA numbers only (NASA Moon Facts + Moon Composition). Older diagrams
// show 60/100 km crust and a ~400 km core; NASA's current values are used
// here. Layer depths are not drawn to a single scale on the page — the
// cutaway is schematic, and every number below is labelled with its value.
import interiorData from '../data/moon-interior.json';

export interface InteriorLayer {
  id: string;
  name: string;
  /** Thickness in km where the layer is a shell (crust, liquid outer core). */
  thicknessKm?: number;
  /** Near-side crust thickness in km (crust only). */
  thicknessKmNear?: number;
  /** Far-side crust thickness in km (crust only). */
  thicknessKmFar?: number;
  /** Radius in km where the layer is a sphere (solid inner core). */
  radiusKm?: number;
  summary: string;
  sourceIds: string[];
  lastVerified: string;
}

export const interiorLayers: InteriorLayer[] =
  interiorData as unknown as InteriorLayer[];

export function getInteriorLayerById(id: string): InteriorLayer | undefined {
  return interiorLayers.find((l) => l.id === id);
}
