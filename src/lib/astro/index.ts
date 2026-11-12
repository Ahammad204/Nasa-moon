/**
 * Sun & Earth Site Navigator — astronomy core.
 * Pure TypeScript, no React. See subPoints.ts for the method and limits.
 */
export { getSubEarthPoint, getSubSolarPoint } from './subPoints';
export type { SelenographicPoint } from './subPoints';
export {
  SUN_SEMI_DIAMETER_DEG,
  assertSite,
  getSunEarthState,
  subPointToDirection,
} from './geometry';
export type { BodyState, Site, SunEarthState } from './geometry';
export {
  DEFAULT_EVENT_WINDOW_DAYS,
  findNextEvent,
  timeToEarthset,
  timeToSunset,
} from './events';
export type { EventKind, FindNextEventOptions, SkyBody } from './events';
export { clearAstroCache, computeWindow } from './window';
export type { WindowSample, WindowStats } from './window';
