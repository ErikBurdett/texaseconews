import { texasCounties } from "./counties";
import { countyPlaces } from "./county-places";

export function placeSlug(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}
export const texasPlaces = texasCounties.flatMap(county => (countyPlaces[county.fips] ?? []).map(name => ({
  name, slug: placeSlug(name), county,
  search: `${name} ${county.name}`.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLowerCase(),
})));
