import { getCountyByState, type UsCountyRecord } from "@nickgraffis/us-counties";

export type TexasCounty = {
  fips: string;
  name: string;
  slug: string;
  displayName: string;
  region: TexasRegion;
  metro?: string;
};

export type CountyAlias = {
  label: string;
  querySafe?: boolean;
};

export type TexasRegion =
  | "Panhandle"
  | "North Texas"
  | "East Texas"
  | "Central Texas"
  | "Gulf Coast"
  | "South Texas"
  | "West Texas";

const regionalOverrides: Record<string, { region: TexasRegion; metro?: string }> = {
  potter: { region: "Panhandle", metro: "Amarillo" },
  randall: { region: "Panhandle", metro: "Amarillo" },
  dallas: { region: "North Texas", metro: "Dallas-Fort Worth" },
  tarrant: { region: "North Texas", metro: "Dallas-Fort Worth" },
  collin: { region: "North Texas", metro: "Dallas-Fort Worth" },
  denton: { region: "North Texas", metro: "Dallas-Fort Worth" },
  travis: { region: "Central Texas", metro: "Austin" },
  williamson: { region: "Central Texas", metro: "Austin" },
  hays: { region: "Central Texas", metro: "Austin" },
  bexar: { region: "South Texas", metro: "San Antonio" },
  harris: { region: "Gulf Coast", metro: "Houston" },
  "fort-bend": { region: "Gulf Coast", metro: "Houston" },
  montgomery: { region: "Gulf Coast", metro: "Houston" },
  galveston: { region: "Gulf Coast", metro: "Houston" },
  nueces: { region: "Gulf Coast", metro: "Corpus Christi" },
  "el-paso": { region: "West Texas", metro: "El Paso" },
  midland: { region: "West Texas", metro: "Permian Basin" },
  ector: { region: "West Texas", metro: "Permian Basin" },
  smith: { region: "East Texas", metro: "Tyler" },
  gregg: { region: "East Texas", metro: "Longview" },
  mclennan: { region: "Central Texas", metro: "Waco" },
  bell: { region: "Central Texas", metro: "Killeen-Temple" },
  brazos: { region: "Central Texas", metro: "Bryan-College Station" },
  hidalgo: { region: "South Texas", metro: "Rio Grande Valley" },
  cameron: { region: "South Texas", metro: "Rio Grande Valley" },
  webb: { region: "South Texas", metro: "Laredo" },
  lubbock: { region: "West Texas", metro: "Lubbock" },
};

const placeAliasesByCountySlug: Record<string, string[]> = {
  bexar: ["San Antonio", "Alamo City"],
  bell: ["Killeen", "Temple", "Belton"],
  brazos: ["Bryan", "College Station"],
  cameron: ["Brownsville", "Harlingen", "South Padre Island"],
  collin: ["Plano", "Frisco", "McKinney", "Allen"],
  dallas: ["Dallas", "Irving", "Garland", "Mesquite"],
  denton: ["Denton", "Lewisville", "Flower Mound"],
  ector: ["Odessa"],
  "el-paso": ["El Paso"],
  "fort-bend": ["Sugar Land", "Missouri City", "Rosenberg"],
  galveston: ["Galveston", "League City", "Texas City"],
  gregg: ["Longview"],
  harris: ["Houston", "Pasadena", "Baytown"],
  hays: ["San Marcos", "Kyle", "Buda"],
  hidalgo: ["McAllen", "Edinburg", "Mission", "Pharr"],
  lubbock: ["Lubbock"],
  mclennan: ["Waco"],
  midland: ["Midland"],
  montgomery: ["Conroe", "The Woodlands"],
  nueces: ["Corpus Christi"],
  potter: ["Amarillo"],
  randall: ["Amarillo", "Canyon"],
  smith: ["Tyler"],
  tarrant: ["Fort Worth", "Arlington", "Grapevine"],
  travis: ["Austin", "Pflugerville"],
  webb: ["Laredo"],
  williamson: ["Georgetown", "Round Rock", "Cedar Park"],
};

export function slugifyCounty(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultRegion(county: UsCountyRecord): TexasRegion {
  const fipsNumber = Number.parseInt(county.FIPS, 10);
  if (fipsNumber <= 48100) return "Panhandle";
  if (fipsNumber <= 48220) return "North Texas";
  if (fipsNumber <= 48320) return "Central Texas";
  if (fipsNumber <= 48420) return "Gulf Coast";
  return "West Texas";
}

const texasCountyRecords = getCountyByState("Texas") as UsCountyRecord[];

export const texasCounties: TexasCounty[] = texasCountyRecords
  .map((county) => {
    const slug = slugifyCounty(county.name);
    const override = regionalOverrides[slug];

    return {
      fips: county.FIPS,
      name: county.name,
      slug,
      displayName: `${county.name} County`,
      region: override?.region || defaultRegion(county),
      metro: override?.metro,
    };
  })
  .sort((first, second) => first.name.localeCompare(second.name));

export const texasCountiesBySlug = new Map(texasCounties.map((county) => [county.slug, county]));

export function getCountyBySlug(slug?: string) {
  return slug ? texasCountiesBySlug.get(slug) : undefined;
}

export function countyAliases(county: TexasCounty): CountyAlias[] {
  const base = [
    `${county.name} County`,
    `${county.name} County Texas`,
    `${county.name} County, Texas`,
    `${county.name}, Texas`,
    `${county.name} TX`,
  ];
  const metro = county.metro ? [county.metro] : [];
  const places = placeAliasesByCountySlug[county.slug] || [];
  const aliases = [...base, ...metro, ...places];

  return [...new Set(aliases)]
    .filter((label) => label.length > 2)
    .map((label) => ({ label, querySafe: label.length <= 28 }));
}

export function countyQueryAliases(county: TexasCounty) {
  return countyAliases(county)
    .filter((alias) => alias.querySafe)
    .map((alias) => alias.label);
}

export function countySearchText(county: TexasCounty) {
  return [
    county.name,
    county.displayName,
    county.slug,
    county.region,
    county.metro,
    ...countyAliases(county).map((alias) => alias.label),
  ]
    .filter(Boolean)
    .join(" ");
}

export function isCountyRelevantText(county: TexasCounty, value: string) {
  const normalized = normalizeForSearch(value);
  if (!normalized) return false;

  return countyAliases(county).some(({ label }) => normalized.includes(normalizeForSearch(label)));
}

export function normalizeCountySearch(value: string) {
  return normalizeForSearch(value).trim();
}

function normalizeForSearch(value: string) {
  return ` ${value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}
