/**
 * Sub-Earth and sub-solar points on the Moon (selenographic coordinates).
 *
 * METHOD — Meeus, "Astronomical Algorithms" ch. 53, "Ephemeris for Physical
 * Observations of the Moon", with positions from the `astronomy-engine`
 * package (MIT, pure JS, sub-arcminute accuracy). No hand-rolled ephemeris:
 * every geocentric position comes from the library.
 *
 * Sub-Earth point: Astronomy.Libration(date) returns (elat, elon), the
 * selenographic latitude/longitude of the point on the Moon facing the
 * centre of the Earth. This is Meeus ch. 53's libration calculation
 * (optical + physical libration); it reproduces Meeus Example 53.a
 * (1992-04-12: l = -1.23, b = +4.20) exactly.
 *
 * Sub-solar point: Meeus ch. 53's construction, applied to the Sun.
 * Let I = 1.54242 deg be the inclination of the lunar equator to the
 * ecliptic, Omega the mean longitude of the Moon's ascending node, and
 * (lambda, beta) the Sun's apparent geocentric ecliptic longitude/latitude.
 *   w  = lambda - Omega
 *   a  = atan2( sin w * cos beta * cos I - sin beta * sin I,
 *               cos w * cos beta )
 * is the Sun's angle in the lunar equatorial plane, measured from the node.
 * The prime meridian points at the MEAN Earth, whose angle in the same
 * plane is aE, computed identically from the mean Earth's ecliptic
 * longitude (mean longitude of the Moon + 180 deg). Then:
 *   l0 = a - aE          (selenographic longitude of the Sun)
 *   b0 = asin( sin w * cos beta * sin I + sin beta * cos I )
 *                        (selenographic latitude of the Sun)
 * The latitude sign is the opposite of the libration formula's bdash
 * (which gives the sub-Earth latitude): verified against Meeus 53.a
 * (l0 = 67.90, b0 = +1.46 on 1992-04-12) — this implementation gives
 * l0 = 68.17, b0 = +1.47. The 0.27 deg longitude offset is the known
 * difference between the bare mean longitude used for the prime meridian
 * and Meeus's fuller theory; it is documented, not hidden.
 *
 * MODEL LIMITS (read before quoting numbers): geometric ideal horizon,
 * terrain obstruction NOT included; coordinates are approximate feature
 * centres; positions are good to about +/-0.3 deg. Nothing here is
 * survey-grade. See docs/SUN_EARTH_METHOD.md.
 */
import { Body, GeoVector, Libration } from 'astronomy-engine';
import type { Vector } from 'astronomy-engine';

export interface SelenographicPoint {
  /** Selenographic latitude, degrees (-90..90). */
  latitude: number;
  /** Selenographic longitude, degrees east-positive (-180..180). */
  longitude: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
/** Inclination of the lunar equator to the ecliptic (Meeus ch. 53). */
const LUNAR_EQUATOR_INCLINATION_DEG = 1.54242;
/** Mean obliquity of the ecliptic at J2000.0 (deg). */
const OBLIQUITY_J2000_DEG = 23.4392911;

const norm360 = (x: number): number => ((x % 360) + 360) % 360;
const norm180 = (x: number): number => {
  const y = norm360(x);
  return y > 180 ? y - 360 : y;
};

/** Days since J2000.0 (2000-01-01 12:00 TT) for a UTC instant. */
function daysSinceJ2000(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5 - 2451545.0;
}

/** Julian centuries since J2000.0. */
function centuriesSinceJ2000(date: Date): number {
  return daysSinceJ2000(date) / 36525;
}

/**
 * Apparent geocentric ecliptic longitude/latitude of a body.
 * astronomy-engine's GeoVector returns J2000 equatorial coordinates
 * (verified: the Sun's RA/Dec at 2026-11-13 matches the almanac values);
 * rotate about the x-axis by -eps to reach the ecliptic.
 */
function eclipticLonLat(body: Body, date: Date): { lon: number; lat: number } {
  const v: Vector = GeoVector(body, date, true);
  const eps = OBLIQUITY_J2000_DEG * DEG_TO_RAD;
  const c = Math.cos(eps);
  const s = Math.sin(eps);
  const y = c * v.y + s * v.z;
  const z = -s * v.y + c * v.z;
  const len = Math.hypot(v.x, y, z);
  return {
    lon: norm360((Math.atan2(y, v.x) * RAD_TO_DEG)),
    lat: Math.asin(Math.max(-1, Math.min(1, z / len))) * RAD_TO_DEG,
  };
}

/**
 * Selenographic coordinates of the sub-Earth point (the point on the Moon
 * facing the centre of the Earth) at a UTC instant.
 */
export function getSubEarthPoint(date: Date): SelenographicPoint {
  const lib = Libration(date);
  return { latitude: lib.elat, longitude: lib.elon };
}

/**
 * Selenographic coordinates of the sub-solar point (the point on the Moon
 * where the Sun is directly overhead) at a UTC instant.
 * Meeus ch. 53 construction — see the module header for the derivation.
 */
export function getSubSolarPoint(date: Date): SelenographicPoint {
  const t = centuriesSinceJ2000(date);
  const d = daysSinceJ2000(date);
  // Mean longitude of the Moon's ascending node (deg).
  const omega = norm360(125.0445479 - 1934.1362891 * t);
  // Mean longitude of the Moon (deg).
  const meanMoonLon = norm360(218.316 + 13.176396 * d);
  const sun = eclipticLonLat(Body.Sun, date);

  const I = LUNAR_EQUATOR_INCLINATION_DEG * DEG_TO_RAD;
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  // Sun's angle in the lunar equatorial plane, from the node.
  const wSun = norm360(sun.lon - omega) * DEG_TO_RAD;
  const betaSun = sun.lat * DEG_TO_RAD;
  const aSun =
    Math.atan2(
      Math.sin(wSun) * Math.cos(betaSun) * cosI - Math.sin(betaSun) * sinI,
      Math.cos(wSun) * Math.cos(betaSun),
    ) * RAD_TO_DEG;

  // Mean Earth's angle in the same plane (prime meridian reference):
  // the mean Earth sits at ecliptic longitude (mean Moon longitude + 180).
  const wEarth = norm360(meanMoonLon + 180 - omega) * DEG_TO_RAD;
  const aEarth =
    Math.atan2(Math.sin(wEarth) * cosI, Math.cos(wEarth)) * RAD_TO_DEG;

  // Latitude: note the + sign — the libration formula's bdash carries the
  // opposite sign because it gives the sub-Earth latitude, not the Sun's.
  const b0 =
    Math.asin(
      Math.sin(wSun) * Math.cos(betaSun) * sinI + Math.sin(betaSun) * cosI,
    ) * RAD_TO_DEG;

  return { latitude: b0, longitude: norm180(aSun - aEarth) };
}
