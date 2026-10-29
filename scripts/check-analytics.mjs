import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Run against a production build (vite preview) or the deployed site. The real
// Google script runs, but collection requests are intercepted to keep QA out of
// the site's Analytics reports. No contact forms are submitted.
const origin = process.argv[2] || 'http://127.0.0.1:4175';
const local = new URL(origin).hostname === '127.0.0.1';
const policyFile = await readFile(new URL('../amplify.yml', import.meta.url), 'utf8');
const policy = policyFile.match(/key: Content-Security-Policy\s+value: >-\n([\s\S]*?)\n      - key:/)[1].trim().replace(/\s+/g, ' ');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const events = [];
    const violations = [];
    page.on('console', message => {
      if (/content security policy/i.test(message.text()) && /google/i.test(message.text())) violations.push(message.text());
    });
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.hostname.endsWith('google-analytics.com') || (url.hostname.endsWith('google.com') && url.pathname.includes('collect'))) {
        for (const line of (request.postData() || '').split('\n')) {
          const params = new URLSearchParams(url.search);
          for (const [key, value] of new URLSearchParams(line)) params.set(key, value);
          if (params.get('en')) events.push(Object.fromEntries(params));
        }
        await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      } else if (url.hostname === 's3.tradingview.com') {
        await route.fulfill({ contentType: 'application/javascript', body: '' });
      } else if (local && request.isNavigationRequest() && url.origin === origin) {
        const response = await route.fetch();
        await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
      } else await route.continue();
    });
    await page.goto(origin + '/mission');
    await page.waitForFunction(() => Boolean(window.google_tag_manager), undefined, { timeout: 20_000 });
    const deadline = Date.now() + 20_000;
    while (!events.some(event => event.en === 'page_view') && Date.now() < deadline) await page.waitForTimeout(200);
    assert.equal(events.filter(event => event.en === 'page_view').length, 1, 'Exactly one initial page view');
    assert.equal(events.find(event => event.en === 'page_view').tid, 'G-1B4J1YS4JK');
    assert.equal(await page.locator('#google-analytics-tag').count(), 1);
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    await page.getByRole('link', { name: 'Privacy Statement', exact: true }).click();
    await page.waitForURL('**/privacy');
    assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin, 'Navigation should remain client-side');
    const routeDeadline = Date.now() + 20_000;
    while (events.filter(event => event.en === 'page_view').length < 2 && Date.now() < routeDeadline) await page.waitForTimeout(200);
    await page.waitForTimeout(1500);
    const views = events.filter(event => event.en === 'page_view');
    assert.equal(views.length, 2, 'Exactly one page view per navigation');
    assert.equal(new URL(views[0].dl).pathname, '/mission');
    assert.equal(new URL(views[1].dl).pathname, '/privacy');
    assert.equal(views[1].tid, 'G-1B4J1YS4JK');
    assert.equal(new URL(views[1].dr).pathname, '/mission');
    assert.deepEqual(violations, [], 'No Google CSP violations');
    console.log(JSON.stringify({ origin, viewport, pageViews: views.map(event => ({ id: event.tid, page: new URL(event.dl).pathname })), googleCspViolations: violations.length }));
    await context.close();
  }
} finally { await browser.close(); }
