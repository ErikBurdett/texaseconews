# TexasBusiness.News Paid Advertising Compliance Program

Effective: August 31, 2026 (revised September 3, 2026)  
Operating entity: Texas Business News, LLC, a Texas limited liability company  
Owner contact: admin@texasbusiness.news  
Status: Pre-launch controls; counsel approval and a named accountable person remain required  
Related: `advertiser_insertion_order_template.md`, `rss_source_compliance.md`, `/advertising-standards`, `/terms`, and `/privacy`

This document turns the paid-advertising checklist into an operating procedure. It is not legal advice.

## Implemented Technical And Public Controls

- Every paid component uses a separate `AdSlot` or `SponsorBadge` implementation rather than an article-card component.
- Every visible placement says `Advertisement` and `Paid sponsor` and identifies the advertiser.
- Ad links use `rel="sponsored nofollow noopener noreferrer"`, open in a new tab, and use a strict-origin referrer policy.
- The current sponsor destination was verified over HTTPS on August 31, 2026.
- Ads do not imitate publisher cards, newsroom controls, or system notices.
- Sponsor interaction events contain event type, campaign ID, sponsor, slot, and a `page-memory-only` marker. County and region fields were removed.
- No analytics recipient, ad network, pixel, account identifier, or behavioral profile is connected.
- LiveCoinWatch and TradingView ticker widgets load on every page. The Privacy Statement discloses what those vendors receive and states that the news feed, filters and sponsor labels do not depend on them.
- Publisher images and feed excerpts are not displayed in article cards under the launch-safe rights posture, and the news API strips `description` and `imageUrl` from every public response (`txbiz-api/src/public-view.ts`, asserted by `txbiz-api/tests/compliance.test.ts`).
- Discovery transports are filtered against a publisher rights registry, so no item is served beside paid inventory from an outlet outside the register (`txbiz-api/src/publisher-registry.ts`).
- Every placement declares a `disclosure` of `advertisement` or `house`, and the reader-facing label is derived from that field rather than written into the creative, so a placement cannot assert a relationship that does not exist. A house placement names the common ownership in its own label (`texaseconews/src/data/ads.ts`, `src/lib/ads.ts`).
- Each creative carries a `consideration` note recording what the advertiser gave for the placement, so a barter arrangement cannot go unrecorded.
- Security headers, including a Content-Security-Policy that allowlists only the consent-gated ticker vendors, ship with the build in `amplify.yml`.
- Automated WCAG 2.1 A/AA checks run against the main templates in `tests/accessibility.spec.ts`, and an Accessibility Statement is published at `/accessibility`.
- The contact form — the published intake path for privacy, correction, and copyright requests — carries a honeypot field, a minimum fill time, and a per-browser cooldown.
- Terms, Privacy, Editorial Methodology, and Advertising Standards pages disclose the material practices and contact path.

## Controls That Cannot Be Completed In Code

The operator must not mark these complete until evidence exists:

- Texas media/privacy counsel approves the final terms, privacy statement, aggregation posture, and advertiser contract.
- The legal operator name is inserted in contracts and any legally required notices. **Done:** Texas Business News, LLC is named in the Terms, the Privacy Statement, and the insertion order template.
- Media liability / errors-and-omissions insurance covering advertising injury, copyright infringement, and defamation is bound. General liability policies exclude these perils.
- A signed advertiser agreement or insertion order exists for every campaign.
- Source licenses and production RSS proxy terms are approved before production fallback is enabled.
- Vendor contracts and data processing terms are reviewed for AWS, EmailJS, the page API, and any optional widget retained for launch.
- The operator decides whether to seek DMCA safe-harbor protection. If yes, register a designated agent and publish the exact statutory notice process before claiming that protection.
- **Done:** the Texas Business News Team is the assigned owner for privacy, copyright, corrections, ad complaints, and regulator inquiries, reachable at admin@texasbusiness.news.

## Advertising Acceptance Standard

The public `/advertising-standards` page is the reader- and advertiser-facing rule. The internal review must reject:

- unlawful, deceptive, fraudulent, or unsafe offers;
- fabricated endorsements, impersonation, counterfeit goods, phishing, malware, or forced downloads;
- illegal discrimination in housing, employment, credit, insurance, or another protected context;
- adult exploitation, hate, harassment, graphic violence, or manipulative child-directed creative;
- tobacco, vaping, unlawfully marketed controlled substances, and products not lawful for the advertised Texas audience;
- claims or assets the advertiser cannot substantiate or license; and
- creative designed to look like editorial reporting, a publisher brand, a system message, or a site control.

Restricted categories require category-specific counsel review or must be declined:

- securities, investments, crypto, lending, credit, and banking;
- health, medical, pharmaceutical, supplement, and insurance;
- political candidates, ballot measures, issue advocacy, and government communications;
- alcohol, gambling, sweepstakes, firearms, hunting products, CBD, and hemp;
- testimonials, endorsements, before-and-after results, environmental claims, and comparative claims; and
- military, public-agency, university, or other themes with heightened false-association risk.

## Campaign Preflight

A reviewer from the Texas Business News Team must complete and retain this checklist before publication, recording the review date and the reviewing team:

- [ ] Confirm the advertiser's legal name, public brand, authorized contact, billing contact, and authority to submit the campaign.
- [ ] Obtain a signed `advertiser_insertion_order_template.md` or counsel-approved replacement.
- [ ] Record campaign dates, placement, context targeting, creative sizes, price, cancellation terms, and any exclusivity.
- [ ] Confirm the placement is contextual and uses no sensitive, precise-location, protected-class, child, health, hardship, or cross-site profile.
- [ ] Verify every destination and redirect uses HTTPS and matches the advertised offer.
- [ ] Scan the destination for malware, deceptive interfaces, forced downloads, missing advertiser identity, and material privacy concerns.
- [ ] Collect written support for every objective claim, price, result, testimonial, comparison, origin statement, and environmental or health claim.
- [ ] Confirm material conditions appear clearly and close to the claim.
- [ ] Confirm licenses for every logo, image, font, photograph, person, testimonial, trademark, and other asset.
- [ ] Confirm any regulated-category disclosure and approval.
- [ ] Check that creative does not imply endorsement by TexasBusiness.News, a publisher, a story subject, a county, a university, or a public entity.
- [ ] Render desktop and mobile screenshots showing `Advertisement` and `Paid sponsor` labels without scrolling or interaction.
- [ ] Check contrast, keyboard access, accessible name, animation safety, file weight, and responsive layout.
- [ ] Record final approval, approver, date, creative hash/version, and destination.

Any material creative, claim, destination, redirect, targeting, or campaign-date change requires re-review.

## Truth-In-Advertising File

For each campaign, retain:

- claim text and the complete net impression;
- evidence supplied by the advertiser;
- reviewer notes and open questions;
- required qualification or disclosure;
- testimonial consent and typical-results basis where applicable;
- regulated-category legal approval;
- final rendered screenshots; and
- approval or rejection decision.

Do not rely on a contract clause alone to cure an unsupported claim. TexasBusiness.News still controls publication and must perform a reasonable review.

## Disclosure Standard

Required visible wording:

- top label: `Advertisement`;
- identity line: `Paid sponsor: [advertiser name]`; and
- accessible name: `Advertisement paid for by [advertiser]`.

Disclosure must be:

- present in every placement and viewport;
- visible before a click;
- high contrast and readable;
- not hidden in hover, alt text, a tooltip, footer, terms page, or generic `Partner` language;
- repeated when one creative appears in separate feed locations; and
- preserved in screenshots retained with campaign records.

Sponsored editorial, advertorial, affiliate commerce, or paid recommendations are not currently offered. They require a separate native-ad policy and a stronger content-level disclosure before launch.

## Editorial Separation

- Advertising personnel and sponsors cannot require favorable coverage or removal of unfavorable third-party reporting.
- An ad may not be selected to imply that an adjacent publisher or story subject endorses it.
- Sponsor targeting categories remain separate from editorial topic labels.
- Ads may not inherit article schema, bylines, datelines, or publisher-link labels.
- Complaints about a sponsor are reviewed independently of revenue.

## Privacy And Measurement

Current measurement is intentionally limited:

- no cookies or local storage are written for ad measurement;
- no ad event is transmitted by this repository;
- no account, email, IP address, county, region, precise location, or cross-site ID is placed in `dataLayer`; and
- events disappear when the page session ends.

Before connecting analytics, GTM, a pixel, an ad server, conversion tracking, or audience matching:

1. map every field, recipient, purpose, retention period, contract, and transfer;
2. determine TDPSA and other applicable-law obligations;
3. update Privacy and Advertising Standards;
4. add consent or opt-out controls where required;
5. complete any required data-protection assessment;
6. prohibit sensitive-data targeting and unauthorized vendor reuse; and
7. add deterministic tests proving the choice is honored.

## Records And Retention

Create one campaign folder or record with:

- advertiser identity and contacts;
- signed agreement and insertion order;
- invoice and payment status;
- all creative versions and hashes;
- destination and redirect history;
- claim substantiation and licenses;
- regulated-category review;
- approval and rejection notes;
- campaign dates and placement configuration;
- desktop and mobile disclosure screenshots;
- measurement definition and reports;
- changes, pauses, complaints, refunds, and takedowns; and
- final closeout date.

Recommended draft retention is the campaign term plus at least four years, but counsel must set the final schedule based on contract, tax, advertising, privacy, litigation-hold, and regulated-category requirements. Delete personal information when no longer needed and suspend deletion for a valid legal hold.

## Complaint And Takedown Procedure

Requests go to the contact form or admin@texasbusiness.news.

1. Log receipt date, reporter, affected URL, campaign, claim, and evidence.
2. Acknowledge receipt without promising an outcome.
3. Pause immediately when there is a credible safety, malware, fraud, impersonation, rights, or unlawful-discrimination concern.
4. Preserve the challenged creative, destination, screenshots, approval file, and measurement record.
5. Route regulated, legal, privacy, or IP issues to counsel.
6. Record the decision, changes, notice to advertiser, and closure date.
7. Do not retaliate editorially against a complainant or source.

## Disclosure Standard By Type Of Consideration

Every placement carries the "Advertisement" label and identifies the advertiser. What varies is whether anything further must be said, and that turns on the relationship rather than on how the advertiser paid.

**Ordinary advertisement.** An unaffiliated advertiser gave consideration for the placement. Consideration may be money or an exchange of advertising. Barter is consideration, so a trade placement is a genuine advertisement and is disclosed as one; the form of the consideration is not something the reader needs, and stating it wrongly is exactly how a placement ends up making a claim that is not true. No placement may assert that an advertiser paid money unless one did.

**Reciprocal advertising (trade).** Where the consideration is an exchange of ad space, the arrangement still needs the same paperwork as a cash campaign: a written trade agreement naming both parties, the placements each side runs, the term, the value each side ascribes to the exchange, the right to reject or pull creative, and the termination terms. Record the exchange in the campaign file and in the creative's `consideration` field. An undocumented trade is the same evidence gap as an undocumented cash sale.

**House placement.** A placement promoting a business that Texas Business News, LLC or its owners also own. Common ownership is a material connection under the FTC's endorsement guidance and is disclosed in the placement's own label, not in a policy page. There is no active house placement.

The single active placement, Double B Ranch (`bbranchtexas.com`), is a reciprocal-advertising placement with a separate entity. It is labeled as an advertisement, identifies the advertiser, and links to the domain shown in the creative. The written trade agreement is outstanding.

## Editorial Scope For Government And Public-Sector Stories

Editorial coverage of government, defence and public-finance subjects is in scope where the story is economic: a contract, an installation, a budget, a tax measure, an appropriation or an infrastructure programme. This is an editorial scope decision and is separate from the advertising restricted-category list below, which continues to require category-specific legal review before any government, military or political *advertiser* is accepted. Covering a federal contract award is not the same as selling advertising to a defence contractor, and the two decisions stay independent.

## Release Gate

Paid launch is blocked until all of the following are true:

- [x] Legal operator identity formed and named in the public documents (Texas Business News, LLC). Counsel review of the governing documents is still outstanding.
- [ ] Counsel-approved advertiser agreement and insertion order.
- [ ] Media liability / E&O insurance bound.
- [x] Double B Ranch placement resolved: labeled as an ordinary advertisement identifying the advertiser, with the reciprocal-advertising consideration recorded on the creative.
- [ ] Written trade agreement for the Double B Ranch reciprocal-advertising arrangement.
- [x] Advertiser identity matches the destination: the creative reads `www.bbranchtexas.com` and the placement links to `bbranchtexas.com`.
- [ ] Complete rights record for news sources displayed beside paid inventory.
- [ ] Production RSS fallback disabled or fully licensed and proxy-approved.
- [ ] Vendor/data-flow review completed.
- [x] Reviewer and complaint owner assigned: the Texas Business News Team, contactable at admin@texasbusiness.news.
- [ ] Campaign records location and retention schedule approved.
- [ ] Desktop and mobile disclosure screenshots accepted.
- [ ] Final destination, claim, and asset-rights evidence approved.

Until then, the advertising implementation is a labeled preview/control system, not evidence that legal or contractual launch requirements have been completed.
