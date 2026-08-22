---
name: texas-business-news
description: Provides TexasBusiness.News project context, news API integration rules, testing expectations, deployment constraints, and Texas-focused compliance guidance. Use when working on TexasBusiness.News features, docs, audits, Playwright tests, Amplify deployment, region filters, industry taxonomy, sponsor placements, or compliance.
---

# TexasBusiness.News

## Product Context

TexasBusiness.News is a lightweight React SPA for positive Texas business news. The static frontend is deployable through AWS Amplify Hosting and reads normalized article data from the TexasBusiness.News backend API. It has no user accounts or database access. Browser-side RSS proxy ingestion exists only as an automatic availability fallback.

## Current Stack

- Vite, React, TypeScript, React Router.
- Typed page API client for county, region, topic, and statewide news.
- Outage-only Google News RSS fallback through AllOrigins and RSS2JSON.
- Static local data for counties, topics, regions, and sponsor placements.
- Deployment target: AWS Amplify Hosting with an SPA rewrite to `/index.html`.

## News Page API Contract

The home feed uses:

```text
GET {VITE_NEWS_API_URL}/v1/pages/home?counties=csv&regions=csv&topics=csv&limit=n
```

The response is:

```text
{
  county: FeedResponse | null,
  statewide: FeedResponse,
  meta: { fetchedAt: ISO string }
}
```

Each `FeedResponse` contains `items` and metadata for count, sources used, fetch time, cache TTL, stale state, and partial failures. Each item contains `id`, `title`, `link`, `topics`, and only the documented optional source, date, description, image, label, county, and region fields.

```text
FeedResponse = {
  items: NewsItem[],
  meta: {
    count: number,
    sourcesUsed: string[],
    fetchedAt: string,
    cacheTtlSeconds: number,
    stale: boolean,
    partialFailures: number
  }
}

NewsItem = {
  id: string,
  title: string,
  link: string,
  source?: string,
  sourceUrl?: string,
  publishedAt?: string,
  description?: string,
  imageUrl?: string,
  feedLabel?: string,
  countySlug?: string,
  region?: string,
  topics: string[]
}
```

Keep URL construction in `src/lib/news-api.ts` using `URL` and `URLSearchParams`. Handle non-OK responses, validate response shape at runtime, pass an `AbortSignal`, and prevent stale requests from replacing newer filter results. The UI should preserve the last successful response while a refresh is pending or fails.

Use `src/lib/rss-fallback.ts` only after network failures, missing production API configuration, malformed API responses, HTTP 401/403/408/429, or 5xx responses. Never fall back for request cancellation, invalid filter input, 404, or 405 responses. Keep the fallback age-limited, filtered, county-relevant, deduplicated, and locally cached. County fallback plans may combine focused Google searches with reviewed local feeds from `src/data/feeds.ts`; a publisher name alone must not satisfy county relevance.

## Roadmap Priorities

When adding product features, prioritize:

1. Region filters and routes: DFW, Austin Corridor, San Antonio, Texas Triangle, Texas Panhandle, Permian Basin, West Texas, Gulf Coast.
2. Expanded industry taxonomy: energy, finance, aerospace, infrastructure/construction, semiconductors/chips, robotics, film, sports business, theme parks, defense/military, medicine business, agriculture.
3. Hero updates with energy subtopics: oil, gas, wind, solar, nuclear, grid, transmission, batteries, geothermal, hydrogen, LNG.
4. Texas Financial System/Sector coverage, including Texas Stock Exchange / "Y'all Street" after verifying launch timing and public copy.
5. Static legal/trust pages: privacy, terms, methodology/editorial standards, contact.
6. SEO and share metadata for region, industry, county, and topic routes.

## Engineering Rules

- Keep the page API as the primary news path. Browser RSS proxy access is permitted only through `src/lib/rss-fallback.ts` after an eligible API availability failure.
- Prefer structured catalogs for regions, industries, topics, query terms, and landing-page metadata.
- Avoid hardcoding more route-specific behavior into `src/App.tsx` as the taxonomy grows.
- Keep sponsor/ad logic clearly labeled and separated from editorial taxonomy.
- Do not render untrusted article HTML. Use short excerpts and link to original publishers.
- Keep external links on `rel="noopener noreferrer"`.
- Add or update Playwright coverage for user-facing route/filter changes.

## Testing

Use:

```bash
npm run lint
npm run build
npm run test:e2e
```

If Playwright fails locally with missing native browser dependencies, install them in an environment with sudo:

```bash
sudo npx playwright install-deps chromium
```

The E2E suite must mock `**/v1/pages/home**` with deterministic county and statewide responses and separately cover an API outage with mocked AllOrigins/RSS2JSON fallback responses. It must not depend on a running API or live news providers. Keep external ticker scripts mocked as well.

## Environment Variables

Required for the deployed EmailJS contact form:

- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

The contact form sends to `admin@texasbusiness.news`. The EmailJS template should accept `to_email`, `from_name`, `reply_to`, and `message`.

Required for production news delivery:

- `VITE_NEWS_API_URL`

When unset in development, the client uses `http://localhost:8787`. Production should configure this value, but missing configuration or an eligible availability failure activates the RSS proxy fallback.

Optional RSS fallback overrides:

- `VITE_RSS_PROVIDER_URL`
- `VITE_RSS_RAW_PROXY_URL`

## Compliance And Trust

Before production launch or tracking additions:

- Treat the Texas Data Privacy and Security Act as a design constraint for analytics, ads, personalization, contact forms, or newsletters.
- Add privacy and terms pages before collecting user data.
- Use consent for non-essential tracking when needed.
- Follow FTC disclosure expectations for sponsored content and native ads.
- Follow CAN-SPAM for email and TCPA for SMS if those features are added.
- Keep health, finance, insurance, defense, and named-person coverage neutral and source-backed.
- Avoid collecting sensitive data, children's data, precise location, or account data without a real privacy program.

## Reference

Read `development_update.md` for the current audit, roadmap, feature-complete definition, and open questions.
