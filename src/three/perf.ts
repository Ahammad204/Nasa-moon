import { setQuality } from './sceneStore';

// Rolling FPS guard: degrades scene quality instead of shipping lag (brief).
// tier drop under 30 fps, fallback-to-2D under 24 fps sustained for 3s.
export class FpsGuard {
  private frames = 0;
  private windowStart = 0;
  private lowSince = 0;

  tick(t: number) {
    if (!this.windowStart) this.windowStart = t;
    this.frames += 1;
    const elapsed = t - this.windowStart;
    if (elapsed < 1000) return;
    const fps = (this.frames * 1000) / elapsed;
    this.frames = 0;
    this.windowStart = t;

    if (fps < 24) {
      if (!this.lowSince) this.lowSince = t;
      else if (t - this.lowSince > 3000) setQuality(0);
    } else {
      this.lowSince = 0;
      if (fps < 30) setQuality(1);
    }
  }
}
