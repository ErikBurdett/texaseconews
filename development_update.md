# TexasBusiness.News Development Update

Last updated: August 31, 2026

## Executive Summary

TexasBusiness.News is currently a lightweight React SPA for positive Texas business news. It has a working Vite/React foundation, client-side routing, county and topic filters, sponsor placements, a typed integration with the TexasBusiness.News page API, an outage-only RSS proxy fallback, and AWS Amplify deployment notes. The product still has no accounts, authentication, CMS, or editorial workflow.

The current app is a substantial lightweight MVP: the expanded Texas business taxonomy, region and industry filtering, comprehensive legal pages, EmailJS contact flow, sponsor system, responsive layouts, and deterministic browser-test coverage are implemented. The August 31 compliance pass adds explicit paid-ad labels, a public advertising policy, optional-widget choice, a conservative metadata-only article format, a source-by-source RSS rights audit, and a draft advertiser agreement. Production readiness still requires counsel approval, signed source and advertiser agreements, reviewed vendor terms, CI execution, SEO/share metadata, deployed-device performance validation, and Amplify security hardening.

## August 31, 2026 Compliance Update

### Paid Advertising

- Every `AdSlot` and compact sponsor badge visibly displays `Advertisement` and `Paid sponsor`, identifies Double B Ranch, and has an accessible paid-ad name.
- External sponsor links now use HTTPS plus `rel="sponsored nofollow noopener noreferrer"` and a strict-origin referrer policy.
- Ad measurement was minimized to event type, campaign, sponsor, and slot in an in-memory `dataLayer`; county and region fields were removed and no analytics recipient is connected.
- `/advertising-standards` publishes disclosure, prohibited-category, restricted-category, substantiation, rights, destination, privacy, review, and enforcement rules.
- `advertising_compliance.md` defines campaign preflight, disclosure screenshots, claim files, records, complaints, retention questions, and a paid-launch gate.
- `advertiser_insertion_order_template.md` provides a counsel-review contract and campaign order. It is not approved for signing until the legal operator identity and final clauses are completed.
- Paid launch remains blocked until counsel approves the policy stack, the active campaign has a signed agreement, source rights are complete, vendor contracts are reviewed, and responsible human reviewers are assigned.

### RSS And Publisher Rights

- `rss_source_compliance.md` audits all 24 direct feed endpoints across 21 publisher organizations, Google News RSS, RSS2JSON, AllOrigins, GovDelivery, and the page API rights dependency.
- No source is cleared for the former default publisher-image and excerpt format.
- Texas Comptroller, AgriLife Today, and El Paso Matters provide affirmative reuse pathways with material attribution, asset, partner-story, or commercial-context conditions.
- The other direct sources require permission, a commercial license, or specific legal approval before excerpts, images, or expressive content are used in a monetized product.
- Article cards now render headline, actual source, date, automated coverage/topic labels, and a direct publisher link. Publisher images and feed excerpts are not rendered.
- RSS fallback strips descriptions and image URLs before returning or caching items. Descriptions may still be inspected transiently for relevance filtering.
- Production browser RSS fallback defaults off. `VITE_ENABLE_RSS_FALLBACK=true` must not be configured until the documented rights and proxy launch gate is complete.

### Privacy, Terms, And Vendor Choice

- `/terms` now covers aggregation, source ownership, advertising separation, acceptable use, external vendors, correction/copyright requests, disclaimers, liability, changes, and Texas law.
- `/privacy` now identifies contact-form fields, localStorage keys, infrastructure data, EmailJS, in-memory sponsor events, optional widgets, the API, RSS proxies, purposes, disclosures, retention, TDPSA-oriented rights, children, sensitive data, and external transfers.
- `/methodology` documents source selection, county confidence, API/fallback behavior, rights-conscious cards, automation limits, advertising separation, corrections, and source opt-outs.
- LiveCoinWatch and TradingView do not load until the reader allows optional tickers. The footer and Privacy page let the reader revisit the choice.
- Contact fields have length limits and a just-in-time EmailJS/privacy notice.
- The site does not claim DMCA designated-agent status. Formal registration and statutory notice language remain a counsel/operator decision.

## August 22, 2026 Development Status

### Current Product State

- Public brand is `TexasBusiness.News`.
- The frontend remains a static Vite/React application, consumes a read-only news API, and has no accounts.
- Users can combine multiple counties, regions, and industries in one feed.
- Article cards include full publication dates and matching industry tags.
- Statewide, county, region, industry, region-industry, legal, contact, mission, and advertising routes are available.
- Contact submissions use EmailJS and send to `admin@texasbusiness.news` when the three required `VITE_EMAILJS_*` variables are configured in Amplify.
- `VITE_NEWS_API_URL` configures primary production news delivery; local development defaults to `http://localhost:8787`, and API availability failures trigger the RSS proxy fallback.
- API and fallback items support county, market, nearby, and statewide coverage tiers plus honest display labels; fallback metadata reports the returned coverage mix.

### All-County RSS Resilience

- Browser fallback definitions now cover all 254 Texas counties using the browser-safe geography helpers and exhaustive county centroids.
- Each county fallback plan starts with strict growth/sector or selected-topic queries plus up to four applicable cataloged direct feeds. Inventory below 12 expands through one combined two-market query, up to two feeds mapped to those markets, and one combined three-nearby-county query in parallel. Catalog inclusion is not legal approval; production use is controlled by `rss_source_compliance.md`.
- Primary items require article-level county/place evidence and carry a county slug. Market and nearby items are explicitly labeled, omit county slugs, and therefore cannot create false county-topic links.
- Location evidence comes only from article titles and plain-text descriptions, never from publisher identity, feed scope, or hidden query terms.
- Statewide direct sources now include Texas Tribune Economy, Dallas Fed Updates, Texas Comptroller News, Texas Real Estate Research Center, AgriLife Today, Texas Energy & Power, Texas Border Business, and KETK Local.
- Reviewed regional/local feeds are requested only for selected mapped regions or counties. Existing Amarillo sources remain and Amarillo EDC is included.
- Fallback safeguards retain a 30-day strict county/statewide window and a 60-day labeled market/nearby expansion window, constructive/blocked/topic rules, safe URL/XML handling, 10-second timeouts, globally bounded proxy concurrency, cancellation, partial failures, deterministic sorting and deduplication, scope-keyed localStorage caching, and a three-per-source first diversity pass.

### Advertising

- Double B Ranch is the only active advertiser.
- `ad-assets/bb-ranch-deer-final.png` is the only ad asset.
- The same Double B Ranch creative is eligible for hero, sidebar, inline-feed, and footer placements.
- All other ad creatives and ad assets have been removed.
- The supplied PNG is 4.58 MB. Browser decoding is asynchronous and layout dimensions are reserved, but the source should be compressed substantially before production to improve first-load performance.

### Ticker Performance Refinement

- LiveCoinWatch and TradingView can mount once at the application root after the reader allows optional widgets, instead of remounting on route changes.
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

### API Delivery Readiness

- The API and frontend are an integrated pre-production MVP, estimated at roughly 70% overall launch readiness.
- API lint, typecheck, build, and 51 deterministic tests pass; frontend lint, build, and 30 desktop/mobile Playwright checks pass.
- Exhaustive tests prove that all 254 counties have centroid-backed primary, market, and nearby plans.
- Representative live API checks returned 16–20 items for Loving, King, Anderson, Harris, Starr, and Potter counties, with 9–13 distinct publishers in the first 20 where 20 items were available.
- Those samples do not replace a rate-limited live acceptance audit across all 254 counties.
- Anonymous AllOrigins/RSS2JSON fallback checks remain inconsistent and can be slow or empty for a first-time rural request. A managed, origin-restricted RSS proxy is required before presenting fallback as a production availability guarantee.
- The authoritative API readiness criteria and phased roadmap are maintained in `/PIA/txbiz-api/docs/status-and-roadmap.md`.

## Current Technical State

### Stack

- Vite React SPA with TypeScript.
- React Router for client-side routes.
- CSS in `src/styles.css`; no component library.
- County data from `@nickgraffis/us-counties` plus local Texas region, metro, and city aliases.
- Typed client-side fetching from `GET /v1/pages/home`, including runtime validation for coverage tiers, labels, and optional coverage mixes, with county and statewide results returned together. Cataloged Google News and direct-feed proxy fetching is reserved for development outages and explicitly approved production fallback.
- Sponsor/ad placements use static local data; the sole active Double B Ranch creative opens its approved external destination.
- Deployment target is AWS Amplify Hosting through a GitHub connection.

### Existing Routes

- `/` statewide feed and county filter workspace.
- `/counties` county directory.
- `/mission` mission statement.
- `/advertise` sponsor page.
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
- All 254 counties have bounded primary, nearest-market, and nearby-county fallback plans; Potter and Randall retain their reviewed Amarillo-area RSS feeds.
- Positive business filter and negative/crime/tragedy keyword exclusions.
- Sole Double B Ranch sponsor creative with impression and click events pushed to `dataLayer`.
- LiveCoinWatch crypto and TradingView market ticker widgets.
- Incremental article loading, full publication dates, and matching industry tags.
- Contact form sends through EmailJS when `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` are configured.
- Responsive CSS for desktop and mobile.

### New Test Infrastructure Added

- Added `@playwright/test`.
- Added `npm run test:e2e`.
- Added `playwright.config.ts`.
- Added `tests/app.spec.ts` with deterministic mocked page API and RSS fallback coverage for:
  - Home route, hero, feed, sponsor content.
  - Multi-county search for `Potter, Randall`.
  - DFW quick filter and Texas feed reset.
  - Topic navigation to Energy.
  - County route and county-topic route.
  - County directory search for Frisco/Collin.
  - Mission, advertise, and not-found pages.
  - Desktop Chromium and mobile Chrome profiles.
  - Basic unlabeled interactive control audit.
  - Exhaustive bounded feed-definition assertions for all 254 counties.
  - API-offline rural-county expansion with market/nearby labels and no false county links or claims.
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

Required for production news delivery:

- `VITE_NEWS_API_URL`

Local development uses `http://localhost:8787` when this variable is unset. Production should configure it; missing configuration, network failures, eligible availability responses, malformed JSON, and invalid API response shapes trigger the RSS proxy fallback.

Optional RSS fallback overrides:

- `VITE_ENABLE_RSS_FALLBACK`
- `VITE_RSS_PROVIDER_URL`
- `VITE_RSS_RAW_PROXY_URL`

Production defaults fallback off. Built-in RSS2JSON and AllOrigins endpoints are development defaults only and are used when fallback is enabled without approved override endpoints.

### Browser Test Status

The Playwright suite now runs successfully in this WSL environment:

```text
30 passed
```

Coverage passes in desktop Chromium and mobile Chrome. CI should still install the Playwright browser and native dependencies before running `npm run test:e2e`.

## Feature Complete Definition For A Lightweight API-Backed MVP

The first production version should keep the frontend static and use the existing page API for news delivery. Feature complete should mean:

- Users can browse positive Texas business stories by statewide scope, region, county, and topic.
- Meeting-note industries and regions are represented in the taxonomy and UI.
- Key pages exist for mission, advertise, privacy, terms, methodology/editorial standards, and contact via contact forms plus `admin@texasbusiness.news`.
- Deep links work on Amplify for every county, region, and topic route.
- Static sponsor placements work without collecting sensitive user data.
- Analytics are privacy-aware and documented.
- News API failure states are graceful and do not clear the last successful results.
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
- Configure and document `VITE_NEWS_API_URL`.
- Run lint, build, and E2E in GitHub Actions before Amplify deployment.
- Confirm route deep links after deployment.
- Confirm third-party script loading and page API behavior from the production domain.

## Best Practice Audit

### Architecture

Current state is appropriate for a lightweight API-backed MVP. The static app remains simple while provider ingestion and caching stay behind the page API.

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

Current risk is moderate because the app is static, has no auth, and calls a read-only news API. Main concerns are third-party scripts, external links, and external feed content.

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
- Document the news API, TradingView, LiveCoinWatch, sponsors, and linked publishers.
- Avoid collecting precise location, sensitive personal data, or user accounts unless a privacy program is in place.

### Privacy And Compliance

Because the site is Texas-focused and may serve Texas residents, treat the Texas Data Privacy and Security Act as a design constraint if analytics, ads, newsletter signups, or personalization are added.

Recommended changes before launch:

- Keep the implemented Privacy, Terms, Methodology, and Advertising Standards pages synchronized with actual vendors and practices.
- Re-audit analytics, ad measurement, third-party embeds, and RSS providers before any data-flow change.
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
- Keep publisher thumbnails off until item-level commercial display rights and required credits are documented; use original internal art only if imagery is reintroduced.

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

Current bundle size is reasonable for an MVP. Main performance risks come from page API latency, remote images, and third-party scripts.

Recommended changes:

- Lazy-load the TradingView ticker or make it optional.
- Keep county, region, and topic changes consolidated into one page API request.
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
- Page API cache tuning if provider reliability or rate limits become a problem.
- Admin/sponsor dashboard.

## Open Questions

- Confirm public sponsor names, spelling, destination URLs, and approved ad copy before publishing.
- Confirm whether Texas Stock Exchange launch timing and "Y'all Street" banner copy are approved for publication.
- Confirm whether sports business should be a normal industry topic, a top-level section, or both.
- Confirm whether theme parks belong under Tourism, Real Estate/Development, or their own Attractions category.
- Confirm whether any named individuals should appear in public copy before legal/editorial review.
- Confirm analytics provider and whether consent management is required at launch.
- Confirm whether the site will add newsletter signups or persist contact submissions beyond EmailJS.

## Recommended Next Sprint

1. Implement `regionCatalog` and region routes.
2. Replace the current topic catalog with a hierarchical industry taxonomy.
3. Update the hero and filter UI to expose regions and industries.
4. Add legal/methodology/contact pages.
5. Add SEO metadata support.
6. Add Amplify headers and document the rewrite rule.
7. Run Playwright in a browser-ready CI environment and fix any E2E failures.
