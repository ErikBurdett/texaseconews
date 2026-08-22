# TexasBusiness.News Development Update

Last updated: August 22, 2026

## Executive Summary

TexasBusiness.News is currently a lightweight frontend-only React SPA for positive Texas business news. It has a working Vite/React foundation, client-side routing, county and topic filters, sponsor placements, external RSS ingestion through client-side proxy providers, and AWS Amplify deployment notes. There is no backend, database, authentication, CMS, or editorial workflow yet.

The current app is a substantial lightweight MVP: the expanded Texas business taxonomy, region and industry filtering, legal pages, EmailJS contact flow, sponsor system, responsive layouts, and deterministic browser-test coverage are implemented. Production readiness still requires better SEO/share metadata, CI execution of the browser suite, deployed-device performance validation, content-source governance, and Amplify security hardening.

## August 22, 2026 Development Status

### Current Product State

- Public brand is `TexasBusiness.News`.
- Frontend remains a static Vite/React application with no backend or accounts.
- Users can combine multiple counties, regions, and industries in one feed.
- Article cards include full publication dates and matching industry tags.
- Statewide, county, region, industry, region-industry, legal, contact, mission, and advertising routes are available.
- Contact submissions use EmailJS and send to `admin@texasbusiness.news` when the three required `VITE_EMAILJS_*` variables are configured in Amplify.
- RSS provider environment variables remain optional because built-in RSS2JSON and AllOrigins defaults are present.

### Advertising

- Double B Ranch is the only active advertiser.
- `ad-assets/bb-ranch-deer-final.png` is the only ad asset.
- The same Double B Ranch creative is eligible for hero, sidebar, inline-feed, and footer placements.
- All other ad creatives and ad assets have been removed.
- The supplied PNG is 4.58 MB. Browser decoding is asynchronous and layout dimensions are reserved, but the source should be compressed substantially before production to improve first-load performance.
- The advertiser-preview branch adds fixed Preferred, Gold, Platinum, County, and custom Statewide packages; pricing is not based on population.
- `/advertise` now previews 250×250, Presented by, and responsive 980×300 formats with the complete fixed rate card.
- `/payments` provides a campaign-request builder, fixed-price estimates, EmailJS submission, local creative validation, and a visibly disabled future Stripe checkout stage.
- Responsive in-feed placeholder inventory appears after every five article cards.
- `advertising_pricing.md` is the source of truth for package rates, placement mapping, annual and additional-county rules, creative specifications, submission, measurement, and advertising standards.

### Ticker Performance Refinement

- LiveCoinWatch and TradingView now mount once at the application root instead of remounting on route changes.
- Third-party ticker scripts initialize after the critical React render.
- The LiveCoinWatch marquee was reduced from 20 to 12 items to lower animation and DOM workload.
- The ticker stack is no longer sticky, avoiding continuous repaint/compositing work while the page scrolls.
- Ticker containers are isolated into fixed-size paint/compositing layers and expensive ticker shadows were removed.
- Production should be rechecked on desktop, mobile, 4K, and ultrawide displays because final animation timing is controlled partly by third-party widget code and network delivery.

### Current Verification Priorities

1. Run the Playwright suite in CI or a Linux image with the required Chromium libraries.
2. Smoke-test ticker smoothness on the deployed Amplify domain and on lower-powered mobile hardware.
3. Compress the 4.58 MB sponsor PNG and verify the Double B Ranch destination, approved copy, and image rendering in every placement.
4. Verify EmailJS domain restrictions, template variables, and delivery to `admin@texasbusiness.news`.
5. Add route-specific SEO metadata, sitemap generation, and production security headers.

## Current Technical State

### Stack

- Vite React SPA with TypeScript.
- React Router for client-side routes.
- CSS in `src/styles.css`; no component library.
- County data from `@nickgraffis/us-counties` plus local Texas region, metro, and city aliases.
- Client-side RSS fetching from Google News RSS via AllOrigins first and RSS2JSON as fallback.
- Sponsor/ad placements use static local data; the sole active Double B Ranch creative opens its approved external destination.
- Deployment target is AWS Amplify Hosting through a GitHub connection.

### Existing Routes

- `/` statewide feed and county filter workspace.
- `/counties` county directory.
- `/mission` mission statement.
- `/advertise` sponsor page.
- `/payments` advertiser quote builder and campaign-request form.
- `/contact` EmailJS contact form.
- `/terms` terms of service.
- `/privacy` privacy statement.
- `/topic/:topicSlug` topic feed.
- `/industry/:topicSlug` industry feed alias.
- `/region/:regionSlug` region feed.
- `/region/:regionSlug/industry/:topicSlug` combined region-industry feed.
- `/county/:countySlug` county feed.
- `/county/:countySlug/topic/:topicSlug` county topic feed.
- `*` not-found recovery page.

### Existing Product Features

- Statewide positive Texas business feed.
- All 254 Texas counties available as filters.
- County search by county, city, metro, region, and comma-separated multi-search.
- Multi-select region and industry filters with removable selections.
- Expanded topics include energy, robotics, small business, infrastructure, technology, sports, finance, TX Stock Exchange, agriculture, space, real estate, ranching, cattle, higher education, medical, hunting, tourism, and state parks.
- County relevance gate to keep county feeds tied to local place signals.
- Positive business filter and negative/crime/tragedy keyword exclusions.
- Sole Double B Ranch sponsor creative with impression and click events pushed to `dataLayer`.
- Advertiser placement previews, fixed package pricing, and responsive in-feed placeholders after every five articles.
- LiveCoinWatch crypto and TradingView market ticker widgets.
- Incremental article loading, full publication dates, and matching industry tags.
- Contact form sends through EmailJS when `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` are configured.
- Responsive CSS for desktop and mobile.

### New Test Infrastructure Added

- Added `@playwright/test`.
- Added `npm run test:e2e`.
- Added `playwright.config.ts`.
- Added `tests/app.spec.ts` with deterministic mocked RSS/provider coverage for:
  - Home route, hero, feed, sponsor content.
  - Multi-county search for `Potter, Randall`.
  - DFW quick filter and Texas feed reset.
  - Topic navigation to Energy.
  - County route and county-topic route.
  - County directory search for Frisco/Collin.
  - Mission, advertise, and not-found pages.
  - Desktop Chromium and mobile Chrome profiles.
  - Basic unlabeled interactive control audit.
- Added Playwright output folders to `.gitignore`.
- Fixed an image-only article link accessibility issue by adding an accessible label.

## Verification Status

### Passing

- `npm run lint` passes.
- `npm run build` passes.
- Production build output is generated in `dist`.

### Environment Variables

Required in AWS Amplify for the contact form:

- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

The EmailJS template should accept `to_email`, `from_name`, `reply_to`, and `message`, with `to_email` set by the app to `admin@texasbusiness.news`.

Optional RSS override variables:

- `VITE_RSS_PROVIDER_URL`
- `VITE_RSS_RAW_PROXY_URL`

RSS should still work when the RSS variables are not set because the app falls back to built-in RSS2JSON and AllOrigins provider URLs.

### Browser Test Status

The Playwright suite now runs successfully in this WSL environment:

```text
12 passed
```

Coverage passes in desktop Chromium and mobile Chrome. CI should still install the Playwright browser and native dependencies before running `npm run test:e2e`.

## Feature Complete Definition For A Lightweight No-Backend MVP

The first production version should stay frontend-only unless a feature truly requires server-side persistence. Feature complete should mean:

- Users can browse positive Texas business stories by statewide scope, region, county, and topic.
- Meeting-note industries and regions are represented in the taxonomy and UI.
- Key pages exist for mission, advertise, privacy, terms, methodology/editorial standards, and contact via contact forms plus `admin@texasbusiness.news`.
- Deep links work on Amplify for every county, region, and topic route.
- Static sponsor placements work without collecting sensitive user data.
- Analytics are privacy-aware and documented.
- RSS/provider failure states are graceful and do not break the app.
- Basic SEO metadata exists for major routes.
- Lint, build, and Playwright E2E checks run in CI before deployment.

## Roadmap From Meeting Notes

### Phase 1: Taxonomy And Navigation

Add region filters and URL routes. Recommended region set:

- DFW.
- Austin Corridor.
- San Antonio.
- Texas Triangle: Houston, Dallas, Austin, and San Antonio.
- Texas Panhandle.
- Permian Basin.
- West Texas.
- Gulf Coast.

Add industry/topic coverage from the notes:

- Energy: oil, gas, wind, solar, nuclear, grid, transmission, batteries, geothermal, hydrogen, LNG.
- Finance: banking, fintech, private equity, insurance, Texas Financial System/Sector.
- Aerospace.
- Infrastructure, rock, construction, roads, ports, logistics, water, utilities.
- Semiconductors and chips.
- Robotics.
- Film industry, including the "future movie capital of the world" positioning.
- College and pro sports business.
- Theme parks and attractions.
- Defense and military.
- Medicine and health business.
- Agriculture.

Implementation recommendation:

- Replace the flat `topicCatalog` with a richer taxonomy object that supports parent topics, subtopics, display labels, query terms, and landing-page copy.
- Add `regionCatalog` with county slug lists and query aliases.
- Add routes like `/region/:regionSlug`, `/industry/:industrySlug`, and optionally `/region/:regionSlug/industry/:industrySlug`.

### Phase 2: Hero And Homepage Updates

Update the hero to make the broader Texas business scope obvious:

- Add a compact "Track Texas growth by region and industry" message.
- Add visible energy subtopic chips: Oil, Gas, Wind, Solar, Nuclear, Grid.
- Add high-value industry chips: Finance, Aerospace, Infrastructure, Semiconductors, Robotics, Film, Sports Business, Defense, Medicine, Agriculture.
- Consider a temporary Texas Stock Exchange banner: Texas Stock Exchange / "Y'all Street" opening in July. Verify the opening date and phrasing before publishing.
- Add sponsor or partner cards only after confirming spelling, desired copy, destination URL, and legal comfort for public-facing language.

### Phase 3: Region Pages

Create region landing pages with:

- Region-specific hero copy.
- Counties included in that region.
- Industry/topic chips scoped to that region.
- Region-specific sponsor slots.
- Shareable URLs.

Priority order:

1. DFW.
2. Austin Corridor.
3. San Antonio.
4. Texas Triangle.
5. Permian Basin.
6. Gulf Coast.
7. Texas Panhandle.
8. West Texas.

### Phase 4: Industry Pages

Create industry landing pages. Priority order based on meeting notes and current app fit:

1. Energy.
2. Finance and Texas Financial System/Sector.
3. Semiconductors and chips.
4. Infrastructure and construction.
5. Defense and military.
6. Medicine and health business.
7. Sports business.
8. Agriculture.
9. Aerospace.
10. Robotics.
11. Film industry.
12. Theme parks and attractions.

Sports business should include business operations, new facilities, training facilities, team business, ownership/investment, sports health insurance, and named research leads such as Cody Campbell and Deeter Prater after confirming details and legal comfort.

Medicine should include hospital construction, research, medical real estate, and institutions such as Baylor Scott & White, Rice, MD Anderson, and other Texas health systems. Use neutral source-driven wording.

Agriculture should include hemp, farming, ranching, cattle, food, water, logistics, agtech, and rural business development.

### Phase 5: Content Quality And Editorial Trust

Add a methodology page that explains:

- Texas-only scope.
- Positive business filter.
- County relevance checks.
- Why some stories are excluded.
- That stories come from third-party public feeds.
- How readers can suggest corrections or sources.

Add source quality handling:

- Prefer original publisher URLs where available.
- De-emphasize duplicate syndicated stories.
- Add source labels and publication dates consistently.
- Consider a curated allowlist/blocklist only if quality becomes a problem.

### Phase 6: Production And Amplify Readiness

Before production launch:

- Add Amplify SPA rewrite rule to serve `/index.html` with `200` for unmatched routes.
- Add custom response headers in Amplify for security.
- Add environment variable documentation for RSS providers.
- Run lint, build, and E2E in GitHub Actions before Amplify deployment.
- Confirm route deep links after deployment.
- Confirm third-party script loading and RSS proxy behavior from the production domain.

## Best Practice Audit

### Architecture

Current state is appropriate for a very lightweight frontend-only MVP. The app is simple, readable, and avoids premature backend complexity.

Recommended changes:

- Move `@vitejs/plugin-react` from runtime dependencies to devDependencies.
- Avoid `"latest"` dependency ranges for production stability. Use pinned or caret ranges after confirming versions.
- Split `src/App.tsx` into smaller route, feed, control, and layout components as features expand.
- Move taxonomy and route metadata into structured data files instead of hardcoding more UI branches.
- Add a lightweight error boundary around the feed experience.
- Consider a service-worker or local fallback only after confirming freshness requirements.

### Testing

Current state now has lint, build, and Playwright E2E scaffolding.

Recommended changes:

- Run Playwright in CI using a browser-ready image.
- Add unit tests for feed URL generation, county relevance, topic extraction, and positive/blocked keyword filters.
- Add route smoke tests for every new region and industry page.
- Add accessibility checks with `@axe-core/playwright` once Playwright runs in CI.
- Add a pre-deploy checklist for Amplify rewrites and headers.

### Accessibility

Current state has semantic headings, labels around checkbox pills, nav links, and visible button text. One image-only article link was fixed during this audit.

Recommended changes:

- Run automated axe checks.
- Verify color contrast for red/blue gradients, muted body text, and uppercase hero text.
- Add skip link to main content.
- Ensure focus states are visible on all chips, links, and county pills.
- Consider reducing extreme uppercase letter spacing on small screens.
- Confirm TradingView embed does not trap focus or create noisy screen-reader output.

### Security

Current risk is moderate because the app is static and has no auth or backend. Main concerns are third-party scripts, external links, and external feed content.

Recommended changes:

- Add Amplify security headers:
  - `Content-Security-Policy`.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy`.
  - `Permissions-Policy`.
  - `Strict-Transport-Security`.
- Keep `rel="noopener noreferrer"` on all external links.
- Sanitize any RSS-rendered HTML. Current code strips HTML for descriptions, which is good.
- Avoid rendering untrusted RSS HTML directly.
- Document third-party services: Google News RSS, AllOrigins, RSS2JSON, TradingView.
- Avoid collecting precise location, sensitive personal data, or user accounts unless a privacy program is in place.

### Privacy And Compliance

Because the site is Texas-focused and may serve Texas residents, treat the Texas Data Privacy and Security Act as a design constraint if analytics, ads, newsletter signups, or personalization are added.

Recommended changes before launch:

- Add Privacy Policy and Terms pages.
- Document analytics, ad measurement, third-party embeds, and RSS providers.
- If analytics or ad pixels are added, collect the minimum data needed and avoid sensitive data.
- Add a cookie/consent approach if using non-essential tracking technologies.
- Provide contact forms and `admin@texasbusiness.news` for privacy requests. Do not list phone numbers or street addresses.
- If newsletter/email is added, comply with CAN-SPAM.
- If SMS is added, comply with TCPA and get explicit opt-in.
- If sponsored content becomes paid editorial, follow FTC endorsement and native advertising disclosure expectations.
- For sports, health, finance, and defense topics, keep language source-backed and avoid implying investment, medical, legal, or insurance advice.
- For minors or school-related sports content, avoid collecting children-related personal information and avoid targeting children.

### Copyright And Content Rights

The app links to third-party stories and displays titles, snippets, source names, dates, and images from feeds.

Recommended changes:

- Keep excerpts short and link prominently to original publishers.
- Avoid copying full article bodies.
- Confirm image usage from RSS thumbnails is acceptable or switch to neutral fallback images.
- Add a takedown/contact process through contact forms and `admin@texasbusiness.news`.
- Preserve publisher attribution.
- Consider using only source-provided thumbnails or internal generic topic art.

### SEO And Discoverability

Current `index.html` has a basic site description, but route-specific metadata is not managed.

Recommended changes:

- Add route-specific title and meta description handling.
- Add Open Graph and Twitter card tags.
- Add JSON-LD for organization and article-list pages where appropriate.
- Add sitemap generation for static route catalog.
- Add canonical URLs.
- Add a robots policy.
- Ensure Amplify deep links return `200` and not `404`.

### Performance

Current bundle size is reasonable for an MVP. Main performance risks come from client-side RSS fanout and third-party scripts.

Recommended changes:

- Lazy-load the TradingView ticker or make it optional.
- Limit simultaneous feed requests for large multi-county selections.
- Add request timeouts and clearer feed failure messaging.
- Consider caching feed results in localStorage only if freshness and privacy tradeoffs are acceptable.
- Use fallback images to avoid broken or heavy remote thumbnails.

### Advertising And Sponsorship

Current sponsor cards are static and clearly labeled as sponsored.

Recommended changes:

- Create a sponsor disclosure standard.
- Add a media kit section on `/advertise`.
- Add region/topic sponsor inventory definitions.
- Keep ad event data anonymous unless a full consent/privacy system exists.
- Avoid sensitive targeting categories.
- Separate editorial taxonomy from sponsor targeting rules in the data model.

## Needed Features To Be Feature Complete

Must-have:

- Region filters and region routes.
- Expanded industry taxonomy from meeting notes.
- Updated hero with energy and industry chips.
- Texas Stock Exchange banner after verification.
- Static privacy, terms, methodology, and contact pages using contact forms and `admin@texasbusiness.news`.
- Amplify rewrite and security headers.
- CI that runs lint, build, and Playwright E2E.
- Route-specific SEO metadata.
- Accessibility pass for keyboard, focus, labels, and contrast.

Should-have:

- Region/industry sponsor placement model.
- Source methodology and correction process.
- Sitemap and canonical URLs.
- Better feed provider resilience and timeout behavior.
- Unit tests for feed filtering logic.
- Media kit content for advertisers.

Later:

- Editorial curation workflow.
- Newsletter signup.
- Saved preferences beyond localStorage.
- Backend feed cache if provider reliability or rate limits become a problem.
- Admin/sponsor dashboard.

## Open Questions

- Confirm public sponsor names, spelling, destination URLs, and approved ad copy before publishing.
- Confirm whether Texas Stock Exchange launch timing and "Y'all Street" banner copy are approved for publication.
- Confirm whether sports business should be a normal industry topic, a top-level section, or both.
- Confirm whether theme parks belong under Tourism, Real Estate/Development, or their own Attractions category.
- Confirm whether any named individuals should appear in public copy before legal/editorial review.
- Confirm analytics provider and whether consent management is required at launch.
- Confirm whether the site will collect contact forms or newsletter signups before a backend exists.

## Recommended Next Sprint

1. Implement `regionCatalog` and region routes.
2. Replace the current topic catalog with a hierarchical industry taxonomy.
3. Update the hero and filter UI to expose regions and industries.
4. Add legal/methodology/contact pages.
5. Add SEO metadata support.
6. Add Amplify headers and document the rewrite rule.
7. Run Playwright in a browser-ready CI environment and fix any E2E failures.
