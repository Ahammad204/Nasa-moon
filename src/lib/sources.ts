// Research sources registry (Science Context, Phase 1).
//
// Every factual claim added by the Science Context layer cites one of these
// sources by id. The list is deliberately small and fixed: only the sources
// Boss approved. Never add a Facebook reel, a blog, or Britannica here.
import sourcesData from '../data/sources.json';

export type SourceType = 'NASA page' | 'video' | 'university' | 'lab';

export interface ResearchSource {
  id: string;
  shortLabel: string;
  title: string;
  url: string;
  publisher: string;
  type: SourceType;
  accessed: string;
}

// The cast is safe because validate.test.ts checks every record against
// the schema (same pattern as missions.ts / sites.ts).
export const researchSources: ResearchSource[] = sourcesData as unknown as ResearchSource[];

export function getSourceById(id: string): ResearchSource | undefined {
  return researchSources.find((s) => s.id === id);
}

/** Throws for an unknown id — a missing source is a data bug, not a silent gap. */
export function requireSource(id: string): ResearchSource {
  const s = getSourceById(id);
  if (!s) throw new Error(`Unknown research source id: ${id}`);
  return s;
}
