import { test, expect } from "@playwright/test";

test("regional reporting is labeled separately from a hometown newsroom", async ({ page }) => {
  await page.route("**/v1/sources/counties/loving", route => route.fulfill({ json: { countySlug: "loving", sources: [
    { id: "regional", name: "Houston Chronicle", websiteUrl: "https://www.houstonchronicle.com/", kind: "newsroom", coverage: "county", newsroomScope: "regional" },
    { id: "official", name: "Loving County Government", websiteUrl: "https://www.co.loving.tx.us/", kind: "official", coverage: "county" },
  ] } }));
  await page.goto("/county/loving/sources");
  const regional = page.locator("article").filter({ has: page.getByRole("heading", { name: "Regional reporting for this county" }) });
  await expect(regional.getByRole("link", { name: /Houston Chronicle/ })).toBeVisible();
  await expect(page.getByText("Regional reporting · Loving County")).toBeVisible();
  await expect(page.getByText(/not yet verified a local newsroom/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
import { texasPlaces, placeSlug } from "../src/data/places";

const empty = () => ({ items: [], meta: { count: 0, total: 0, hasMore: false, sourcesUsed: [], fetchedAt: new Date().toISOString(), cacheTtlSeconds: 300, stale: false, partialFailures: 0 } });
test.beforeEach(async ({ page }) => {
  await page.route("https://s3.tradingview.com/**", route => route.fulfill({ body: "", contentType: "application/javascript" }));
  await page.route("https://www.livecoinwatch.com/**", route => route.fulfill({ body: "", contentType: "application/javascript" }));
  await page.route("**/v1/pages/home?**", route => route.fulfill({ json: { county: empty(), statewide: empty(), meta: { fetchedAt: new Date().toISOString() } } }));
});
test("every mapped community has a unique route and cross-county cities retain their counties", async ({ page }) => {
  expect(texasPlaces.length).toBe(9581);
  expect(new Set(texasPlaces.map(p => `${p.county.slug}/${p.slug}`)).size).toBe(texasPlaces.length);
  expect(placeSlug("Peñitas")).toBe("penitas");
  await page.goto("/places");
  await expect(page.locator('.county-link-card')).toHaveCount(36);
  await page.getByLabel("Search a place or county").fill("Pearland");
  for (const county of ["brazoria", "fort-bend", "harris"]) await expect(page.locator(`a[href='/county/${county}/city/pearland']`)).toBeVisible();
  await page.getByLabel("Search a place or county").fill("Wildorado");
  await page.locator("a[href='/county/oldham/city/wildorado']").click();
  await expect(page.getByRole("heading", { name: "Wildorado. Local opportunity." })).toBeVisible();
  await expect(page.getByText("No matching Wildorado stories yet", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore local sources ↗" })).toHaveAttribute("href", "/county/oldham/city/wildorado/sources");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test("town filters and infinite scrolling preserve the selected town", async ({ page }) => {
  const requests: URL[] = [];
  await page.route("**/v1/pages/home?**", route => {
    const url = new URL(route.request().url()); requests.push(url);
    const more = url.searchParams.has("countyCursor");
    const items = Array.from({ length: more ? 2 : 60 }, (_, i) => ({
      id: `${url.searchParams.get("topics")}-${more ? "older" : "new"}-${i}`,
      title: `Wildorado Texas manufacturer opens facility ${more ? "older" : "new"} ${i}`,
      link: `https://example.com/story-${more}-${i}`, source: "Example Local News", topics: ["manufacturing"], countySlug: "oldham", coverageTier: "county", coverageLabel: "Wildorado, Oldham County",
      publishedAt: new Date(Date.now() - (more ? 100 : i) * 86_400_000).toISOString(),
    }));
    return route.fulfill({ json: { county: { items, meta: { ...empty().meta, count: items.length, total: items.length, hasMore: !more, ...(!more ? { nextCursor: "town-next" } : {}) } }, statewide: empty(), meta: { fetchedAt: new Date().toISOString() } } });
  });
  await page.goto("/county/oldham/city/wildorado");
  await expect(page.getByRole("heading", { name: /facility new 0$/ })).toBeVisible();
  await page.getByLabel("Industry", { exact: true }).selectOption("manufacturing");
  await expect.poll(() => requests.some(url => url.searchParams.get("topics") === "manufacturing")).toBe(true);
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(150);
  }
  await expect.poll(() => requests.some(url => url.searchParams.get("countyCursor") === "town-next")).toBe(true);
  expect(requests.every(url => url.searchParams.get("city") === "wildorado" && url.searchParams.get("counties") === "oldham")).toBe(true);
  await expect(page.getByRole("heading", { name: /facility older 1$/ })).toBeVisible();
});
test("town sources distinguish a publisher's home town from county-serving coverage", async ({ page }) => {
  await page.route("**/v1/sources/counties/hemphill/cities/canadian", route => route.fulfill({ json: { countySlug: "hemphill", sources: [
    { id: "canadian", name: "High Plains Observer Canadian", websiteUrl: "https://highplainsobservercanadian.com/", kind: "newsroom", coverage: "county", basedInSelectedPlace: true },
    { id: "official", name: "Hemphill County Government", websiteUrl: "https://www.co.hemphill.tx.us/", kind: "official", coverage: "county" },
  ] } }));
  await page.goto("/county/hemphill/city/canadian/sources");
  await expect(page.getByText("Based in Canadian", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Official county sources" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read Canadian news ↗" })).toHaveAttribute("href", "/county/hemphill/city/canadian");
  await page.goto("/county/oldham/city/not-a-real-town");
  await expect(page.getByRole("heading", { name: "Town not found" })).toBeVisible();
});
