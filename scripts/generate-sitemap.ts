import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { texasCounties } from "../src/data/counties";
import { regionSlugs } from "../src/data/regions";
import { topicSlugs } from "../src/data/topics";

/**
 * Writes public/sitemap.xml from the same route data the router uses, so the
 * sitemap cannot drift from the pages that actually exist. Runs on `prebuild`.
 */

const canonicalOrigin = "https://texasbusiness.news";

const staticPaths = [
  "/",
  "/counties",
  "/mission",
  "/advertise",
  "/contact",
  "/terms",
  "/privacy",
  "/methodology",
  "/advertising-standards",
  "/accessibility",
];

const paths = [
  ...staticPaths,
  ...topicSlugs.map((slug) => `/topic/${slug}`),
  ...regionSlugs.map((slug) => `/region/${slug}`),
  ...texasCounties.map((county) => `/county/${county.slug}`),
];

const lastModified = new Date().toISOString().slice(0, 10);
const document = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...paths.map((path) =>
    [
      "  <url>",
      `    <loc>${canonicalOrigin}${path}</loc>`,
      `    <lastmod>${lastModified}</lastmod>`,
      `    <changefreq>${path === "/" ? "hourly" : "weekly"}</changefreq>`,
      "  </url>",
    ].join("\n"),
  ),
  "</urlset>",
  "",
].join("\n");

const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), "../public/sitemap.xml");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, document, "utf8");
console.log(`Wrote ${paths.length} URLs to ${outputPath}`);
