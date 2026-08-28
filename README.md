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
- Sponsor placements that route to `/advertise` and track impression/click events through `dataLayer`.
- News article links open in a new tab and prefer publisher/source URLs over Google News URLs when available.
- Responsive layout for mobile, desktop, and large-format displays.

## Routes

- `/` main statewide feed and county filter workspace
- `/counties` county directory
- `/mission` mission statement
- `/advertise` sponsor information and placement details
- `/contact` contact form and admin email
- `/terms` terms of service
- `/privacy` privacy statement
- `/topic/:topicSlug` statewide topic feed
- `/county/:countySlug` county-specific feed
- `/county/:countySlug/topic/:topicSlug` county-specific topic feed
- `*` not-found page

## Feeds And Filtering

Articles are loaded from the TexasBusiness.News API through `GET /v1/pages/home`. The frontend sends the selected county, region, and topic slugs as CSV query parameters plus a result limit, then renders the separate county and statewide responses.

The API owns provider ingestion, constructive-business filtering, duplicate suppression, caching, source attribution, and county relevance. County results remain separate from the statewide feed so local stories can appear first without removing statewide coverage. The shared item contract supports `coverageTier` (`county`, `market`, `nearby`, or `statewide`) and `coverageLabel`; feed metadata may include `coverageMix`.

If the API is unreachable, returns an eligible availability error, or returns a malformed response, the client automatically falls back through AllOrigins and RSS2JSON. For each selected county it loads strict county growth/sector or topic searches and up to four applicable reviewed local feeds first. When fewer than 12 eligible stories remain, it requests one combined two-market search, up to two reviewed feeds mapped to those markets, and one combined three-nearby-county search in parallel. Centroid-based plans exist for all 254 counties and are capped at 6 primary plus 4 expansion definitions per county.

Every fallback article must establish its location in the title or plain-text description. A feed's publisher, retrieval scope, or query is not treated as article evidence. True county items carry `coverageTier: "county"` and a `countySlug`; market and nearby items carry their honest coverage label and intentionally omit `countySlug`. State and region items use the statewide tier. Strict county/statewide fallback uses a 30-day age limit, while clearly labeled sparse market/nearby context may look back 60 days. The fallback also enforces constructive/blocked/topic rules, safe HTTP(S) URLs and XML, 10-second request timeouts, globally bounded proxy concurrency, cancellation, partial-failure handling, deterministic sorting and deduplication, a first pass of at most three stories per normalized source, and a 45-minute scope-keyed browser cache.

Statewide direct fallback sources include Texas Tribune Economy, Dallas Fed Updates, Texas Comptroller News, the Texas Real Estate Research Center, AgriLife Today, Texas Energy & Power, Texas Border Business, and KETK Local. Reviewed regional/local feeds are requested only when their mapped region or county is selected. These include Dallas Innovates, Fort Worth Report Business, Houston Public Media Business, Opportunity Austin, Bexar ECD, San Antonio Report, El Paso Matters, Amarillo EDC and the retained Amarillo feeds, Midland Reporter-Telegram, Port Corpus Christi, and Everything Lubbock.

Environment variables:

Required for production news delivery:

- `VITE_NEWS_API_URL`

Local development defaults to `http://localhost:8787` when `VITE_NEWS_API_URL` is unset. Production should always configure the API URL; when it is missing or unavailable, the RSS proxy fallback is used.

Optional RSS fallback endpoint overrides:

- `VITE_RSS_PROVIDER_URL`
- `VITE_RSS_RAW_PROXY_URL`

The built-in defaults are RSS2JSON and AllOrigins. Overrides must be valid HTTP(S) endpoints; they are browser-only availability fallbacks, not replacements for `VITE_NEWS_API_URL`.

Required for the contact form through EmailJS:

- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

These must be set in AWS Amplify environment variables for the deployed contact form to send to `admin@texasbusiness.news`. The EmailJS template should accept `to_email`, `from_name`, `reply_to`, and `message`.

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
- Verify sponsor cards route to `/advertise`.

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

Because this is a React Router SPA, Amplify should include a rewrite rule that sends unmatched routes to `/index.html` with a `200` status so deep links like `/county/dallas/topic/jobs` work after deployment.

AWS Amplify environment variables needed for production news and contact support:

```text
VITE_NEWS_API_URL
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

The optional RSS fallback override variables may also be configured when a managed proxy endpoint is preferred.

For current API readiness, verified county-coverage evidence, launch criteria, known fallback limitations, and the phased roadmap, see `/PIA/txbiz-api/docs/status-and-roadmap.md`.
