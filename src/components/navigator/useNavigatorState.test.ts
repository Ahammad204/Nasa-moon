import { describe, expect, it } from 'vitest';
import {
  CUSTOM_SITE_ID,
  DEFAULT_SITE_ID,
  customSiteLabel,
  parseCustomSite,
  resolveNavigatorSite,
} from './useNavigatorState';

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('customSiteLabel', () => {
  it('formats coordinates to 2 decimals with no invented name', () => {
    expect(customSiteLabel(9.62, -20.08)).toBe('Custom site (9.62°, -20.08°)');
    expect(customSiteLabel(-85.99, -2.93)).toBe('Custom site (-85.99°, -2.93°)');
  });
});

describe('parseCustomSite', () => {
  it('accepts a valid lat+lon pair (Copernicus)', () => {
    const site = parseCustomSite(params('lat=9.62&lon=-20.08'));
    expect(site).not.toBeNull();
    expect(site!.id).toBe(CUSTOM_SITE_ID);
    expect(site!.latitude).toBe(9.62);
    expect(site!.longitude).toBe(-20.08);
    expect(site!.name).toBe('Custom site (9.62°, -20.08°)');
    expect(site!.siteName).toBe('Custom site (9.62°, -20.08°)');
  });

  it('accepts the range edges', () => {
    expect(parseCustomSite(params('lat=90&lon=180'))).not.toBeNull();
    expect(parseCustomSite(params('lat=-90&lon=-180'))).not.toBeNull();
  });

  it('rejects out-of-range latitude', () => {
    expect(parseCustomSite(params('lat=999&lon=0'))).toBeNull();
    expect(parseCustomSite(params('lat=-90.01&lon=0'))).toBeNull();
  });

  it('rejects out-of-range longitude', () => {
    expect(parseCustomSite(params('lat=0&lon=181'))).toBeNull();
    expect(parseCustomSite(params('lat=0&lon=-180.5'))).toBeNull();
  });

  it('rejects non-numeric values', () => {
    expect(parseCustomSite(params('lat=abc&lon=0'))).toBeNull();
    expect(parseCustomSite(params('lat=9.62&lon=xyz'))).toBeNull();
    expect(parseCustomSite(params('lat=&lon=0'))).toBeNull();
  });

  it('rejects a lone lat or a lone lon', () => {
    expect(parseCustomSite(params('lat=9.62'))).toBeNull();
    expect(parseCustomSite(params('lon=-20.08'))).toBeNull();
    expect(parseCustomSite(params(''))).toBeNull();
  });
});

describe('resolveNavigatorSite', () => {
  it('prefers a valid lat+lon pair over ?site=', () => {
    const site = resolveNavigatorSite(params('site=sp-mons-mouton&lat=9.62&lon=-20.08'));
    expect(site.id).toBe(CUSTOM_SITE_ID);
    expect(site.latitude).toBe(9.62);
    expect(site.longitude).toBe(-20.08);
  });

  it('falls back to ?site= when lat+lon are invalid', () => {
    const site = resolveNavigatorSite(params('site=sp-mons-mouton&lat=999&lon=0'));
    expect(site.id).toBe('sp-mons-mouton');
  });

  it('falls back to the default site when lat+lon are invalid and no site is given', () => {
    const site = resolveNavigatorSite(params('lat=abc&lon=0'));
    expect(site.id).toBe(DEFAULT_SITE_ID);
  });

  it('resolves a known ?site= exactly as before', () => {
    const site = resolveNavigatorSite(params('site=sp-mons-mouton'));
    expect(site.id).toBe('sp-mons-mouton');
  });

  it('falls back to the default site for an unknown ?site=', () => {
    const site = resolveNavigatorSite(params('site=does-not-exist'));
    expect(site.id).toBe(DEFAULT_SITE_ID);
  });
});
