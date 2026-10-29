import { expect, test } from "@playwright/test";

const destinations = ["https://bbranchtexas.com/", "https://www.advancedmatrixllc.net/", "https://windseyecapital.com/", "https://westernheritagerealtytx.com/"];

test.beforeEach(async ({ page }) => {
  await page.route("https://s3.tradingview.com/**", route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route("**/v1/pages/home**", route => route.fulfill({ json: {
    county: null,
    statewide: { items: Array.from({ length: 48 }, (_, i) => ({ id: `story-${i}`, title: `Texas business expansion ${i}`, link: `https://example.com/${i}`, source: "Texas newsroom", publishedAt: new Date().toISOString(), topics: ["jobs"], coverageTier: "statewide", coverageLabel: "Texas statewide" })), meta: { count: 48, sourcesUsed: [], fetchedAt: new Date().toISOString(), cacheTtlSeconds: 900, stale: false, partialFailures: 0 } },
    meta: { fetchedAt: new Date().toISOString() },
  } }));
});

test("four advertisers have distinct feed placements and safe new-tab destinations", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero .eyebrow")).toHaveText("Texas Business News");
  await expect(page.locator(".hero-howdy")).toContainText("Howdy Y’all");
  await expect(page.locator(".hero-mission")).toContainText("Y’all Street and Outer-Space");
  const spotlight = page.locator(".partner-spotlight .ad-card");
  await expect(spotlight).toHaveCount(4);
  await expect(page.locator('.feed-ad-break .ad-card')).toHaveCount(4);
  expect(await page.locator('.feed-ad-break .ad-card').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(destinations);
  for (let i = 0; i < destinations.length; i++) {
    await expect(spotlight.nth(i)).toHaveAttribute("href", destinations[i]);
    await expect(spotlight.nth(i)).toHaveAttribute("target", "_blank");
    await expect(spotlight.nth(i)).toHaveAttribute("rel", /sponsored.*noopener.*noreferrer/);
    await expect(spotlight.nth(i).locator('.ad-disclosure')).toHaveText('Advertisement');
    await spotlight.nth(i).scrollIntoViewIfNeeded();
    await expect.poll(() => spotlight.nth(i).locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("partner directory renders verified profiles and opens advertiser websites separately", async ({ page, context }) => {
  await page.goto("/partners");
  await expect(page).toHaveTitle(/Advertiser Partners/);
  const profiles = page.locator('.partner-profile');
  await expect(profiles).toHaveCount(4);
  for (let i = 0; i < destinations.length; i++) {
    const profile = profiles.nth(i);
    await expect(profile.getByRole('heading', { name: 'A part of Texas growth' })).toBeVisible();
    const link = profile.locator('.partner-visit');
    await expect(link).toHaveAttribute('href', destinations[i]);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /sponsored.*noopener.*noreferrer/);
    await profile.scrollIntoViewIfNeeded();
    await expect.poll(() => profile.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await context.route('https://www.advancedmatrixllc.net/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Advertiser destination</h1>' }));
  const popupPromise = page.waitForEvent('popup');
  await profiles.nth(1).locator('.partner-visit').click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(destinations[1]);
  await expect(page).toHaveURL(/\/partners$/);
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Advertiser partners' })).toHaveAttribute('href', '/partners');
});
