import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/sync-news-geography.mjs /path/to/txbiz-api/src/data/county-places.ts");
const source = await readFile(input, "utf8");
const match = source.match(/export const countyPlaces: Record<string, readonly string\[\]> = (\{[\s\S]*?\n\});/u);
if (!match) throw new Error("Missing API county/place data");
const data = JSON.parse(match[1]);
if (Object.keys(data).length !== 254) throw new Error("Expected all 254 Texas counties");
await writeFile(new URL("../src/data/county-places.ts", import.meta.url),
  `// All Census 2025 places and non-historical USGS populated places, from txbiz-api.\n// Refresh: node scripts/sync-news-geography.mjs /path/to/txbiz-api/src/data/county-places.ts\nexport const countyPlaces: Record<string, readonly string[]> = ${JSON.stringify(data, null, 2)};\n`);
