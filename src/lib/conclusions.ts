// Research Library conclusions (Science Context, Phase 1).
//
// Each conclusion is one sentence in our own words, tied to the sources
// that support it and to the app page where the fact is used. New
// conclusions are added by later phases alongside the pages that use them.
import conclusionsData from '../data/conclusions.json';

export interface LibraryConclusion {
  id: string;
  text: string;
  sourceIds: string[];
  usedIn: { label: string; path: string };
}

// The cast is safe because validate.test.ts checks every record against
// the schema (same pattern as missions.ts / sites.ts).
export const conclusions: LibraryConclusion[] =
  conclusionsData as unknown as LibraryConclusion[];
