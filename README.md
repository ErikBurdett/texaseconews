# Texas EcoNews

Texas-only SPA for positive economic news and opportunity signals.

## What It Does

- Main infinite-scroll feed focused on constructive Texas economic stories.
- User-curated feed scope: statewide, one Texas county, or multiple counties.
- County, city, metro, and region search across all 254 Texas counties, including comma-separated multi-search.
- When counties are selected, county-specific articles appear first and Texas statewide articles appear beneath them.
- Strict county-specific filtering: county feeds must include county or accepted local place signals before stories are shown.
- Shareable topic and county-topic feeds for AI, data centers, jobs, manufacturing, energy, and small business.
- County directory for browsing Texas county feeds.
- Positive economic filtering for growth, jobs, business expansion, AI, data centers, energy, manufacturing, workforce training, tourism, and infrastructure.
- Excludes common tragedy/crime terms such as death, violence, drugs, arrests, fatal crashes, and similar negative stories.
- Responsive layout for mobile, desktop, and large-format displays.
- Dynamic sponsor placements with basic impression/click `dataLayer` events.

## Routes

- `/` main feed
- `/counties` county directory
- `/mission` mission statement
- `/advertise` sponsor information
- `/topic/:topicSlug` opens a statewide topic feed
- `/county/:countySlug` opens the app with that county selected
- `/county/:countySlug/topic/:topicSlug` opens a county-specific topic feed

## Feeds

Feeds are Google News RSS search feeds loaded client-side through RSS2JSON with AllOrigins fallback.

Optional environment variables:

- `VITE_RSS_PROVIDER_URL`
- `VITE_RSS_RAW_PROXY_URL`

## Commands

Use Node 22 from `/home/telephone/PIA/.nvmrc`.

```bash
npm install
npm run dev
npm run lint
npm run build
```
