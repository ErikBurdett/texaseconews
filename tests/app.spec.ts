import { expect, test, type Page } from "@playwright/test";

const fetchedAt = "2026-06-14T12:00:00.000Z";
const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const fallbackTitle = "Texas manufacturer expansion adds 500 jobs";

function feed(items: Array<Record<string, unknown>>) {
  return {
    items,
    meta: {
      count: items.length,
      sourcesUsed: ["Example Texas Business Journal"],
      fetchedAt,
      cacheTtlSeconds: 900,
      stale: false,
      partialFailures: 0,
    },
  };
}

function homePageResponse(requestUrl: string) {
  const params = new URL(requestUrl).searchParams;
  const counties = csv(params.get("counties"));
  const topics = csv(params.get("topics"));
  const topic = topics.includes("energy") ? "energy investment" : topics.includes("jobs") ? "jobs and workforce training" : "business expansion";
  const countyNames: Record<string, string> = {
    dallas: "Dallas County, Texas",
    potter: "Potter County, Texas",
    randall: "Randall County, Texas",
  };

  const countyItems = counties.map((countySlug) => {
    const county = countyNames[countySlug] || `${countySlug} County, Texas`;
    const title = `${county} ${topic} creates positive growth`;
    return {
      id: `county-${countySlug}-${topics.join("-") || "all"}`,
      title,
      link: `https://example.com/${encodeURIComponent(title)}`,
      source: "Example Texas Business Journal",
      sourceUrl: "https://example.com",
      publishedAt: fetchedAt,
      description: `${county} reports new jobs, investment, infrastructure, energy, and manufacturing growth.`,
      imageUrl: pixel,
      feedLabel: "County growth",
      countySlug,
      region: "Mock Texas region",
      topics: topics.length ? topics : ["jobs", "energy", "manufacturing"],
    };
  });

  const statewideItems = [
    {
      id: "semiconductor-growth",
      title: "Texas semiconductor manufacturing expansion adds jobs",
      link: "https://example.com/semiconductor-growth",
      source: "Example Texas Business Journal",
      sourceUrl: "https://example.com",
      publishedAt: "2026-06-13T12:00:00.000Z",
      description: "Texas statewide manufacturing and AI infrastructure investment creates workforce opportunity.",
      imageUrl: pixel,
      feedLabel: "Texas statewide",
      topics: topics.length ? topics : ["jobs", "manufacturing", "semiconductors"],
    },
  ];

  return {
    county: counties.length ? feed(countyItems) : null,
    statewide: feed(statewideItems),
    meta: { fetchedAt },
  };
}

function csv(value: string | null) {
  return value ? value.split(",").filter(Boolean) : [];
}

function rssFallbackResponse(title = fallbackTitle) {
  return {
    status: "ok",
    feed: {
      title: "Texas Business Fallback",
      link: "https://fallback.example.com",
    },
    items: [
      {
        title,
        link: `https://fallback.example.com/${encodeURIComponent(title)}`,
        guid: `rss-fallback-${title}`,
        pubDate: new Date().toUTCString(),
        description: "Texas investment and manufacturing growth creates jobs and workforce opportunity.",
        thumbnail: pixel,
        source: {
          title: "Fallback Texas Business Journal",
          url: "https://fallback.example.com",
        },
      },
    ],
  };
}

async function mockNetworkDependencies(page: Page) {
  await page.route("https://s3.tradingview.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__tradingViewMocked = true;" }),
  );
  await page.route("https://www.livecoinwatch.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__liveCoinWatchMocked = true;" }),
  );
  await page.route("**/v1/pages/home**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(homePageResponse(route.request().url())),
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await mockNetworkDependencies(page);
  await page.goto("/");
});

test("renders the home feed, sponsor content, and core filter controls", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Good news from every corner of Texas." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build your Texas feed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Texas statewide articles" })).toBeVisible();
  await expect(page.getByText("Texas semiconductor manufacturing expansion adds jobs")).toBeVisible();
  await expect(page.getByText("Sponsored by Double B Ranch").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "TX TexasBusiness.News", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy Statement" })).toBeVisible();
});

test("always opens the home page with a statewide feed", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem("texasbusiness-news:selected-counties", JSON.stringify(["potter"]));
  });
  await page.reload();

  await expect(page.getByRole("heading", { name: "Texas statewide articles" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Potter County articles" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove Potter County" })).toHaveCount(0);
});

test("falls back to RSS proxies when the news API is unavailable", async ({ page }) => {
  let rawProxyRequests = 0;
  let rss2JsonRequests = 0;

  await page.unroute("**/v1/pages/home**");
  await page.route("**/v1/pages/home**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "unavailable", message: "API unavailable" } }),
    }),
  );
  await page.route("https://api.allorigins.win/raw**", (route) => {
    rawProxyRequests += 1;
    return route.fulfill({ status: 503, body: "raw proxy unavailable" });
  });
  await page.route("https://api.rss2json.com/v1/api.json**", (route) => {
    rss2JsonRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(rssFallbackResponse()),
    });
  });

  await page.reload();

  await expect(page.getByText(fallbackTitle)).toBeVisible();
  await expect(page.getByText("News API unavailable")).toHaveCount(0);
  expect(rawProxyRequests).toBeGreaterThan(0);
  expect(rss2JsonRequests).toBeGreaterThan(0);
});

test("uses local RSS feeds for Potter County fallback coverage", async ({ page }) => {
  const localTitle = "Amarillo hospital construction reaches a new milestone";

  await page.unroute("**/v1/pages/home**");
  await page.route("**/v1/pages/home**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "unavailable", message: "API unavailable" } }),
    }),
  );
  await page.route("https://api.allorigins.win/raw**", (route) =>
    route.fulfill({ status: 503, body: "raw proxy unavailable" }),
  );
  await page.route("https://api.rss2json.com/v1/api.json**", (route) => {
    const feedUrl = new URL(route.request().url()).searchParams.get("rss_url") || "";
    const isLocalFeed = !new URL(feedUrl).hostname.includes("google.com");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        isLocalFeed
          ? rssFallbackResponse(localTitle)
          : { status: "error", items: [] },
      ),
    });
  });

  await page.goto("/county/potter");

  await expect(page.getByRole("heading", { name: "Potter County articles" })).toBeVisible();
  await expect(page.getByText(localTitle)).toBeVisible();
  await expect(page.getByText("News API unavailable")).toHaveCount(0);
});

test("does not hide API validation errors behind the RSS fallback", async ({ page }) => {
  let proxyRequests = 0;

  await page.unroute("**/v1/pages/home**");
  await page.route("**/v1/pages/home**", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "invalid_query", message: "Invalid feed filters." } }),
    }),
  );
  await page.route("https://api.allorigins.win/**", (route) => {
    proxyRequests += 1;
    return route.abort();
  });
  await page.route("https://api.rss2json.com/**", (route) => {
    proxyRequests += 1;
    return route.abort();
  });

  await page.reload();

  await expect(page.getByText("News API unavailable")).toBeVisible();
  await expect(page.getByText("Invalid feed filters.")).toBeVisible();
  expect(proxyRequests).toBe(0);
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

test("keeps filter selections within the API fan-out budget", async ({ page }) => {
  for (const industry of ["Energy", "Robotics", "Small Business", "Infrastructure"]) {
    await page.getByRole("button", { name: industry, exact: true }).click();
  }

  await expect(page.getByRole("button", { name: "Technology", exact: true })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Choose up to 4 counties, 4 regions, and 4 industries");
});

test("renders shareable county and county-topic routes", async ({ page }) => {
  await page.goto("/county/dallas");
  await expect(page.getByRole("button", { name: "Remove Dallas County" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dallas County articles" })).toBeVisible();
  await expect(page.getByText(/^Dallas County, Texas .* creates positive growth$/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Texas statewide articles" })).toBeVisible();
  await expect(page.getByText("Texas semiconductor manufacturing expansion adds jobs")).toBeVisible();

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
  await expect(page.getByRole("heading", { name: "Reach Texans looking for what is growing." })).toBeVisible();
  await expect(page.getByText("Launch packages")).toBeVisible();

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
    return Array.from(document.querySelectorAll("button, a, input"))
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
