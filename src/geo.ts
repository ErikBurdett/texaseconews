import { countyAliases, texasCounties, type TexasCounty } from "./data/counties";
import {
  texasCountyCentroidsByFips,
  type CountyCentroid,
} from "./data/texas-county-centroids";

type TexasMarketHub = {
  readonly city: string;
  readonly latitude: number;
  readonly longitude: number;
};

export const texasMarketHubs: readonly TexasMarketHub[] = [
  { city: "Houston", latitude: 29.7604, longitude: -95.3698 },
  { city: "Dallas", latitude: 32.7767, longitude: -96.797 },
  { city: "San Antonio", latitude: 29.4241, longitude: -98.4936 },
  { city: "Austin", latitude: 30.2672, longitude: -97.7431 },
  { city: "Fort Worth", latitude: 32.7555, longitude: -97.3308 },
  { city: "El Paso", latitude: 31.7619, longitude: -106.485 },
  { city: "Amarillo", latitude: 35.222, longitude: -101.8313 },
  { city: "Lubbock", latitude: 33.5779, longitude: -101.8552 },
  { city: "Midland", latitude: 31.9973, longitude: -102.0779 },
  { city: "Corpus Christi", latitude: 27.8006, longitude: -97.3964 },
  { city: "McAllen", latitude: 26.2034, longitude: -98.23 },
  { city: "Tyler", latitude: 32.3513, longitude: -95.3011 },
  { city: "Waco", latitude: 31.5493, longitude: -97.1467 },
  { city: "Abilene", latitude: 32.4487, longitude: -99.7331 },
  { city: "Beaumont", latitude: 30.0802, longitude: -94.1266 },
];

export function getCountyCentroid(
  countyOrFips: TexasCounty | string,
): CountyCentroid | undefined {
  const fips = typeof countyOrFips === "string" ? countyOrFips.trim() : countyOrFips.fips;
  return texasCountyCentroidsByFips[fips];
}

export function getCountyMarketCities(county: TexasCounty, limit = 3) {
  const centroid = getCountyCentroid(county);
  const marketLimit = normalizeLimit(limit);
  if (!centroid || marketLimit === 0) return [];

  const nearestHubs = texasMarketHubs
    .map((hub) => ({
      hub,
      distance: haversineMiles(
        centroid[0],
        centroid[1],
        hub.latitude,
        hub.longitude,
      ),
    }))
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        compareStableStrings(left.hub.city, right.hub.city),
    )
    .map(({ hub }) => hub.city);

  return uniqueTerms([county.metro, ...nearestHubs]).slice(0, marketLimit);
}

export function getNearbyTexasCounties(county: TexasCounty, limit = 3) {
  const centroid = getCountyCentroid(county);
  const countyLimit = normalizeLimit(limit);
  if (!centroid || countyLimit === 0) return [];

  return texasCounties
    .flatMap((candidate) => {
      if (candidate.fips === county.fips) return [];
      const candidateCentroid = getCountyCentroid(candidate);
      if (!candidateCentroid) return [];

      return [{
        county: candidate,
        distance: haversineMiles(
          centroid[0],
          centroid[1],
          candidateCentroid[0],
          candidateCentroid[1],
        ),
      }];
    })
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        compareStableStrings(left.county.fips, right.county.fips),
    )
    .slice(0, countyLimit)
    .map(({ county: candidate }) => candidate);
}

export function getCountyExpansionTerms(county: TexasCounty, marketLimit = 3) {
  const generatedCountyTerms = new Set([
    county.displayName,
    `${county.displayName} Texas`,
    `${county.displayName}, Texas`,
    `${county.name}, Texas`,
    `${county.name} TX`,
  ].map(normalizeTermKey));
  const existingPlaceAndMetroTerms = countyAliases(county)
    .map(({ label }) => label)
    .filter((label) => !generatedCountyTerms.has(normalizeTermKey(label)));

  return uniqueTerms([
    ...existingPlaceAndMetroTerms,
    ...getCountyMarketCities(county, marketLimit),
  ]);
}

export function haversineMiles(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(latB - latA);
  const dLon = toRadians(lonB - lonA);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
}

function uniqueTerms(values: readonly (string | undefined)[]) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = normalizeTermKey(trimmed);
    if (!unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()];
}

function normalizeTermKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function normalizeLimit(limit: number) {
  return Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0;
}

function compareStableStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}
