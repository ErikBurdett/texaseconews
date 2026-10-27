# TexasBusiness.News

TexasBusiness.News is a Texas-only React SPA for positive business news and opportunity signals. The product highlights constructive stories about jobs, business growth, infrastructure, energy, AI, data centers, manufacturing, tourism, workforce training, and local investment across the Lone Star State.

## Current Features

- Main feed for statewide Texas business momentum.
- County feeds for all 254 Texas counties, with honestly labeled nearby-market and nearby-county expansion during API outages.
- County, city, metro, and region search with comma-separated multi-search, such as `Potter, Randall`.
- Search and Apply Filters actions that select all matching county filters and refresh the feed.
- Selected county feeds shown first, with Texas statewide articles shown beneath.
- Strict county relevance filtering: county articles must include county or accepted local place signals before they appear.
- Coverage tiers distinguish true county evidence from market, nearby-county, and statewide stories; market and nearby cards never claim to be county-specific.
- Shareable topic feeds for AI, data centers, jobs, manufacturing, energy, and small business.
- Shareable county-topic feeds, such as `/county/dallas/topic/jobs`.
- County directory for browsing and opening county feeds.
- Texas-themed red, white, and blue visual treatment with friendly Texas copy.
- Paid placements with visible `Advertisement` and `Paid sponsor` labels, external-link safeguards, and page-memory-only interaction events.
- News article links open in a new tab and prefer publisher/source URLs over Google News URLs when available.
- Rights-conscious article cards display headline, actual source, date, automated tags, and the original link without publisher images or feed excerpts.
- Optional LiveCoinWatch and TradingView scripts remain off until the reader allows them.
- Responsive layout for mobile, desktop, and large-format displays.

## Routes

- `/` main statewide feed and county filter workspace
- `/counties` county directory
- `/mission` mission statement
- `/advertise` sponsor information and placement details
- `/contact` contact form and admin email
- `/terms` terms of service
- `/privacy` privacy statement
- `/methodology` editorial and source methodology
- `/advertising-standards` advertising acceptance and disclosure standards
- `/topic/:topicSlug` statewide topic feed
- `/county/:countySlug` county-specific feed
- `/county/:countySlug/topic/:topicSlug` county-specific topic feed
- `*` not-found page

## Feeds And Filtering

Articles are loaded from the TexasBusiness.News API through `GET /v1/pages/home`. The frontend sends the selected county, region, and topic slugs as CSV query parameters plus a result limit, then renders the separate county and statewide responses.

The API owns provider ingestion, constructive-business filtering, duplicate suppression, caching, source attribution, and county relevance. County results remain separate from the statewide feed so local stories can appear first without removing statewide coverage. The shared item contract supports `coverageTier` (`county`, `market`, `nearby`, or `statewide`) and `coverageLabel`; feed metadata may include `coverageMix`.

In development, if the API is unreachable, returns an eligible availability error, or returns a malformed response, the client can fall back through AllOrigins and RSS2JSON. Production fallback is disabled by default and requires `VITE_ENABLE_RSS_FALLBACK=true` after source licenses and proxy terms are approved. For each selected county the fallback loads strict county growth/sector or topic searches and up to four applicable local feeds first. When fewer than 12 eligible stories remain, it requests one combined two-market search, up to two feeds mapped to those markets, and one combined three-nearby-county search in parallel. Centroid-based plans exist for all 254 counties and are capped at 6 primary plus 4 expansion definitions per county.

Every fallback article must establish its location in the title or plain-text description. A feed's publisher, retrieval scope, or query is not treated as article evidence. True county items carry `coverageTier: "county"` and a `countySlug`; market and nearby items carry their honest coverage label and intentionally omit `countySlug`. State and region items use the statewide tier. Strict county/statewide fallback uses a 30-day age limit, while clearly labeled sparse market/nearby context may look back 60 days. The fallback also enforces constructive/blocked/topic rules, safe HTTP(S) URLs and XML, 10-second request timeouts, globally bounded proxy concurrency, cancellation, partial-failure handling, deterministic sorting and deduplication, a first pass of at most three stories per normalized source, and a 45-minute scope-keyed browser cache. Descriptions may be inspected transiently for relevance, but fallback responses and cache entries strip descriptions and image URLs before display or persistence.

The fallback catalog includes Texas Tribune Economy, Dallas Fed Updates, Texas Comptroller News, the Texas Real Estate Research Center, AgriLife Today, Texas Energy & Power, Texas Border Business, KETK Local, and mapped regional/local feeds. Catalog inclusion is not legal approval. `rss_source_compliance.md` records which sources require a license or written permission before production use.

Environment variables:

Required for production news delivery:

- `VITE_NEWS_API_URL`

Local development defaults to `http://localhost:8787` when `VITE_NEWS_API_URL` is unset and permits mocked RSS fallback. Production should always configure the API URL; production fallback remains off unless separately approved and enabled.

Optional RSS fallback endpoint overrides:

- `VITE_ENABLE_RSS_FALLBACK`
- `VITE_RSS_PROVIDER_URL`
- `VITE_RSS_RAW_PROXY_URL`

Production defaults `VITE_ENABLE_RSS_FALLBACK` to false. The built-in development defaults are RSS2JSON and AllOrigins. Overrides must be valid HTTP(S) endpoints; they are browser-only availability fallbacks, not replacements for `VITE_NEWS_API_URL`. Review `rss_source_compliance.md` before enabling production fallback.

Required for the contact form:

- `VITE_CONTACT_API_URL`: the `ContactApiUrl` output of the `txbiz-api-prod` stack.

The dedicated AWS endpoint validates submissions and publishes to the confirmed
SNS email subscription for `erikaburdet@gmail.com`. The recipient is fixed on the
server. It limits submissions to five per IP per hour and 100 per day overall;
message bodies are not stored in the rate-limit table or application logs. Add
the exact function origin to Amplify's live CSP as well as `amplify.yml`.

## Local Development

Use Node 22 from `/home/telephone/PIA/.nvmrc`.

```bash
npm install
npm run dev
npm run lint
npm run build
npm run test:e2e
```

## QA Checklist

- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/`, `/counties`, `/county/dallas`, `/topic/jobs`, `/county/dallas/topic/jobs`, `/advertise`, and a missing route.
- Verify county search can select multiple counties from a query like `Potter, Randall`.
- Verify selecting a county shows county-specific articles first and statewide Texas articles beneath.
- With the API mocked offline, verify a sparse rural county shows labeled market and nearby stories without county-specific links or claims.
- Verify external news article links open in a new tab.
- Verify every sponsor placement visibly says `Advertisement` and `Paid sponsor`, identifies the advertiser, and uses a sponsored external link.
- Verify article cards do not render publisher images or feed excerpts.
- Verify optional ticker vendors do not load before the reader allows them.
- Smoke-check `/methodology` and `/advertising-standards`.

## Deployment

This project is intended to deploy through AWS Amplify Hosting using a GitHub repository connection.

Amplify build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

This React Router SPA uses the live Amplify `customRules` in
`infra/amplify-rewrites.json`. Known application routes receive an explicit
HTTP 200 rewrite to `/index.html`; asset paths are excluded. The previous
404 fallback alone rendered `/contact/` with HTTP 404 despite displaying the
form. Apply only `--custom-rules file://infra/amplify-rewrites.json` with
`aws amplify update-app --app-id d3ovdx20nkkza2 --profile dharma --region us-west-2`.
See [AWS rewrite documentation](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html).

AWS Amplify environment variables needed for production news and contact support:

```text
VITE_NEWS_API_URL
VITE_ENABLE_RSS_FALLBACK
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

Keep `VITE_ENABLE_RSS_FALLBACK=false` until the source-rights and proxy launch gate in `rss_source_compliance.md` is complete. The optional RSS proxy override variables may then be configured for an approved managed endpoint.

For current API readiness, verified county-coverage evidence, launch criteria, known fallback limitations, and the phased roadmap, see `/PIA/txbiz-api/docs/status-and-roadmap.md`.

## Compliance Documents

- `rss_source_compliance.md` — source-by-source RSS, API, image, excerpt, cache, and proxy rights audit.
- `advertising_compliance.md` — paid-placement controls, preflight, records, complaint handling, and launch blockers.
- `advertiser_insertion_order_template.md` — counsel-review advertiser agreement and campaign order template.


### Texas exchange and visual identity

`/txse` links to TXSE's official live market display, symbol directory, listing
pages, notices, and exchange news. The selected security names/symbols were
verified against https://www.txse.com/all-listings on October 26, 2026; they are
a dated selection, not a live quote service. The official market display is
https://live.txse.com/outputs/live-banner-6/index.html. We have not verified a
public redistribution/embed license for TXSE market data, so no quote stream is
re-hosted. The old AMEX:TXS ticker entry was removed after its September 16,
2026 primary-listing transfer to TXSE; remaining widgets show vendor-supported
company and commodity symbols.

The Texas network now has 14 animated routes (previously 12), with a matching
static `public/texas-mark.svg` for navigation and the favicon. The Apple touch
icon is a 180px render of that same SVG. Recent API responses stay in a bounded,
one-minute browser-memory cache; Refresh bypasses it, and changing scopes hides
stories belonging to the previous selection while the new request completes.


### Scrolling through older stories

Each feed section loads as its end approaches the viewport, including fast
mobile scrolls and periods with no matches. The shared API request carries
independent county/statewide cursors, preserves all active location and industry
filters, and accumulates stories without repeating IDs. Timestamp/ID pagination
keeps the list newest-first as newer articles arrive. A retry control retains
already loaded stories and the failed cursor; changing filters resets the list.
The API searches up to two years back and the UI clearly marks the end.

Sparse county desks may show explicitly labeled **Texas statewide context**
after local and nearby retrieval are exhausted. This is context for the reader,
not a claim that the story occurred in their county.

### Larger, faster first loads

Each section initially renders up to 48 matching articles and retrieves up to
96 per API batch. Scrolling reveals 24 more cached cards at a time before
requesting another page. Sparse desks display the available matches and retain
their older-story cursors. Matching in-flight browser requests share one network
operation; cancelling one subscriber does not cancel another. Explicit Refresh
bypasses cached responses, and older pending requests cannot overwrite it.

This follows the County Post's shared-snapshot and queued-refresh approach;
Texas business, industry, positivity, and geography rules remain enforced by
the Texas API. Active stale feeds refresh in the background and all counties
participate in the scheduled rotation. First visits to uncached combinations
and older historical periods can still require upstream retrieval.
