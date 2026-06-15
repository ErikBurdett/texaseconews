import { getCountyBySlug, type TexasCounty } from "./counties";

export type RegionDefinition = {
  label: string;
  shortLabel?: string;
  description: string;
  countySlugs: string[];
  queryTerms: string[];
};

export const regionCatalog = {
  dfw: {
    label: "DFW",
    description: "Dallas-Fort Worth business, population, logistics, finance, technology, sports, and development momentum.",
    countySlugs: ["dallas", "tarrant", "collin", "denton"],
    queryTerms: ["Dallas-Fort Worth", "DFW", "Dallas", "Fort Worth", "Arlington", "Plano", "Frisco"],
  },
  "austin-corridor": {
    label: "Austin Corridor",
    description: "Austin, Round Rock, San Marcos, and the Central Texas corridor of technology, chips, energy, and workforce growth.",
    countySlugs: ["travis", "williamson", "hays"],
    queryTerms: ["Austin", "Round Rock", "Georgetown", "San Marcos", "Central Texas"],
  },
  "san-antonio": {
    label: "San Antonio",
    description: "San Antonio metro business, military, medicine, tourism, infrastructure, and cross-border economic signal.",
    countySlugs: ["bexar"],
    queryTerms: ["San Antonio", "Bexar County", "Alamo City"],
  },
  "texas-triangle": {
    label: "Texas Triangle",
    description: "The Houston, Dallas-Fort Worth, Austin, and San Antonio megaregion connecting Texas growth markets.",
    countySlugs: ["harris", "fort-bend", "montgomery", "galveston", "dallas", "tarrant", "collin", "denton", "travis", "williamson", "hays", "bexar"],
    queryTerms: ["Texas Triangle", "Houston", "Dallas", "Fort Worth", "Austin", "San Antonio"],
  },
  "texas-panhandle": {
    label: "Texas Panhandle",
    shortLabel: "Panhandle",
    description: "Amarillo and Panhandle stories across energy, agriculture, logistics, defense, and commercial real estate.",
    countySlugs: ["potter", "randall"],
    queryTerms: ["Texas Panhandle", "Amarillo", "Potter County", "Randall County"],
  },
  "permian-basin": {
    label: "Permian Basin",
    description: "Energy-heavy West Texas growth across oil, gas, power, logistics, workforce, and industrial investment.",
    countySlugs: ["midland", "ector"],
    queryTerms: ["Permian Basin", "Midland", "Odessa", "oil", "gas", "energy"],
  },
  "west-texas": {
    label: "West Texas",
    description: "West Texas energy, agriculture, border trade, defense, logistics, and regional development.",
    countySlugs: ["el-paso", "midland", "ector", "lubbock"],
    queryTerms: ["West Texas", "El Paso", "Midland", "Odessa", "Lubbock"],
  },
  gulf: {
    label: "Gulf Coast",
    shortLabel: "Gulf",
    description: "Houston, ports, petrochemicals, LNG, medicine, aerospace, logistics, and Gulf Coast investment.",
    countySlugs: ["harris", "fort-bend", "montgomery", "galveston", "nueces"],
    queryTerms: ["Texas Gulf Coast", "Houston", "Galveston", "Corpus Christi", "Port Houston", "LNG"],
  },
} as const satisfies Record<string, RegionDefinition>;

export type RegionSlug = keyof typeof regionCatalog;

export const regionSlugs = Object.keys(regionCatalog) as RegionSlug[];

export function getRegionBySlug(slug?: string) {
  return slug && isRegionSlug(slug) ? regionCatalog[slug] : undefined;
}

export function isRegionSlug(slug: string): slug is RegionSlug {
  return slug in regionCatalog;
}

export function countiesForRegion(slug?: RegionSlug) {
  if (!slug) return [];
  return regionCatalog[slug].countySlugs.map(getCountyBySlug).filter(Boolean) as TexasCounty[];
}
