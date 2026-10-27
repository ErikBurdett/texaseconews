import { expect, test, type Page } from "@playwright/test";
import { getCountyBySlug, texasCounties } from "../src/data/counties";
import {
  countyFallbackFeedBounds,
  marketCountyFeeds,
  nearbyCountyFeeds,
  primaryCountyFeeds,
} from "../src/data/feeds";
import { topicSlugs } from "../src/data/topics";

const fetchedAt = "2026-06-14T12:00:00.000Z";
const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const fallbackTitle = "Texas manufacturer expansion adds 500 jobs";

function feed(items: Array<Record<string, unknown>>) {
  const coverageMix = items.reduce<Record<string, number>>((mix, item) => {
    if (typeof item.coverageTier === "string") {
      mix[item.coverageTier] = (mix[item.coverageTier] || 0) + 1;
    }
    return mix;
  }, {});
  return {
    items,
    meta: {
      count: items.length,
      sourcesUsed: ["Example Texas Business Journal"],
      fetchedAt,
      cacheTtlSeconds: 900,
      stale: false,
      partialFailures: 0,
      coverageMix,
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
      coverageTier: "county",
      coverageLabel: county,
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
      coverageTier: "statewide",
      coverageLabel: "Texas statewide",
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

async function openResponsiveFilters(page: Page) {
  await expect(page.locator("#feed-filter-panel")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockNetworkDependencies(page);
  await page.goto("/");
});

test("shows county-serving newsrooms and official sources for a selected city", async ({ page }) => {
  await page.route("**/v1/sources/counties/angelina", (route) => route.fulfill({
    json: { countySlug: "angelina", sources: [
      { id: "lufkin", name: "The Lufkin Daily News", websiteUrl: "https://lufkindailynews.com/", kind: "newsroom", coverage: "county" },
      { id: "official", name: "Angelina County Government", websiteUrl: "https://www.angelinacounty.net/", kind: "official", coverage: "county" },
    ] },
  }));
  await page.goto("/county/angelina");
  await page.getByRole("link", { name: "Angelina County sources and towns" }).click();
  await expect(page.getByRole("heading", { name: "Local newsrooms" })).toBeVisible();
  await expect(page.getByRole("link", { name: /The Lufkin Daily News/ })).toHaveAttribute("href", "https://lufkindailynews.com/");
  await page.getByLabel("City or town").selectOption("Diboll");
  await expect(page.getByRole("heading", { name: "Diboll, Angelina County sources" })).toBeVisible();
  await expect(page.getByText(/a city story must also name Diboll/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Official county sources" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keeps a newsroom coverage gap visible when an official source exists", async ({ page }) => {
  await page.route("**/v1/sources/counties/loving", (route) => route.fulfill({
    json: { countySlug: "loving", sources: [
      { id: "official", name: "Loving County Government", websiteUrl: "https://www.co.loving.tx.us/", kind: "official", coverage: "county" },
    ] },
  }));
  await page.goto("/county/loving/sources");
  await expect(page.getByText(/not yet verified a local newsroom/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Loving County Government/ })).toBeVisible();
});

test("assigns counties a real region only where one was chosen", () => {
  // Regions used to be inferred from FIPS ranges, which are alphabetical rather
  // than geographic, so most counties carried a confidently wrong region.
  const named = texasCounties.filter((county) => county.region !== "All of Texas");
  const unnamed = texasCounties.filter((county) => county.region === "All of Texas");

  expect(named.length + unnamed.length).toBe(254);
  expect(named.length).toBeGreaterThan(0);
  expect(unnamed.length).toBeGreaterThan(0);

  // Counties that were previously mislabelled Panhandle by the FIPS bucketing.
  for (const slug of ["anderson", "andrews", "angelina", "aransas", "bastrop"]) {
    const county = getCountyBySlug(slug);
    expect(county, slug).toBeDefined();
    expect(county!.region, `${slug} should no longer claim a guessed region`).toBe("All of Texas");
  }

  // Explicit assignments still win.
  for (const [slug, region] of [
    ["dallas", "North Texas"],
    ["harris", "Gulf Coast"],
    ["travis", "Central Texas"],
    ["bexar", "South Texas"],
    ["potter", "Panhandle"],
    ["el-paso", "West Texas"],
  ] as const) {
    expect(getCountyBySlug(slug)?.region, slug).toBe(region);
  }
});

test("generates bounded primary, market, and nearby feeds for all 254 counties", () => {
  expect(texasCounties).toHaveLength(254);
  const issues: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) issues.push(message);
  };

  for (const county of texasCounties) {
    const primary = primaryCountyFeeds(county);
    const maximumPrimary = primaryCountyFeeds(county, topicSlugs.slice(0, 4));
    const market = marketCountyFeeds(county);
    const nearby = nearbyCountyFeeds(county);

    check(primary.length > 0, `${county.slug}: missing primary feeds`);
    check(
      maximumPrimary.length <= countyFallbackFeedBounds.primary,
      `${county.slug}: primary feed bound exceeded`,
    );
    check(market.length > 0, `${county.slug}: missing market feeds`);
    check(
      market.length <= countyFallbackFeedBounds.market,
      `${county.slug}: market feed bound exceeded`,
    );
    check(nearby.length > 0, `${county.slug}: missing nearby feeds`);
    check(
      nearby.length <= countyFallbackFeedBounds.nearby,
      `${county.slug}: nearby feed bound exceeded`,
    );
    check(
      maximumPrimary.length + market.length + nearby.length <=
        countyFallbackFeedBounds.total,
      `${county.slug}: total county feed bound exceeded`,
    );

    for (const feedDefinition of primary) {
      check(
        feedDefinition.coverageTier === "county",
        `${feedDefinition.id}: primary tier is not county`,
      );
      check(
        feedDefinition.countySlug === county.slug,
        `${feedDefinition.id}: primary county slug mismatch`,
      );
    }
    for (const feedDefinition of market) {
      check(
        feedDefinition.coverageTier === "market",
        `${feedDefinition.id}: market tier mismatch`,
      );
      check(Boolean(feedDefinition.coverageLabel), `${feedDefinition.id}: missing market label`);
      check(feedDefinition.countySlug === undefined, `${feedDefinition.id}: market leaked county slug`);
    }
    for (const feedDefinition of nearby) {
      check(
        feedDefinition.coverageTier === "nearby",
        `${feedDefinition.id}: nearby tier mismatch`,
      );
      check(Boolean(feedDefinition.coverageLabel), `${feedDefinition.id}: missing nearby label`);
      check(feedDefinition.countySlug === undefined, `${feedDefinition.id}: nearby leaked county slug`);
    }

    for (const feedDefinition of [...primary, ...market, ...nearby]) {
      check(
        feedDefinition.locationTerms.length > 0,
        `${feedDefinition.id}: missing article location evidence`,
      );
      const url = new URL(feedDefinition.url);
      if (url.hostname === "news.google.com") {
        const query = url.searchParams.get("q") || "";
        check(query.includes("Texas"), `${feedDefinition.id}: query is not Texas-qualified`);
        const expectedWindow =
          feedDefinition.coverageTier === "market" ||
          feedDefinition.coverageTier === "nearby"
            ? "when:60d"
            : "when:30d";
        check(query.includes(expectedWindow), `${feedDefinition.id}: query is not age-bounded`);
        check(feedDefinition.url.length < 4_096, `${feedDefinition.id}: query URL is too long`);
      }
    }
  }

  expect(issues).toEqual([]);
});

test("renders the home feed, sponsor content, and core filter controls", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /Great Texas possibilities/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Texas. Your perspective." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Texas statewide articles" })).toBeVisible();
  await expect(page.getByText("Texas semiconductor manufacturing expansion adds jobs")).toBeVisible();
  await expect(page.locator(".ad-disclosure").first()).toHaveText("Advertisement");
  await expect(page.locator(".ad-label").first()).toHaveText("Double B Ranch");
  await expect(page.getByText("Paid sponsor")).toHaveCount(0);
  await expect(page.getByText("House ad")).toHaveCount(0);
  const sponsorLink = page.locator(".controls-card").getByRole("link", { name: /^Advertisement for Double B Ranch/ });
  await expect(sponsorLink).toBeVisible();
  await expect(sponsorLink).toHaveAttribute("rel", /sponsored/);
  await expect(page.locator(".controls-card").getByText("Premium ranch products from Double B Ranch")).toHaveCount(0);
  await expect(page.locator(".news-card img")).toHaveCount(0);
  await expect(page.getByText(/Newest first. Keep scrolling for older stories/)).toBeVisible();
  await expect(page.locator(".news-card").first()).not.toContainText("Texas statewide manufacturing and AI infrastructure investment");
  await expect(page.getByRole("link", { name: /TexasBusiness.News Business/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy Statement" })).toBeVisible();
});

test("restores saved county filters alongside the statewide feed", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem("texasbusiness-news:selected-counties", JSON.stringify(["potter"]));
  });
  await page.reload();

  await expect(page.getByRole("heading", { name: "Texas statewide articles" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Potter County coverage" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Potter County" })).toBeVisible();
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

  await expect(page.getByRole("heading", { name: "Potter County coverage" })).toBeVisible();
  await expect(page.getByText(localTitle).first()).toBeVisible();
  await expect(page.getByText("News API unavailable")).toHaveCount(0);
});

test("uses honest market and nearby coverage when a rural county feed is sparse", async ({ page }) => {
  const county = getCountyBySlug("king");
  expect(county).toBeTruthy();
  if (!county) return;

  const primary = primaryCountyFeeds(county);
  const market = marketCountyFeeds(county);
  const nearby = nearbyCountyFeeds(county);
  const primaryUrls = new Set(primary.map((feedDefinition) => feedDefinition.url));
  const marketByUrl = new Map(market.map((feedDefinition) => [feedDefinition.url, feedDefinition]));
  const nearbyByUrl = new Map(nearby.map((feedDefinition) => [feedDefinition.url, feedDefinition]));
  const marketTitle = `${market[0].locationTerms[0]} manufacturing expansion adds jobs`;
  const nearbyTitle = `${nearby[0].locationTerms[0]} small business investment creates jobs`;
  let marketRequests = 0;
  let nearbyRequests = 0;

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
    if (primaryUrls.has(feedUrl)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", items: [] }),
      });
    }

    const marketDefinition = marketByUrl.get(feedUrl);
    if (marketDefinition) {
      marketRequests += 1;
      const title = `${marketDefinition.locationTerms[0]} manufacturing expansion adds jobs`;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(rssFallbackResponse(title)),
      });
    }

    const nearbyDefinition = nearbyByUrl.get(feedUrl);
    if (nearbyDefinition) {
      nearbyRequests += 1;
      const title = `${nearbyDefinition.locationTerms[0]} small business investment creates jobs`;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(rssFallbackResponse(title)),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", items: [] }),
    });
  });

  await page.goto("/county/king");

  await expect(page.getByRole("heading", {
    name: "King County coverage",
  })).toBeVisible();
  const marketCard = page.locator(".news-card").filter({ hasText: marketTitle });
  const nearbyCard = page.locator(".news-card").filter({ hasText: nearbyTitle });
  await expect(marketCard).toContainText(`Market coverage: ${market[0].coverageLabel}`);
  await expect(nearbyCard).toContainText(`Nearby coverage: ${nearby[0].coverageLabel}`);
  await expect(marketCard).not.toContainText("King County");
  await expect(nearbyCard).not.toContainText("King County");
  await expect(marketCard.locator('a[href^="/county/king/topic/"]')).toHaveCount(0);
  await expect(nearbyCard.locator('a[href^="/county/king/topic/"]')).toHaveCount(0);
  await expect(marketCard.getByRole("link", { name: "Jobs", exact: true })).toHaveAttribute("href", "/topic/jobs");
  await expect(nearbyCard.getByRole("link", { name: "Jobs", exact: true })).toHaveAttribute("href", "/topic/jobs");
  expect(marketRequests).toBe(market.length);
  expect(nearbyRequests).toBe(nearby.length);
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
  await page.getByRole("combobox", { name: /Choose counties/ }).fill("Potter");
  await page.getByRole("option", { name: /Potter County/ }).click();
  await page.getByRole("combobox", { name: /Choose counties/ }).fill("Randall");
  await page.getByRole("option", { name: /Randall County/ }).click();

  await expect(page.getByRole("button", { name: "Remove Potter County" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Randall County" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected county coverage" })).toBeVisible();

  await openResponsiveFilters(page);
  await page.getByRole("button", { name: "DFW" }).click();
  await expect(page.getByRole("button", { name: "Remove DFW region" })).toBeVisible();

  await page.getByRole("button", { name: "Energy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Energy industry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Energy news across Texas." })).toBeVisible();
});

test("finds a rural county through its town name", async ({ page }) => {
  await page.getByRole("combobox", { name: /Choose counties/ }).fill("Lufkin");
  await page.getByRole("option", { name: /Angelina County/ }).click();
  await expect(page.getByRole("button", { name: "Remove Angelina County" })).toBeVisible();
});

test("keeps filter selections within the API fan-out budget", async ({ page }) => {
  await openResponsiveFilters(page);
  for (const industry of ["Energy", "Robotics", "Small Business", "Infrastructure"]) {
    await page.getByRole("button", { name: industry, exact: true }).click();
  }

  await expect(page.getByRole("button", { name: "Technology", exact: true })).toBeDisabled();
  await expect(page.locator("#feed-selection-status")).toContainText("Choose up to 4 counties, 4 regions, and 4 industries");
});

test("keeps filters visible and provides accessible floating mobile navigation", async ({ page }, testInfo) => {
  const menuButton = page.getByRole("button", { name: "Menu", exact: true });
  const floatingButton = page.getByRole("button", { name: "Open navigation menu", exact: true });
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(page.getByRole("button", { name: "DFW", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Technology", exact: true })).toBeVisible();
  await expect(page.locator(".controls-card input[type=checkbox]")).toHaveCount(0);

  if (testInfo.project.name === "mobile-chrome") {
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(navigation.getByRole("link", { name: "Counties" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menuButton).toBeFocused();
    await page.locator(".footer").scrollIntoViewIfNeeded();
    await expect(floatingButton).toBeInViewport();
    await floatingButton.click();
    await expect(navigation.getByRole("link", { name: "Feed", exact: true })).toBeFocused();
    await expect(navigation).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(floatingButton).toBeFocused();
    await expect(floatingButton).toHaveAttribute("aria-expanded", "false");
    await floatingButton.click();
    await navigation.getByRole("link", { name: "Counties" }).click();
    await expect(page).toHaveURL(/counties/);
    await expect(floatingButton).toHaveAttribute("aria-expanded", "false");
    await expect(navigation).toBeHidden();
    await floatingButton.click();
    await page.locator(".page-hero h1").click();
    await expect(floatingButton).toHaveAttribute("aria-expanded", "false");
    return;
  }
  await expect(menuButton).toBeHidden();
  await expect(floatingButton).toBeHidden();
});

test("uses the desktop width and keeps the connected map and footer responsive", async ({ page }) => {
  for (const width of [2560, 1920, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const hero = await page.locator(".hero").boundingBox();
    expect(hero!.width).toBeGreaterThan(width * .88);
    const map = await page.locator(".texas-map").boundingBox();
    expect(map!.y).toBeGreaterThanOrEqual(hero!.y);
    expect(map!.y + map!.height).toBeLessThanOrEqual(hero!.y + hero!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator("#feed-filter-panel")).toBeVisible();
  }
  const mapImage = page.locator(".texas-map img");
  await expect(mapImage).toBeVisible();
  expect(await mapImage.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(600);
  const illustration = await mapImage.getAttribute("src");
  await page.goto(illustration!);
  await expect(page.locator("svg text")).toHaveCount(0);
  expect(await page.locator("svg circle").count()).toBeGreaterThan(600);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".network-beam").first().evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("renders shareable county and county-topic routes", async ({ page }) => {
  await page.goto("/county/dallas");
  await expect(page.getByRole("button", { name: "Remove Dallas County" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dallas County coverage" })).toBeVisible();
  await expect(page.getByText(/^Dallas County, Texas .* creates positive growth$/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Texas statewide articles" })).toBeVisible();
  await expect(page.getByText("Texas semiconductor manufacturing expansion adds jobs")).toBeVisible();

  await page.goto("/county/dallas/topic/jobs");
  await expect(page.getByRole("heading", { name: "Jobs news across Texas." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dallas County coverage" })).toBeVisible();
});

test("renders shareable region and region-industry routes", async ({ page }) => {
  await page.goto("/region/permian-basin");
  await expect(page.getByRole("heading", { name: "Permian Basin growth news." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Permian Basin region" })).toBeVisible();

  await page.goto("/region/gulf/industry/finance");
  await expect(page.getByRole("heading", { name: "Finance news across Texas." })).toBeVisible();
  await openResponsiveFilters(page);
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
  await expect(page.getByText("Browser preferences and RSS cache")).toBeVisible();
  await expect(page.getByText("Texas privacy rights")).toBeVisible();

  await page.goto("/methodology");
  await expect(page.getByRole("heading", { name: "How the Texas business feed is built." })).toBeVisible();
  await expect(page.getByText("Rights-conscious article cards")).toBeVisible();

  await page.goto("/advertising-standards");
  await expect(page.getByRole("heading", { name: "Paid placements must earn reader trust." })).toBeVisible();
  await expect(page.getByText("Prohibited advertising")).toBeVisible();

  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Reach TexasBusiness.News." })).toBeVisible();
  await expect(page.getByRole("link", { name: "admin@texasbusiness.news", exact: true })).toBeVisible();

  await page.goto("/not-a-real-route");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to feed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse counties" })).toBeVisible();
});

test("loads the market ticker vendors on every page", async ({ page }) => {
  // The consent gate was removed: both vendors now load for every reader, and
  // the Privacy Statement says so rather than promising they are blocked.
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__tradingViewMocked)))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__liveCoinWatchMocked)))
    .toBe(true);
  await expect(page.getByText("Optional LiveCoinWatch and TradingView tickers are off.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Manage privacy choices" })).toHaveCount(0);
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

test("keeps loading more stories as the reader scrolls", async ({ page }) => {
  const requestedOffsets: string[] = [];
  const pageLength = 60;
  const total = 180;

  await page.unroute("**/v1/pages/home**");
  await page.route("**/v1/pages/home**", (route) => {
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get("offset") ?? "0");
    requestedOffsets.push(String(offset));
    const items = Array.from({ length: Math.max(0, Math.min(pageLength, total - offset)) }, (_, index) => ({
      id: `paged-${offset + index}`,
      title: `Texas manufacturer ${offset + index} expands and adds jobs`,
      link: `https://publisher.example/story-${offset + index}`,
      source: "Example Texas Business Journal",
      publishedAt: fetchedAt,
      topics: ["jobs"],
      coverageTier: "statewide",
      feedLabel: "Texas Business",
    }));
    const feed = {
      items,
      meta: {
        count: items.length,
        total,
        hasMore: offset + items.length < total,
        sourcesUsed: ["Example Texas Business Journal"],
        fetchedAt,
        cacheTtlSeconds: 900,
        stale: false,
        partialFailures: 0,
      },
    };
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ county: null, statewide: feed, meta: { fetchedAt } }),
    });
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Texas statewide articles" })).toBeVisible();
  await expect(page.locator(".news-card").first()).toBeVisible();

  // Scroll until the feed reports every story, or we run out of patience.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if ((await page.locator(".news-card").count()) >= total) break;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(220);
  }

  expect(await page.locator(".news-card").count()).toBe(total);
  expect(requestedOffsets).toContain("60");
  expect(requestedOffsets).toContain("120");
  // Nothing is requested past the end of the feed.
  expect(requestedOffsets).not.toContain(String(total));
  await expect(page.locator(".load-more")).toHaveAttribute("data-can-fetch-more", "false");
});


test("county autocomplete supports keyboard selection, empty states, and bounded results", async ({ page }) => {
  const search = page.getByRole("combobox", { name: /Choose counties/ });
  await search.focus();
  await expect(search).toHaveAttribute("aria-expanded", "true");
  expect(await page.getByRole("option").count()).toBeLessThanOrEqual(8);
  await search.fill("Frisco");
  await expect(page.getByRole("option", { name: /Collin County/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Denton County/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.getByRole("button", { name: "Remove Denton County" })).toBeVisible();
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await search.fill("not-a-texas-place");
  await expect(page.getByText(/No available counties match/)).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await expect(search).toBeFocused();
  await search.fill("a");
  expect(await page.getByRole("option").count()).toBeLessThanOrEqual(8);
  await search.press("Tab");
  await page.getByRole("heading", { name: /Great Texas possibilities/ }).click();
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Remove Denton County" }).click();
  await expect(page.getByRole("button", { name: "Remove Denton County" })).toHaveCount(0);
});

test("county autocomplete prevents excess selections and can reset the feed", async ({ page }) => {
  const search = page.getByRole("combobox", { name: /Choose counties/ });
  for (const county of ["Harris", "Dallas", "Travis", "Bexar"]) {
    await search.fill(county);
    await page.getByRole("option", { name: new RegExp(`^${county} County`) }).click();
  }
  await search.fill("Potter");
  await expect(page.getByRole("option", { name: /Potter County/ })).toHaveAttribute("aria-disabled", "true");
  await search.press("Enter");
  await expect(page.getByRole("button", { name: "Remove Potter County" })).toHaveCount(0);
  await search.press("Escape");
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator(".selected-counties button")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("texasbusiness-news:selected-counties") || "[]"))).toEqual([]);
});

test("market selector and unified masthead remain usable on small screens", async ({ page }) => {
  await expect(page.getByRole("complementary", { name: "Market ticker", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Crypto", exact: true }).click();
  await expect(page.getByRole("button", { name: "Crypto", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("complementary", { name: "Crypto ticker", exact: true })).toBeVisible();
  await expect(page.locator(".hero-panel")).toHaveCount(0);
  await expect(page.locator("header")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("offers verified TXSE resources and a matching static site mark", async ({ page }) => {
  await page.locator('.market-switch').getByRole('link', { name: /TXSE/ }).click();
  await expect(page.getByRole('heading', { name: 'Texas Stock Exchange', exact: true })).toBeVisible();
  await expect(page.locator('.exchange-listing')).toHaveCount(6);
  await expect(page.getByRole('link', { name: /Open TXSE market display/ })).toHaveAttribute('href', 'https://live.txse.com/outputs/live-banner-6/index.html');
  await expect(page.getByRole('link', { name: /All official listings/ })).toHaveAttribute('href', 'https://www.txse.com/all-listings');
  await expect(page.locator('.exchange-note')).toContainText('verified October 26, 2026');
  await expect(page.locator('.site-header .brand-mark')).toHaveAttribute('src', '/texas-mark.svg');
  const icon = await page.request.get('/texas-mark.svg');
  expect(icon.ok()).toBe(true);
  expect(await icon.text()).not.toMatch(/<animate|@keyframes|animation:/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/texas-mark.svg');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reuses recent filter results, refreshes on request, and hides mismatched stories", async ({ page }) => {
  const original = 'Texas semiconductor manufacturing expansion adds jobs';
  await expect(page.getByRole('link', { name: original, exact: true })).toBeVisible();
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let generalRequests = 0;
  await page.route('**/v1/pages/home**', async (route) => {
    const data = homePageResponse(route.request().url());
    const isEnergy = new URL(route.request().url()).searchParams.get('topics') === 'energy';
    if (isEnergy) { await gate; data.statewide.items[0].title = 'Texas energy project creates new jobs'; }
    else generalRequests += 1;
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(data)});
  });
  await page.getByRole('button', { name: 'Energy', exact: true }).click();
  await expect(page.getByRole('link', { name: original, exact: true })).toBeHidden();
  release!();
  await expect(page.getByRole('link', { name: 'Texas energy project creates new jobs', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'All growth', exact: true }).click();
  await expect(page.getByRole('link', { name: original, exact: true })).toBeVisible();
  expect(generalRequests).toBe(0);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => generalRequests).toBe(1);
});

test("scrolls beyond 240 stories through an empty history window while retaining filters", async ({ page }) => {
  const cursors: string[] = [];
  await page.unroute("**/v1/pages/home**");
  await page.route("**/v1/pages/home**", route => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("regions")).toBe("dfw");
    expect(url.searchParams.get("topics")).toBe("semiconductors");
    const cursor = url.searchParams.get("statewideCursor") ?? "first";
    cursors.push(cursor);
    const number = cursor === "first" ? 0 : Number(cursor.slice(1));
    const empty = number === 2;
    const count = empty ? 0 : 60;
    const items = Array.from({ length: count }, (_, i) => ({
      id: `history-${number}-${i}`, title: `Dallas chip factory ${number}-${i} expands`,
      link: `https://example.com/history-${number}-${i}`, topics: ["semiconductors"],
      publishedAt: new Date(Date.parse(fetchedAt) - (number * 60 + i) * 86400000).toISOString(),
      source: "Example Texas Business Journal", coverageTier: "statewide",
    }));
    const section = feed(items);
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ county: null,
      statewide: { ...section, meta: { ...section.meta, hasMore: number < 5, ...(number < 5 ? { nextCursor: `p${number + 1}` } : {}), history: number > 0 } }, meta: { fetchedAt } }) });
  });
  await page.goto("/region/dfw/industry/semiconductors");
  for (let i = 0; i < 55; i++) {
    if (await page.locator(".news-card").count() === 300) break;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
  }
  await expect(page.locator(".news-card")).toHaveCount(300);
  expect(cursors[0]).toBe("first");
  expect(cursors.filter(cursor => cursor !== "first")).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  const dates = await page.locator(".news-card time").evaluateAll(elements => elements.map(e => Date.parse(e.getAttribute("datetime")!)));
  expect(dates).toEqual([...dates].sort((a, b) => b - a));
  await expect(page.getByRole("button", { name: "End of matching stories" })).toBeDisabled();
});

test("retries a failed history page without discarding stories or advancing its cursor", async ({ page }) => {
  let attempts = 0;
  await page.unroute("**/v1/pages/home**");
  await page.route("**/v1/pages/home**", route => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get("statewideCursor");
    if (cursor) {
      expect(cursor).toBe("older"); attempts++;
      if (attempts === 1) return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({error:{message:"Temporary fixture failure"}}) });
    }
    const section = feed([{ id: cursor ? "older-story" : "recent-story", title: cursor ? "Dallas chip factory expands in February" : "Dallas chip factory expands in June",
      link: `https://example.com/${cursor ?? "recent"}`, topics: ["semiconductors"], publishedAt: cursor ? "2026-02-01T12:00:00Z" : fetchedAt }]);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ county:null,
      statewide:{ ...section, meta:{ ...section.meta, hasMore:!cursor, ...(!cursor ? {nextCursor:"older"} : {}) } }, meta:{ fetchedAt } }) });
  });
  await page.goto("/topic/semiconductors");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const retry = page.getByRole("button", { name:"Retry loading older stories" });
  await expect(retry).toBeVisible();
  await expect(page.locator(".news-card")).toHaveCount(1);
  await page.waitForTimeout(300);
  expect(attempts).toBe(1);
  await retry.click();
  await expect(page.locator(".news-card")).toHaveCount(2);
  expect(attempts).toBe(2);
});

test("labels statewide context on a county desk without presenting it as county-local news", async ({ page }) => {
  await page.unroute("**/v1/pages/home**");
  await page.route("**/v1/pages/home**", route => {
    const section = feed([{ id: "state-context", title: "Texas workforce investment creates new jobs", link: "https://example.com/state-context",
      topics: ["jobs"], publishedAt: fetchedAt, coverageTier: "statewide",
      coverageLabel: "Texas statewide context — no matching local or nearby reports in this period" }]);
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ county:section, statewide:feed([]),meta:{fetchedAt} })});
  });
  await page.goto("/county/loving");
  await expect(page.getByRole("heading", {name:"Loving County coverage"})).toBeVisible();
  await expect(page.locator(".news-card").first()).toContainText("Texas statewide context");
  await expect(page.locator(".news-card").first()).not.toContainText("Loving County growth");
});
