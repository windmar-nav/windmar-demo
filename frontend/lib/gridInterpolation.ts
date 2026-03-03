/**
 * Shared bilinear interpolation utilities for weather grid data.
 * Used by WeatherGridLayer (tile rendering) and WaveInfoPopup (click queries).
 */

/** Bilinear interpolation on a 2D numeric grid */
export function bilinearInterpolate(
  data: number[][],
  latIdx: number,
  lonIdx: number,
  latFrac: number,
  lonFrac: number,
  ny: number,
  nx: number,
): number {
  const i0 = Math.min(latIdx, ny - 1);
  const i1 = Math.min(latIdx + 1, ny - 1);
  const j0 = Math.min(lonIdx, nx - 1);
  const j1 = Math.min(lonIdx + 1, nx - 1);

  const v00 = data[i0]?.[j0] ?? 0;
  const v01 = data[i0]?.[j1] ?? 0;
  const v10 = data[i1]?.[j0] ?? 0;
  const v11 = data[i1]?.[j1] ?? 0;

  const top = v00 + lonFrac * (v01 - v00);
  const bot = v10 + lonFrac * (v11 - v10);
  return top + latFrac * (bot - top);
}

/** Bilinear interpolation for boolean ocean mask (returns fraction 0-1) */
export function bilinearOcean(
  mask: boolean[][],
  latIdx: number,
  lonIdx: number,
  latFrac: number,
  lonFrac: number,
  ny: number,
  nx: number,
): number {
  const i0 = Math.min(latIdx, ny - 1);
  const i1 = Math.min(latIdx + 1, ny - 1);
  const j0 = Math.min(lonIdx, nx - 1);
  const j1 = Math.min(lonIdx + 1, nx - 1);

  const v00 = mask[i0]?.[j0] ? 1 : 0;
  const v01 = mask[i0]?.[j1] ? 1 : 0;
  const v10 = mask[i1]?.[j0] ? 1 : 0;
  const v11 = mask[i1]?.[j1] ? 1 : 0;

  const top = v00 + lonFrac * (v01 - v00);
  const bot = v10 + lonFrac * (v11 - v10);
  return top + latFrac * (bot - top);
}

/** Compute fractional grid indices for a given lat/lon within a regular grid.
 *  Handles both ascending (south-to-north) and descending (north-to-south) lats. */
export function getGridIndices(
  lat: number,
  lon: number,
  lats: number[],
  lons: number[],
): { latIdx: number; lonIdx: number; latFrac: number; lonFrac: number } | null {
  const ny = lats.length;
  const nx = lons.length;
  if (ny < 2 || nx < 2) return null;

  const latStart = lats[0];
  const latEnd = lats[ny - 1];
  const latMin = Math.min(latStart, latEnd);
  const latMax = Math.max(latStart, latEnd);
  const lonMin = Math.min(lons[0], lons[nx - 1]);
  const lonMax = Math.max(lons[0], lons[nx - 1]);

  if (lat < latMin || lat > latMax || lon < lonMin || lon > lonMax) return null;

  const latFracIdx = ((lat - latStart) / (latEnd - latStart)) * (ny - 1);
  const lonFracIdx = ((lon - lons[0]) / (lons[nx - 1] - lons[0])) * (nx - 1);
  const latIdx = Math.floor(Math.max(0, Math.min(latFracIdx, ny - 2)));
  const lonIdx = Math.floor(Math.max(0, Math.min(lonFracIdx, nx - 2)));
  const latFrac = latFracIdx - latIdx;
  const lonFrac = lonFracIdx - lonIdx;

  return { latIdx, lonIdx, latFrac, lonFrac };
}
