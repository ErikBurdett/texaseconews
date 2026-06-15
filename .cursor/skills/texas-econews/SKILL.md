---
name: texas-econews
description: Provides Texas EcoNews project context, roadmap priorities, testing expectations, deployment constraints, and Texas-focused compliance guidance. Use when working on Texas EcoNews features, docs, audits, Playwright tests, Amplify deployment, region filters, industry taxonomy, sponsor placements, or compliance.
---

# Texas EcoNews

## Product Context

Texas EcoNews is a lightweight frontend-only React SPA for positive Texas economic news. There is no backend for now. Keep solutions static, client-side, and deployable through AWS Amplify Hosting connected to GitHub unless the user explicitly asks for backend work.

## Current Stack

- Vite, React, TypeScript, React Router.
- Client-side Google News RSS feed loading through proxy providers.
- Static local data for counties, topics, feeds, and sponsor placements.
- Deployment target: AWS Amplify Hosting with an SPA rewrite to `/index.html`.

## Roadmap Priorities

When adding product features, prioritize:

1. Region filters and routes: DFW, Austin Corridor, San Antonio, Texas Triangle, Texas Panhandle, Permian Basin, West Texas, Gulf Coast.
2. Expanded industry taxonomy: energy, finance, aerospace, infrastructure/construction, semiconductors/chips, robotics, film, sports business, theme parks, defense/military, medicine business, agriculture.
3. Hero updates with energy subtopics: oil, gas, wind, solar, nuclear, grid, transmission, batteries, geothermal, hydrogen, LNG.
4. Texas Financial System/Sector coverage, including Texas Stock Exchange / "Y'all Street" after verifying launch timing and public copy.
5. Static legal/trust pages: privacy, terms, methodology/editorial standards, contact.
6. SEO and share metadata for region, industry, county, and topic routes.

## Engineering Rules

- Preserve the no-backend constraint unless a feature truly requires persistence or secrets.
- Prefer structured catalogs for regions, industries, topics, query terms, and landing-page metadata.
- Avoid hardcoding more route-specific behavior into `src/App.tsx` as the taxonomy grows.
- Keep sponsor/ad logic clearly labeled and separated from editorial taxonomy.
- Do not render untrusted RSS HTML. Use short excerpts and link to original publishers.
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

The E2E suite mocks RSS providers and should not depend on live Google News, AllOrigins, RSS2JSON, or TradingView availability.

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
