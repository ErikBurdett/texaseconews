import { expect, test, type Page } from "@playwright/test";

function rssFor(url: string) {
  const decoded = decodeURIComponent(url);
  const county = decoded.includes("Dallas") || decoded.includes("dallas") ? "Dallas County, Texas" : decoded.includes("Potter") ? "Potter County, Texas" : "Texas";
  const topic = decoded.includes("energy") || decoded.includes("power") ? "energy investment" : decoded.includes("jobs") ? "jobs and workforce training" : "business expansion";
  const title = `${county} ${topic} creates positive growth`;
  const additionalItems = Array.from({ length: 10 }, (_, index) => `
      <item>
        <title>${county} business project ${index + 1} adds jobs and investment</title>
        <link>https://example.com/project-${index + 1}-${encodeURIComponent(county)}</link>
        <guid>${county}-project-${index + 1}</guid>
        <pubDate>Fri, ${12 - index} Jun 2026 12:00:00 GMT</pubDate>
        <source url="https://example.com">Example Texas Business Journal</source>
        <description>${county} reports business expansion, jobs, infrastructure, and manufacturing investment.</description>
      </item>`).join("");

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
      ${additionalItems}
    </channel>
  </rss>`;
}

async function mockExternalProviders(page: Page) {
  await page.route("https://s3.tradingview.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__tradingViewMocked = true;" }),
  );
  await page.route("https://www.livecoinwatch.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__liveCoinWatchMocked = true;" }),
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
  await expect(page.getByText("Sponsored by Double B Ranch").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Advertise in this In-feed article sponsor placement" })).toHaveCount(2);
  await expect(page.getByRole("link", { name: "TX TexasBusiness.News", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy Statement" })).toBeVisible();
});

test("supports multi-county search, region filters, and industry navigation", async ({ page }) => {
  await page.getByPlaceholder("Search county, city, metro, or region. Try: Frisco or Potter, Randall").fill("Potter, Randall");
  await page.getByRole("button", { name: "Add matches" }).click();

  await expect(page.getByRole("button", { name: "Remove Potter County" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Randall County" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected counties articles" })).toBeVisible();

  await page.getByRole("button", { name: "DFW" }).click();
  await expect(page.getByRole("button", { name: "Remove DFW region" })).toBeVisible();

  await page.getByRole("button", { name: "Energy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Energy industry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Energy news across Texas." })).toBeVisible();
});

test("renders shareable county and county-topic routes", async ({ page }) => {
  await page.goto("/county/dallas");
  await expect(page.getByRole("button", { name: "Remove Dallas County" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dallas County articles" })).toBeVisible();
  await expect(page.getByText(/^Dallas County, Texas .* creates positive growth$/).first()).toBeVisible();

  await page.goto("/county/dallas/topic/jobs");
  await expect(page.getByRole("heading", { name: "Jobs news across Texas." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dallas County articles" })).toBeVisible();
});

test("renders shareable region and region-industry routes", async ({ page }) => {
  await page.goto("/region/permian-basin");
  await expect(page.getByRole("heading", { name: "Permian Basin growth news." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Permian Basin region" })).toBeVisible();

  await page.goto("/region/gulf/industry/finance");
  await expect(page.getByRole("heading", { name: "Finance news across Texas." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finance", exact: true })).toHaveClass(/selected/);
});

test("covers directory, mission, advertising, and not-found routes", async ({ page }) => {
  await page.goto("/counties");
  await expect(page.getByRole("heading", { name: "Find good business news by Texas county." })).toBeVisible();
  await page.getByPlaceholder("Search counties, cities, metros, or regions...").fill("Frisco");
  await expect(page.getByRole("link", { name: /Collin County/ })).toBeVisible();
  await page.getByRole("link", { name: /Collin County/ }).click();
  await expect(page).toHaveURL("/county/collin");

  await page.goto("/mission");
  await expect(page.getByRole("heading", { name: "Helping Texans spot useful business opportunity." })).toBeVisible();

  await page.goto("/advertise");
  await expect(page.getByRole("heading", { name: "Reach Texans following where business is growing." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fixed packages. No population tiers." })).toBeVisible();
  await expect(page.getByText("$295/mo · $2,950/yr").first()).toBeVisible();

  await page.goto("/payments");
  await expect(page.getByRole("heading", { name: "Build a Texas advertising request." })).toBeVisible();
  await page.getByPlaceholder("Search Texas counties, cities, metros, or regions").fill("Dallas");
  await page.getByRole("button", { name: /Dallas County/ }).click();
  await expect(page.getByRole("heading", { name: "$295" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stripe checkout coming soon" })).toBeDisabled();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms for using TexasBusiness.News." })).toBeVisible();
  await expect(page.getByText("No Professional Advice")).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy-first by design." })).toBeVisible();
  await expect(page.getByText("Local Preferences")).toBeVisible();

  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Reach TexasBusiness.News." })).toBeVisible();
  await expect(page.getByRole("link", { name: "admin@texasbusiness.news", exact: true })).toBeVisible();

  await page.goto("/not-a-real-route");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to feed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse counties" })).toBeVisible();
});

test("does not expose unlabeled interactive controls", async ({ page }) => {
  const issues = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, a, input, select, textarea"))
      .map((element) => ({
        html: element.outerHTML.slice(0, 140),
        name:
          element.getAttribute("aria-label") ||
          element.getAttribute("placeholder") ||
          element.textContent?.trim() ||
          element.getAttribute("title") ||
          ("labels" in element ? Array.from(element.labels || []).map((label) => label.textContent?.trim()).join(" ") : "") ||
          "",
      }))
      .filter((item) => !item.name)
      .map((item) => item.html);
  });

  expect(issues).toEqual([]);
});
