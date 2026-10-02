let cached: boolean | null = null;

// Detect WebGL once on load; never assume it exists (brief).
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    cached = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}
