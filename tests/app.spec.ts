import { expect, test, type Page } from "@playwright/test";

function rssFor(url: string) {
  const decoded = decodeURIComponent(url);
  const county = decoded.includes("Dallas") || decoded.includes("dallas") ? "Dallas County, Texas" : decoded.includes("Potter") ? "Potter County, Texas" : "Texas";
  const topic = decoded.includes("energy") || decoded.includes("power") ? "energy investment" : decoded.includes("jobs") ? "jobs and workforce training" : "business expansion";
  const title = `${county} ${topic} creates positive growth`;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Mock Texas Growth Feed</title>
      <item>
        <title>${title}</title>
        <link>https://example.com/${encodeURIComponent(title)}</link>
        <guid>${title}</guid>
        <pubDate>Sun, 14 Jun 2026 12:00:00 GMT</pubDate>
        <source url="https://example.com">Example Texas Business Journal</source>
        <description>${county} reports new jobs, investment, infrastructure, energy, and manufacturing growth.</description>
      </item>
      <item>
        <title>Texas semiconductor manufacturing expansion adds jobs</title>
        <link>https://example.com/semiconductor-growth</link>
        <guid>semiconductor-growth</guid>
        <pubDate>Sat, 13 Jun 2026 12:00:00 GMT</pubDate>
        <source url="https://example.com">Example Texas Business Journal</source>
        <description>Texas statewide manufacturing and AI infrastructure investment creates workforce opportunity.</description>
      </item>
    </channel>
  </rss>`;
}

async function mockExternalProviders(page: Page) {
  await page.route("https://s3.tradingview.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__tradingViewMocked = true;" }),
  );
  await page.route("https://api.allorigins.win/raw**", (route) =>
    route.fulfill({ status: 200, contentType: "application/rss+xml", body: rssFor(route.request().url()) }),
  );
  await page.route("https://api.rss2json.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", items: [] }) }),
  );
}

test.beforeEach(async ({ page }) => {
  await mockExternalProviders(page);
  await page.goto("/");
});

test("renders the home feed, sponsor content, and core filter controls", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Good news from every corner of Texas." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build your Texas feed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Texas statewide articles" })).toBeVisible();
  await expect(page.getByText("Texas semiconductor manufacturing expansion adds jobs")).toBeVisible();
  await expect(page.getByText("Sponsored by Wind's Eye Capital")).toBeVisible();
});

test("supports multi-county search, region filters, and industry navigation", async ({ page }) => {
  await page.getByPlaceholder("Search county, city, metro, or region. Try: Frisco or Potter, Randall").fill("Potter, Randall");
  await page.getByRole("button", { name: "Add matches" }).click();

  await expect(page.getByRole("button", { name: "Remove Potter County" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Randall County" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected counties articles" })).toBeVisible();

  await page.getByRole("link", { name: "DFW" }).click();
  await expect(page).toHaveURL("/region/dfw");
  await expect(page.getByRole("button", { name: "Remove Dallas County" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Tarrant County" })).toBeVisible();

  await page.getByRole("link", { name: "Energy" }).click();
  await expect(page).toHaveURL("/region/dfw/industry/energy");
  await expect(page.getByRole("heading", { name: "Energy news across Texas." })).toBeVisible();
});

test("renders shareable county and county-topic routes", async ({ page }) => {
  await page.goto("/county/dallas");
  await expect(page.getByRole("button", { name: "Remove Dallas County" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dallas County articles" })).toBeVisible();
  await expect(page.getByText("Dallas County, Texas business expansion creates positive growth")).toBeVisible();

  await page.goto("/county/dallas/topic/jobs");
  await expect(page.getByRole("heading", { name: "Jobs news across Texas." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dallas County articles" })).toBeVisible();
});

test("renders shareable region and region-industry routes", async ({ page }) => {
  await page.goto("/region/permian-basin");
  await expect(page.getByRole("heading", { name: "Permian Basin growth news." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Midland County" })).toBeVisible();

  await page.goto("/region/gulf/industry/finance");
  await expect(page.getByRole("heading", { name: "Finance news across Texas." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Finance" })).toHaveClass(/selected/);
});

test("covers directory, mission, advertising, and not-found routes", async ({ page }) => {
  await page.goto("/counties");
  await expect(page.getByRole("heading", { name: "Find good economic news by Texas county." })).toBeVisible();
  await page.getByPlaceholder("Search counties, cities, metros, or regions...").fill("Frisco");
  await expect(page.getByRole("link", { name: /Collin County/ })).toBeVisible();
  await page.getByRole("link", { name: /Collin County/ }).click();
  await expect(page).toHaveURL("/county/collin");

  await page.goto("/mission");
  await expect(page.getByRole("heading", { name: "Helping Texans spot useful economic opportunity." })).toBeVisible();

  await page.goto("/advertise");
  await expect(page.getByRole("heading", { name: "Reach Texans looking for what is growing." })).toBeVisible();
  await expect(page.getByText("Launch packages")).toBeVisible();

  await page.goto("/not-a-real-route");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to feed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse counties" })).toBeVisible();
});

test("does not expose unlabeled interactive controls", async ({ page }) => {
  const issues = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, a, input"))
      .map((element) => ({
        html: element.outerHTML.slice(0, 140),
        name:
          element.getAttribute("aria-label") ||
          element.getAttribute("placeholder") ||
          element.textContent?.trim() ||
          element.getAttribute("title") ||
          "",
      }))
      .filter((item) => !item.name)
      .map((item) => item.html);
  });

  expect(issues).toEqual([]);
});
