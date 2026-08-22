# TexasBusiness.News

TexasBusiness.News is a Texas-only React SPA for positive business news and opportunity signals. The product highlights constructive stories about jobs, business growth, infrastructure, energy, AI, data centers, manufacturing, tourism, workforce training, and local investment across the Lone Star State.

## Current Features

- Main feed for statewide Texas business momentum.
- County-specific feeds for all 254 Texas counties.
- County, city, metro, and region search with comma-separated multi-search, such as `Potter, Randall`.
- Search and Apply Filters actions that select all matching county filters and refresh the feed.
- Selected county feeds shown first, with Texas statewide articles shown beneath.
- Strict county relevance filtering: county articles must include county or accepted local place signals before they appear.
- Shareable topic feeds for AI, data centers, jobs, manufacturing, energy, and small business.
- Shareable county-topic feeds, such as `/county/dallas/topic/jobs`.
- County directory for browsing and opening county feeds.
- Texas-themed red, white, and blue visual treatment with friendly Texas copy.
- Sponsor placements and advertiser-preview inventory with impression/click events tracked through `dataLayer`.
- Fixed advertiser package pricing, responsive 250×250 and 980×300 placement previews, and a campaign-request builder.
- Clearly labeled responsive in-feed advertising inventory after every five article cards.
- News article links open in a new tab and prefer publisher/source URLs over Google News URLs when available.
- Responsive layout for mobile, desktop, and large-format displays.

## Routes

- `/` main statewide feed and county filter workspace
- `/counties` county directory
- `/mission` mission statement
- `/advertise` sponsor information and placement details
- `/payments` advertiser quote builder and campaign-request form; Stripe checkout is intentionally disabled
- `/contact` contact form and admin email
- `/terms` terms of service
- `/privacy` privacy statement
- `/topic/:topicSlug` statewide topic feed
- `/county/:countySlug` county-specific feed
- `/county/:countySlug/topic/:topicSlug` county-specific topic feed
- `*` not-found page

The complete preview rate card, billing rules, creative specifications, submission flow, and advertising standards are documented in `advertising_pricing.md`.

## Feeds And Filtering

Feeds are Google News RSS search feeds loaded client-side. The app prefers raw RSS through AllOrigins for Google News feeds so publisher/source URLs can be extracted when present, with RSS2JSON as fallback.

County feeds use two layers of filtering:

- Feed query targeting: county names, county display names, and curated city/metro aliases are included in the Google News query.
- Post-fetch relevance gate: county-scoped stories must mention the county or accepted local place aliases before they appear.

Positive business filtering keeps constructive growth stories and excludes common tragedy/crime terms such as death, violence, drugs, arrests, fatal crashes, and similar negative stories.

Environment variables:

Required for the contact form through EmailJS:

- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

These must be set in AWS Amplify environment variables for the deployed contact and advertiser-request forms to send to `admin@texasbusiness.news`. The EmailJS template should accept `to_email`, `from_name`, `reply_to`, and `message`; optional advertiser variables include `submission_type`, `business_name`, `placement`, `billing`, `targeting`, `estimated_total`, and `creative_name`.

Optional RSS override variables:

- `VITE_RSS_PROVIDER_URL`
- `VITE_RSS_RAW_PROXY_URL`

RSS works without those RSS variables. When they are not set, the app uses built-in defaults for RSS2JSON and AllOrigins.

## Local Development

Use Node 22 from `/home/telephone/PIA/.nvmrc`.

```bash
npm install
npm run dev
npm run lint
npm run build
```

## QA Checklist

- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/`, `/counties`, `/county/dallas`, `/topic/jobs`, `/county/dallas/topic/jobs`, `/advertise`, `/payments`, and a missing route.
- Verify county search can select multiple counties from a query like `Potter, Randall`.
- Verify selecting a county shows county-specific articles first and statewide Texas articles beneath.
- Verify external news article links open in a new tab.
- Verify in-feed advertiser placeholders appear after every five article cards without breaking the responsive grid.
- Verify `/payments` calculates county, multi-county, statewide, monthly, and annual preview rates without collecting payment.

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

AWS Amplify environment variables needed for production contact form support:

```text
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

RSS environment variables are optional unless you want to override the default RSS providers.
