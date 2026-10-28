import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://s3.tradingview.com/**", route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route("**/v1/pages/home**", route => {
    const feed = { items: [], meta: { count: 0, total: 0, hasMore: false, sourcesUsed: [], fetchedAt: new Date().toISOString(), cacheTtlSeconds: 300, stale: false, partialFailures: 0 } };
    return route.fulfill({ json: { county: null, statewide: feed, meta: { fetchedAt: new Date().toISOString() } } });
  });
});

test("loads crypto only when selected, handles the vendor's null-data error, and retries", async ({ page }) => {
  let loads = 0;
  let outage = true;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("https://www.livecoinwatch.com/static/lcw-widget.js", route => {
    loads++;
    // Reproduce the vendor's actual non-200 -> callback(null) -> response.data bug.
    return route.fulfill({ contentType: "application/javascript", body: `
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => { if (xhr.readyState === 4) {
        const response = xhr.status === 200 ? JSON.parse(xhr.responseText) : null;
        document.querySelector('.livecoinwatch-widget-5').textContent = '$ ' + response.data[0].price;
      }};
      xhr.open('GET', 'https://http-api.livecoinwatch.com/widgets/coins'); xhr.send();` });
  });
  await page.route("https://http-api.livecoinwatch.com/**", route => outage ? route.abort("internetdisconnected") : route.fulfill({
    headers: { "access-control-allow-origin": "*" }, json: { data: [{ price: 100 }] },
  }));
  await page.goto("/");
  await page.waitForTimeout(600);
  expect(loads).toBe(0);
  await page.getByRole("button", { name: "Crypto", exact: true }).click();
  await expect(page.getByText("Crypto prices unavailable.")).toBeVisible();
  await expect(page.getByTitle("Crypto price ticker")).toHaveCount(0);
  expect(errors).toEqual([]);
  outage = false;
  await page.getByRole("button", { name: "Retry crypto" }).click();
  await expect(page.frameLocator('iframe[title="Crypto price ticker"]').locator("body")).toContainText("$ 100");
  await expect(page.getByText("Loading crypto prices…")).toHaveCount(0);
  expect(loads).toBe(2);
  await page.getByRole("button", { name: "Stocks", exact: true }).click();
  await expect(page.getByTitle("Crypto price ticker")).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Market ticker", exact: true })).toBeVisible();
  // Host-page errors must remain observable; only the ticker frame handles its own failures.
  await page.evaluate(() => { setTimeout(() => { throw new Error("host-page-test-error"); }, 0); });
  await expect.poll(() => errors).toEqual(["host-page-test-error"]);
});

test("blocked vendor scripts show a usable fallback without affecting navigation", async ({ page }) => {
  await page.route("https://www.livecoinwatch.com/**", route => route.abort("blockedbyclient"));
  await page.goto("/");
  await page.getByRole("button", { name: "Crypto", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry crypto" })).toBeVisible();
  await page.locator(".market-switch").getByRole("link", { name: /TXSE/ }).click();
  await expect(page.getByRole("heading", { name: "Texas Stock Exchange", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a silent widget failure times out instead of showing a blank ticker forever", async ({ page }) => {
  await page.clock.install();
  await page.route("https://www.livecoinwatch.com/**", route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.goto("/");
  await page.getByRole("button", { name: "Crypto", exact: true }).click();
  await page.clock.fastForward(16_000);
  await expect(page.getByRole("button", { name: "Retry crypto" })).toBeVisible();
});
