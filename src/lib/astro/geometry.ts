/**
 * Horizon coordinates of the Sun and Earth for a lunar landing site.
 *
 * For a site (latitude phi, longitude lambda) and a body whose sub-point
 * is (phi_b, lambda_b):
 *   elevation = asin( sin phi * sin phi_b
 *                    + cos phi * cos phi_b * cos(lambda - lambda_b) )
 *   azimuth   = atan2( sin(lambda - lambda_b),
 *                      cos phi * tan(phi_b) - sin phi * cos(lambda - lambda_b) )
 *               + 180 deg, normalized to 0..360.
 * Azimuth is clockwise from true north (0 = north, 90 = east, 180 = south,
 * 270 = west). The +180 deg is the standard north-based correction to the
 * atan2 hour-angle formula (which is natively south-based); it is verified
 * by the Apollo 11 test — the Sun stood low in the EAST at landing.
 *
 * Sun-disc mode: the Sun's apparent semi-diameter as seen from the Moon is
 * about 0.27 deg, so the upper limb's elevation is centre + 0.27 deg.
 * "Sun up" uses the centre by default and the upper limb when sunDisc is on.
 */
import { getSubEarthPoint, getSubSolarPoint } from './subPoints';
import type { SelenographicPoint } from './subPoints';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
/** Apparent semi-diameter of the Sun as seen from the Moon (deg). */
export const SUN_SEMI_DIAMETER_DEG = 0.27;

export interface Site {
  /** Selenographic latitude, degrees (-90..90). */
  latitude: number;
  /** Selenographic longitude, degrees east-positive (-180..180). */
  longitude: number;
}

export interface BodyState {
  /** Degrees above the local ideal horizon (-90..90). */
  elevation: number;
  /** Degrees clockwise from true north (0..360). */
  azimuth: number;
  /** True when the body is above the ideal horizon. */
  up: boolean;
}

export interface SunEarthState {
  sun: BodyState;
  earth: BodyState;
  /** Elevation of the Sun's upper limb (centre + 0.27 deg). */
  sunUpperLimbElevation: number;
}

export function assertSite(site: Site): void {
  if (!Number.isFinite(site.latitude) || site.latitude < -90 || site.latitude > 90) {
    throw new RangeError(`latitude must be -90..90, got ${site.latitude}`);
  }
  if (!Number.isFinite(site.longitude) || site.longitude < -180 || site.longitude > 180) {
    throw new RangeError(`longitude must be -180..180, got ${site.longitude}`);
  }
}

function horizonCoords(site: Site, sub: SelenographicPoint): { elevation: number; azimuth: number } {
  const phi = site.latitude * DEG_TO_RAD;
  const lambda = site.longitude * DEG_TO_RAD;
  const phiB = sub.latitude * DEG_TO_RAD;
  const lambdaB = sub.longitude * DEG_TO_RAD;
  const dLon = lambda - lambdaB;
  const sinEl =
    Math.sin(phi) * Math.sin(phiB) + Math.cos(phi) * Math.cos(phiB) * Math.cos(dLon);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl))) * RAD_TO_DEG;
  // atan2 hour-angle formula is natively south-based; +180 makes it north-based.
  let azimuth =
    Math.atan2(
      Math.sin(dLon),
      Math.cos(phi) * Math.tan(phiB) - Math.sin(phi) * Math.cos(dLon),
    ) *
      RAD_TO_DEG +
    180;
  azimuth = ((azimuth % 360) + 360) % 360;
  return { elevation, azimuth };
}

/**
 * Sun and Earth azimuth/elevation at a lunar site for one UTC instant.
 * When sunDisc is true, "sun up" is judged by the upper limb instead of
 * the centre (sunrise/sunset for power planning).
 */
export function getSunEarthState(
  site: Site,
  date: Date,
  sunDisc = false,
): SunEarthState {
  assertSite(site);
  const sunSub = getSubSolarPoint(date);
  const earthSub = getSubEarthPoint(date);
  const sun = horizonCoords(site, sunSub);
  const earth = horizonCoords(site, earthSub);
  const upperLimb = sun.elevation + SUN_SEMI_DIAMETER_DEG;
  return {
    sun: { ...sun, up: (sunDisc ? upperLimb : sun.elevation) >= 0 },
    earth: { ...earth, up: earth.elevation >= 0 },
    sunUpperLimbElevation: upperLimb,
  };
}

/** Moon-fixed unit direction (x/y in the lunar equatorial plane, z = pole) for a sub-point. */
export function subPointToDirection(sub: SelenographicPoint): { x: number; y: number; z: number } {
  const lat = sub.latitude * DEG_TO_RAD;
  const lon = sub.longitude * DEG_TO_RAD;
  return {
    x: Math.cos(lat) * Math.cos(lon),
    y: Math.cos(lat) * Math.sin(lon),
    z: Math.sin(lat),
  };
}
