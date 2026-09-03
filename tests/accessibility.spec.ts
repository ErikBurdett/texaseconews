import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated WCAG 2.1 A/AA checks across the main templates.
 *
 * Automated testing catches only part of what matters for accessibility, but a
 * public, ad-supported site is a realistic target for an ADA Title III demand
 * letter, and a failing check in CI is the cheapest possible moment to find a
 * violation. The published commitment is in the Accessibility Statement at
 * /accessibility.
 */

const templates = [
  { path: "/", name: "home" },
  { path: "/counties", name: "county directory" },
  { path: "/county/potter", name: "county feed" },
  { path: "/topic/energy", name: "industry feed" },
  { path: "/contact", name: "contact" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
  { path: "/accessibility", name: "accessibility statement" },
  { path: "/advertising-standards", name: "advertising standards" },
];

test.beforeEach(async ({ page }) => {
  // Both ticker vendors load on every page now, so stub them rather than
  // letting the audit wait on third-party scripts.
  await page.route("https://s3.tradingview.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );
  await page.route("https://www.livecoinwatch.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );
  await mockNewsApi(page);
});

for (const template of templates) {
  test(`has no detectable accessibility violations on the ${template.name} template`, async ({ page }) => {
    await page.goto(template.path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(describeViolations(results.violations)).toEqual([]);
  });
}

function describeViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes
      .map((node) => `${node.target.join(" ")} — ${node.failureSummary ?? ""}`)
      .slice(0, 5),
  }));
}

async function mockNewsApi(page: Page) {
  await page.route("**/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(newsResponse(route.request().url())),
    }),
  );
}

function newsResponse(requestUrl: string) {
  const feed = {
    items: [
      {
        id: "accessibility-fixture",
        title: "Texas semiconductor manufacturing expansion adds jobs",
        link: "https://www.texastribune.org/texas-growth",
        source: "The Texas Tribune",
        sourceUrl: "https://www.texastribune.org/",
        publishedAt: "2026-09-01T12:00:00.000Z",
        feedLabel: "Texas Business",
        topics: ["jobs", "manufacturing", "semiconductors"],
        coverageTier: "statewide",
        coverageLabel: "Texas statewide coverage",
      },
    ],
    meta: {
      count: 1,
      sourcesUsed: ["The Texas Tribune"],
      fetchedAt: "2026-09-01T12:00:00.000Z",
      cacheTtlSeconds: 900,
      stale: false,
      partialFailures: 0,
      coverageMix: { statewide: 1 },
    },
  };

  if (!requestUrl.includes("/v1/pages/home")) return feed;
  const hasCounty = Boolean(new URL(requestUrl).searchParams.get("counties"));
  return {
    county: hasCounty ? feed : null,
    statewide: feed,
    meta: { fetchedAt: feed.meta.fetchedAt },
  };
}
