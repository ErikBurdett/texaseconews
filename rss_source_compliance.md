# TexasBusiness.News RSS Source Compliance Audit

Assessed: August 31, 2026  
Scope: `src/data/feeds.ts`, browser RSS fallback, primary page API assumptions, article-card fields, caching, and proxy dependencies  
Status: Launch-control document; not legal advice

## Executive Decision

No cataloged source is cleared for the former commercial card format that displayed a publisher image and feed excerpt by default.

Texas Comptroller, AgriLife Today, and El Paso Matters publish affirmative reuse pathways, but each has conditions and none supplies a blanket right to use every feed image in a standalone aggregator card. All other direct sources require written permission, a commercial license, or source-specific legal approval before TexasBusiness.News republishes excerpts, images, or other expressive content.

The conservative launch format is now:

- article title;
- actual publisher/source when supplied;
- publication date;
- automated Texas coverage and industry labels;
- direct link to the original publisher;
- no publisher image; and
- no feed excerpt.

The browser fallback may inspect a feed description in memory to perform Texas-location, constructive-business, topic, and safety checks. The public response and local fallback cache remove `description` and `imageUrl`. Expired cache entries are deleted when checked.

Production browser RSS fallback is disabled unless `VITE_ENABLE_RSS_FALLBACK=true`. Do not enable it merely for availability. Enable it only after the operator has approved the specific source rights, proxy contract, attribution behavior, and cache limits documented here.

## Enforcement In The Deployed System

Revised September 3, 2026. The controls this document describes are now enforced by the API rather than only by the frontend, because the API is a public, unauthenticated endpoint and anyone can read what it serves.

### Withheld fields

`txbiz-api/src/public-view.ts` removes `description` and `imageUrl` from every item in every public response, at the serialization boundary. The pipeline still holds both fields in memory for Texas-relevance, constructive-business, and safety filtering, exactly as this document contemplates. `txbiz-api/tests/compliance.test.ts` walks the serialized body of every route and fails if either key appears anywhere.

### Publisher allowlist for discovery transports

Direct sources in `txbiz-api/src/source-registry.ts` are the rights register: every entry has a catalogued posture below. Google News and Bing News are discovery transports and carry no rights posture of their own — they will surface any publisher matching the query, including out-of-state, foreign, and off-topic outlets.

`txbiz-api/src/publisher-registry.ts` therefore drops any item arriving on a discovery transport whose resolved publisher is not in the registry. The registry has three tiers:

1. **Registered sources** — derived automatically from the direct source registry, so the two cannot drift apart.
2. **Texas newsroom and business publications** — a curated list of Texas outlets cleared for headline-plus-link display in the launch-safe format. **These are pending individual rights-register entries in this document and require the same source-terms review as the direct sources below.** They are allowed to display because they are Texas business/news publishers under the same headline-only format, not because a reuse pathway has been confirmed for each.
3. **Texas public-sector and university domains** — matched by suffix (`texas.gov`, `tamu.edu`, `utexas.edu`, `txdot.gov`, `texasattorneygeneral.gov`), since agency subdomains are numerous and stable.

`allowedPublisherDomains` is exported as the reconciliation surface: it is the complete list of domains the API will serve, and it should be diffed against this document whenever the source registry changes and at each six-month source-terms review.

The allowlist can be disabled with `PUBLISHER_ALLOWLIST_ENABLED=false`. It is enabled by default and must stay enabled in production.

### Attribution

A discovery feed's channel title is the search query that produced it, not a publication. `txbiz-api/src/rss.ts` never uses a discovery feed's channel title for attribution, resolves the publisher from the item's `<source>` element or its title suffix, and omits the `source` field entirely when no publisher can be established. A query string can no longer occupy the publisher field. This is asserted in `txbiz-api/tests/compliance.test.ts`.

## Source Expansion, September 2026

The registry grew from 24 catalogued sources to 91 to give county, region and industry feeds real local depth. Every added feed was fetched and validated before it was written into the registry: it had to return a parseable RSS or Atom document with at least one item published in the last 30 days. Candidates that returned a 404, a non-feed page, or a feed whose newest item was months old were discarded rather than added hopefully.

### Rights classification of the added sources

**These are not cleared for anything beyond the launch-safe format.** They are catalogued under the same posture as the existing commercial sources: headline, publisher, date, topic labels and a direct link, with no excerpt and no publisher image, enforced in the API rather than by convention. Nothing below has an affirmative reuse pathway on file, and each still needs the source-terms review the audit specifies.

Ranked by the strength of the underlying posture:

1. **Texas state bodies.** Texas Workforce Commission and the Texas Economic Development Corporation. State agency material carries the strongest reuse posture and is exactly on topic — job training grants, employment growth, and site-selection announcements.
2. **Public universities.** UT Austin, UT Dallas and Texas A&M newsrooms. Institutional research and campus economic news from public institutions.
3. **Economic development corporations, chambers, ports and cities.** Dallas Regional Chamber, Fort Worth Chamber, Garland Chamber, Greater Waco Chamber, McKinney EDC, Develop Abilene, Lubbock EDA, Port Houston, Port of Galveston, and the cities of McKinney, San Marcos, Sugar Land, Abilene and Arlington. These publish press releases intended for redistribution, which is the most favourable footing short of an express licence, but "intended for redistribution" is not the same as a written grant and should be confirmed.
4. **Commercial local newsrooms.** Television stations across the Tegna, Gray, Nexstar and Sinclair groups, plus Texas Standard, Texas Farm Bureau and the Texas Oil & Gas Association. Same posture as KETK, Everything Lubbock and the Midland Reporter-Telegram already in the register: permission or a commercial licence required for anything beyond headline-plus-link.

### Statewide versus local scope

A `localOnly` flag on a source keeps it out of the statewide feed and fetches it only for the regions and counties it is mapped to. Sixty local feeds on every statewide request would exhaust the upstream budget and surface a Beaumont city council item to a reader in Amarillo. County and region feeds get the depth; the statewide feed keeps the business- and economy-focused sources it had.

### Feeds deliberately not added

Sinclair's `/money.rss` endpoints were rejected after inspection: every station serves the same national business wire, so a "San Antonio" business feed and an "El Paso" business feed returned identical mortgage-rate stories. They would have added upstream cost and no Texas content. Several chamber and university feeds were rejected as abandoned, with newest items between 50 days and five years old.

## Coverage Window And Feed Depth

The article window moved from 30 days to **120 days**, and the county expansion threshold from 12 items to 72, so a county feed keeps pulling in nearby-market and nearby-county coverage instead of stopping as soon as its own newsroom produced a dozen stories. The serving cap rose from 100 items to 240.

This is a product decision, not a rights one — the launch-safe format is unchanged and nothing about what is displayed per item has moved. Two things follow from it that are worth recording:

- **Older items are now served.** A story can be up to four months old. Ranking still bands by freshness, so recent coverage leads, but a reader scrolling far enough will reach older material. Publication dates are displayed on every card, which is what keeps that honest.
- **Upstream load rose.** More sources across a longer window means more requests per cold cache. `MAX_UPSTREAM_REQUESTS` still caps fan-out at 64 and the local-only scope rule keeps the statewide query from fetching every local feed.

Measured across twenty counties and eight regions, the available pool went from 454 items to 1,276.

## Feed Depth For Every County, Region And Filter

The registry now holds **91 catalogued sources**. Four structural changes turned that into depth a reader can actually scroll through, taking the measured pool across twenty counties and eight regions from 454 items to 1,710.

**Statewide sources reach local feeds.** A source with no region or county mapping — the Comptroller, the Workforce Commission, Farm Bureau, AgriLife — covers the whole state, and its stories are frequently *about* one county. Those sources are now fetched for county and region scopes too, and the relevance filter decides whether an individual item fits. Without this a Farm Bureau story about Lubbock cotton could never reach the Lubbock feed.

**A third query angle: public finance.** Counties and regions are searched three ways — growth, sectors, and a civic set covering budgets, tax rates, bonds, capital improvement, road and water projects, incentive agreements and commissioners court. A small county rarely produces a corporate expansion story in a given month but almost always produces a budget or a road project, and that is economic news for the people who live there.

**Region queries were rebuilt.** A region previously sent every constructive term in a single 3,700-character search. It is now the same three bounded angles the counties use.

**Selecting a topic no longer narrows the fetch.** A topic filter used to replace the general queries rather than add to them, so a filtered feed drew from a smaller candidate pool than an unfiltered one. Both now run: the topic query finds stories the general ones miss, and the general queries supply the wider pool the topic filter cuts down.

Two supporting changes: registered sources are now ordered ahead of discovery queries so that when the request budget truncates, what is dropped is a search rather than a source in the rights register; and the budget itself rose from 64 requests to 110, with concurrency from 8 to 12.

**The cost is cold latency.** A county or region feed now takes roughly five to six seconds cold, against one to two before, because each one fetches substantially more upstreams. Warm requests are served from cache and are effectively instant for the five-minute TTL. This is the trade that buys the depth.

## Editorial Filter Changes

Two changes were made alongside the expansion, both affecting what reaches a reader rather than what rights are claimed.

**The constructive-business test now reads the headline, not the headline plus the excerpt.** The headline is the only thing published, so it has to carry the business signal itself. Previously an item was admitted when its excerpt happened to contain a business word, which let a story about a college football coach being fired into a county business feed on the strength of a summary no reader ever sees. The negative screen still reads headline and excerpt together, because bad news anywhere in an item disqualifies it.

**A registered source mapped to a county is trusted for geography.** A direct item is only ever tagged with a county its registered source is mapped to, so the outlet establishes the location and the copy need not repeat it — a Brenham newsroom writing for Brenham readers rarely says "Texas". The explicit Texas signal is still required for Google and Bing results, where the publisher could be anywhere and "Washington County" could be any of thirty.

**Government, defence and public-finance stories are admitted on their economic impact.** Public spending is one of the largest drivers of regional Texas economies — a military installation, a federal contract, a city budget, a tax abatement or a road programme is often the only substantial business story a rural county produces in a month. The constructive vocabulary now covers that ground explicitly: defence and federal contracts, installations, appropriations, municipal budgets, bonds, tax base and incentives, transit, water, utilities and capital improvement. The terms stay economic rather than political — a headline qualifies by naming the contract, the installation or the funding, not by being about government. Detention and deportation are no longer blocked outright; a facility contract with a jobs number is economic news, and the operator has decided it is in scope.

**Topic recognition was broadened across all 28 topics.** Topic aliases are extraction-only — they match text already held rather than building upstream queries — so breadth there is cheap. A Lubbock cotton story is agriculture whether or not it uses the word "agriculture".

**The negative screen was extended to crime, litigation and suspicion, then narrowed back where it overreached.** Single-word matching meant "Trial begins for men accused in multimillion-dollar investment scheme" scored as a business story on the word "investment"; terms like accused, fraud, scheme, indictment and suspicion now let the subject of the sentence decide. A first pass also blocked "trial", "investigation", "probe" and "emergency", which removed a clinical trial, a research investigation and an emergency room expansion — all legitimate business stories — and cut the statewide feed nearly in half. Those were narrowed to specific phrases.

**The editorial vocabulary was widened and the negative screen widened with it.** The constructive list gained the words real headlines use — breaks ground, relocates, adds jobs, economic development, distribution centre, apprenticeship. Because that also matches headlines about a project being fought or cancelled, the blocked list gained the opposing vocabulary: opposition, pushback, withdrawn, cancelled, halted, funding cuts, pollution, and personnel departures. Both lists are editorial policy rather than legal controls and should be reviewed as the site's voice settles.

## What RSS Does Not Grant

An RSS endpoint is a delivery mechanism, not automatically a republication license. A public feed, a permissive `robots.txt`, or successful retrieval through a proxy does not waive copyright or a publisher's contract terms. A proxy cannot grant rights in upstream publisher material.

Headlines and short titles are often outside copyright protection, but contractual restrictions, trademark, false-association, database, and unfair-competition issues can still apply. Photographs, illustrations, article ledes, and substantive excerpts ordinarily present much greater rights risk.

There is no universal “safe” excerpt word count. The commercial news-monitoring decision summarized by the U.S. Copyright Office in *Associated Press v. Meltwater* is a warning against treating copied ledes as automatically fair use.

Official references:

- [17 U.S.C. § 105 — U.S. government works](https://www.copyright.gov/title17/92chap1.html)
- [U.S. Copyright Office Circular 33 — titles, names, and short phrases](https://www.copyright.gov/circs/circ33.pdf)
- [U.S. Copyright Office — copyright and photographs](https://www.copyright.gov/engage/docs/photography.pdf)
- [U.S. Copyright Office fair-use index — AP v. Meltwater](https://www.copyright.gov/fair-use/summaries/ap-meltwater-sdny2013.pdf)
- [USAGov — federal versus state and local government copyright](https://www.usa.gov/government-copyright)

## Platform And Transport Dependencies

### Google News RSS

- Endpoint: `https://news.google.com/rss/search`
- Current use: dynamic statewide, region, county, nearby-market, nearby-county, and industry searches.
- Classification: license and terms review required.
- Reason: Google does not license the underlying publisher article. Google's terms state that content displayed through services such as Google News may belong to publishers and cannot be used beyond an applicable license or legal basis.
- Evidence: [Google Terms of Service](https://policies.google.com/terms)
- Launch rule: use only as an approved discovery transport. Preserve the actual publisher identity and direct link. Do not display publisher images or excerpts based solely on Google News delivery.

### RSS2JSON

- Endpoint: `https://api.rss2json.com/v1/api.json`
- Current use: public browser proxy and feed normalization during eligible outages.
- Classification: production agreement required.
- Reason: public documentation describes API use but no located binding terms provide a dependable commercial-service right, SLA, confidentiality commitment, or rights in upstream content.
- Evidence: [RSS2JSON API documentation](https://rss2json.com/docs) and [RSS2JSON contact](https://rss2json.com/contact)
- Launch rule: use a reviewed paid agreement or replace with a managed origin-restricted service. Never treat proxy output as licensed publisher content.

### AllOrigins

- Endpoint: `https://api.allorigins.win/raw`
- Current use: public raw-RSS browser proxy, preferred first for Google News.
- Classification: do not rely on the public hosted service for production.
- Reason: no located public commercial-service terms or SLA. The open-source proxy code is MIT licensed, but that license covers the software, not fetched publisher content.
- Evidence: [AllOrigins service](https://allorigins.win/) and [AllOrigins source repository](https://github.com/gnuns/allOrigins)
- Launch rule: self-host or contract for a controlled proxy only after a security and privacy review.

### GovDelivery / Granicus

- Feed host: `https://public.govdelivery.com/topics/TXCOMPT_1/feed.rss`
- Classification: transport only.
- Reason: the Texas Comptroller's policy supplies the relevant content permission. GovDelivery hosting does not independently license the agency content.

### TexasBusiness.News Page API

- Endpoint: `{VITE_NEWS_API_URL}/v1/pages/home`
- Classification: source-rights registry required before production.
- Reason: this frontend cannot prove what providers, contracts, images, summaries, cache periods, or attribution rules the backend used.
- Required control: the API operator must maintain an item/source rights record and should return only fields permitted for commercial display. Adding a field such as `rightsProfile` or `displayPermissions` is recommended before any excerpts or images return to the UI.

## Sources With An Affirmative Reuse Path

These sources are not blanket-cleared for the former image-and-excerpt card. They are the strongest candidates for written launch approval in the current headline/source/date/link format.

### Texas Comptroller

- Feed: `https://public.govdelivery.com/topics/TXCOMPT_1/feed.rss`
- Catalog ID: `texas-comptroller-news`
- Classification: permitted with conditions for agency text; images and marks excluded.
- Evidence: [Comptroller privacy and website policy](https://comptroller.texas.gov/about/policies/privacy.php), [Fiscal Notes usage terms](https://comptroller.texas.gov/economy/fiscal-notes/about/), and [Comptroller RSS page](https://comptroller.texas.gov/about/media-center/rss/)
- Conditions: credit the Comptroller, do not imply endorsement, keep any approved republication complete and unaltered where the specific Fiscal Notes rule applies, and do not reuse excluded photographs, symbols, logos, or service marks.
- Current-mode decision: source/title/date/direct link may be approved. Do not display feed images. Review a sample of feed items for third-party material before any excerpt use.

### AgriLife Today

- Feed: `https://agrilifetoday.tamu.edu/feed/`
- Catalog ID: `agrilife-today`
- Classification: permitted with attribution and asset-level limits.
- Evidence: [AgriLife Today press and media policy](https://agrilifetoday.tamu.edu/press-and-media/)
- Conditions: retain attribution. Author and photo credits must be preserved. Courtesy and third-party images require separate clearance.
- Current-mode decision: source/title/date/direct link may be approved. Do not display images or excerpts until the implementation can retain required bylines and item-level credit and can distinguish AgriLife-owned assets.

### El Paso Matters

- Feed: `https://elpasomatters.org/feed/`
- Catalog ID: `el-paso-matters`
- Classification: permitted with republication conditions; partner stories excluded.
- Evidence: [El Paso Matters republishing guidelines](https://elpasomatters.org/republishing-guidelines/)
- Conditions: preserve author and publication credit, original links, and material meaning; do not sell the story or sell advertising specifically against it; partner content is not covered.
- Current-mode decision: source/title/date/direct link may be approved. Do not display images or excerpts until author credit and partner-story exclusion are implemented and counsel confirms that feed aggregation fits the policy.

## Sources Requiring Permission Or A Commercial License

### Texas Tribune Economy

- Feed: `https://www.texastribune.org/topics/economy/feed/`
- Catalog ID: `texas-tribune-economy`
- Classification: written commercial/republication approval required.
- Evidence: [Texas Tribune RSS terms](https://www.texastribune.org/feeds/) and [republishing guidelines](https://www.texastribune.org/republishing-guidelines/)
- Issue: the RSS page directs publishers seeking republication to contact the Tribune. General guidelines impose attribution, link, canonical, sale, advertising, story-integrity, and photo limits.
- Action: keep excerpts and photos off. Obtain written confirmation for automated commercial headline aggregation and any desired fields.

### Federal Reserve Bank of Dallas

- Feed: `https://www.dallasfed.org/rss/updates.xml`
- Catalog ID: `dallas-fed-updates`
- Classification: commercial permission required.
- Evidence: [Dallas Fed disclaimer and terms](https://www.dallasfed.org/fed/disclaimer) and [Federal Reserve structure](https://www.federalreserve.gov/faqs/about_14986.htm)
- Issue: stated reproduction permission is limited to use not distributed for private gain and requires credit. Reserve Banks are not automatically federal public-domain agencies.
- Action: request commercial permission; exclude third-party material, graphics, and logos.

### Texas Real Estate Research Center at Texas A&M

- Feed: `https://trerc.tamu.edu/feed/?post_type=post`
- Catalog ID: `texas-real-estate-research-center`
- Classification: commercial license required.
- Evidence: [TRERC terms of use](https://trerc.tamu.edu/terms-of-use/)
- Issue: redistribution conditions include no sale for profit, full credit, byline retention, and no substantive changes.
- Action: do not use excerpts or images in an ad-supported product without written approval.

### Texas Energy & Power

- Feed: `https://www.texasenergyandpower.com/feed`
- Catalog ID: `texas-energy-and-power`
- Classification: permission required.
- Evidence: [Texas Energy & Power](https://www.texasenergyandpower.com/) and [Substack terms](https://substack.com/tos)
- Issue: the publisher retains copyright; Substack does not grant an aggregator commercial rights in creator content.

### Texas Border Business

- Feed: `https://texasborderbusiness.com/feed/`
- Catalog ID: `texas-border-business`
- Classification: permission required; current terms are incompatible with commercial republication.
- Evidence: [Texas Border Business terms](https://texasborderbusiness.com/terms-of-use/)
- Issue: terms limit use to personal, non-commercial viewing and restrict copying, public display, and mirroring.

### KETK Local

- Feed: `https://www.ketk.com/news/local-news/feed/`
- Catalog ID: `ketk-local`
- Classification: license required.
- Evidence: [Nexstar terms of use](https://www.nexstar.tv/terms-of-use/)
- Issue: Nexstar limits use to personal, noncommercial purposes and restricts scraping, distribution, and commercial exploitation.

### Dallas Innovates

- Feed: `https://dallasinnovates.com/feed/`
- Catalog ID: `dallas-innovates`
- Classification: permission required.
- Evidence: [Dallas Innovates terms](https://dallasinnovates.com/terms-of-use/)
- Issue: all-rights-reserved posture with no located commercial RSS republication grant.

### Fort Worth Report Business

- Feed: `https://fortworthreport.org/category/business/feed/`
- Catalog ID: `fort-worth-report-business`
- Classification: commercial license required.
- Evidence: [Fort Worth Report republication guidelines](https://fortworthreport.org/2022/02/23/how-you-can-republish-our-stories/)
- Issue: free Creative Commons republication is limited to noncommercial entities; commercial use requires licensing and collection-style syndication is restricted.

### Houston Public Media Business

- Feed: `https://www.houstonpublicmedia.org/topics/news/business/feed/`
- Catalog ID: `houston-public-media-business`
- Classification: item-level permission required.
- Issue: no located blanket RSS republication policy, and the feed can contain HPM, AP, NPR, KERA, Texas Public Radio, and Texas Tribune work with different rights.
- Action: do not use images or excerpts. Require item-level publisher and rights identification before any content beyond metadata and links.

### Opportunity Austin

- Feed: `https://opportunityaustin.com/feed/`
- Catalog ID: `opportunity-austin`
- Classification: written permission required.
- Evidence: [Opportunity Austin terms](https://opportunityaustin.com/terms-of-service/)
- Issue: terms reserve content rights and restrict automated processes used to monitor or copy material.

### Bexar County Economic and Community Development

- Feed: `https://www.bexar.org/RSSFeed.aspx?ModID=1&CID=Economic-Community-Development-Press-Rel-65`
- Catalog ID: `bexar-ecd`
- Classification: county permission required.
- Evidence: [Bexar County RSS page](https://www.bexar.org/rss.aspx) and [Public Information Act policy](https://www.bexar.org/DocumentCenter/View/32435/Bexar-County-Public-Information-Act)
- Issue: offering RSS for reader updates is not an express commercial republication license. Texas public-information access does not automatically place local-government works in the public domain.

### San Antonio Report

- Feed: `https://sanantonioreport.org/feed/`
- Catalog ID: `san-antonio-report`
- Classification: prior written consent required.
- Evidence: [San Antonio Report terms](https://sanantonioreport.org/terms-of-service/) and [permissions and copyright](https://sanantonioreport.org/permissions-and-copyright/)
- Issue: terms restrict reproduction, storage, transmission, redistribution, and sale without permission.

### Amarillo Economic Development Corporation

- Feed: `https://amarilloedc.com/feed/`
- Catalog ID: `amarillo-edc`
- Classification: permission required.
- Evidence: [Amarillo EDC terms](https://amarilloedc.com/terms-and-conditions/)
- Issue: terms claim rights in site text, images, logos, and files and provide no located commercial redistribution grant.

### Midland Reporter-Telegram

- Feed: `https://www.mrt.com/news/feed/news-1437.php`
- Catalog ID: `midland-reporter-telegram`
- Classification: commercial license required; do not enable direct retrieval without approval.
- Evidence: [MRT terms of use](https://www.mrt.com/news/article/Terms-of-use-7434827.php)
- Issue: Hearst terms specifically restrict reuse, redistribution, republication, commercial exploitation, RSS-feed content, and advertising placed around that content.

### Port Corpus Christi

- Feed: `https://portofcc.com/category/press-releases/feed/`
- Catalog ID: `port-corpus-christi`
- Classification: authority permission required.
- Evidence: [Port press releases](https://portofcc.com/category/press-releases/) and [media center](https://portofcc.com/about/media-center/)
- Issue: no located express website/RSS reuse license. State and local government works are not automatically federal public-domain works.

### Everything Lubbock

- Feed: `https://www.everythinglubbock.com/feed/`
- Catalog ID: `everything-lubbock`
- Classification: license required.
- Evidence: [Nexstar terms of use](https://www.nexstar.tv/terms-of-use/)
- Issue: personal-use, anti-scraping, distribution, and commercial-exploitation restrictions.

### ABC7 Amarillo / KVII

- Feed: `https://abc7amarillo.com/news/local.rss`
- Catalog ID: `abc7-amarillo-local`
- Classification: written commercial permission required.
- Evidence: [Sinclair terms](https://sbgi.net/terms-conditions/) and [KVII copyright page](https://abc7amarillo.com/station/copyright)
- Issue: Sinclair generally limits content use to personal, noncommercial use and restricts copying and inline content linking.

### MyHighPlains / KAMR

- Feeds:
  - `https://www.myhighplains.com/news/feed/`
  - `https://www.myhighplains.com/news/local-news/feed/`
  - `https://www.myhighplains.com/news/today-in-amarillo/feed/`
- Catalog IDs: `my-high-plains-news`, `my-high-plains-local`, and `my-high-plains-today`
- Classification: license required for all three.
- Evidence: [MyHighPlains terms](https://www.myhighplains.com/terms-of-use/) and [Nexstar terms](https://www.nexstar.tv/terms-of-use/)
- Issue: personal-use, automated-access, distribution, and commercial-exploitation restrictions.

### Amarillo Tribune

- Feed: `https://www.amarillotribune.org/feed/`
- Catalog ID: `amarillo-tribune`
- Classification: written permission required.
- Evidence: [Amarillo Tribune journalism policies](https://amarillotribune.org/about-the-amarillo-tribune/ethical-and-moral-journalism-policies/) and [robots policy](https://amarillotribune.org/robots.txt)
- Issue: no located express commercial syndication license. Free reader access is not republication permission.

## Field-Level Rules

### Title

Use as factual discovery metadata with source attribution and a direct link. Do not rewrite a title in a way that changes meaning. Terms review is still required where automated access is prohibited.

### Publisher and author

Prefer the actual item source over the feed-search label. A Google News query label is not publisher attribution. Add author/byline fields before using any source policy that requires author credit.

### Date

Display the feed-supplied publication date when valid. Do not imply independent verification.

### Description, summary, or article body

Do not display or persist these fields for a monetized launch unless the rights register expressly permits the intended excerpt length, commercial context, caching, and editing. They may be inspected transiently for automated relevance only after counsel approves that processing.

### Images, thumbnails, and media enclosures

Default to off. A feed-provided URL is not evidence of a display license. Record copyright owner, license, required credit, allowed crop, allowed context, and expiration before display. Do not hotlink merely because an enclosure exists.

### Links

Link directly to the original publisher when possible. Use `rel="noopener noreferrer"` for new tabs. Do not bypass paywalls, tracking choices, or access controls.

### Caching

Cache only fields permitted by source terms, only for the approved duration, and delete expired entries. Current browser fallback strips descriptions and image URLs before its 45-minute local cache.

## Required Rights Register

Before enabling a source, record:

- source and legal owner;
- exact feed/API endpoint;
- terms and policy URLs;
- terms version and review date;
- commercial automated-access permission;
- title, author, date, excerpt, full text, image, logo, and embed permissions separately;
- required attribution, byline, links, canonical tags, and copyright notices;
- caching and deletion limits;
- rate limits and technical restrictions;
- syndicated or third-party item exclusions;
- advertising adjacency or sale restrictions;
- geographic and product restrictions;
- takedown and termination process;
- written license file and renewal date;
- reviewer and approval date.

## Launch Gate

Do not set `VITE_ENABLE_RSS_FALLBACK=true` in Amplify until:

1. the production API's source registry is reviewed;
2. each enabled direct source has a completed rights record;
3. prohibited automated-access sources are removed or licensed;
4. Google News use is approved as discovery transport;
5. a managed proxy or reviewed RSS2JSON agreement is in place;
6. author and item-level rights fields exist where required;
7. image display remains off unless separately licensed;
8. takedown and source opt-out handling is staffed; and
9. Texas media counsel approves the final commercial aggregation posture.

## Review Cadence

Recheck source terms at least every six months and before changing card fields, enabling images or excerpts, adding ads or analytics, changing proxies, or adding a source. Record the date, reviewer, changed terms, decision, and any required removal.
