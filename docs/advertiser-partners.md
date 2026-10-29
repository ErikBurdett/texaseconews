# Advertiser partners

The owner requested all four placements and supplied the Advanced Matrix,
Wind’s Eye Capital, and Western Heritage logos. These are business profiles and
brand advertisements; the copy does not offer securities, promise returns,
quantify jobs, or claim endorsements. No contract or payment arrangement is
inferred for the three new advertisers. Double B Ranch retains its documented
reciprocal advertising arrangement. The operator maintains campaign agreements
separately.

## Copy sources reviewed October 28, 2026

- Advanced Matrix: https://www.advancedmatrixllc.net/ — civil construction,
  small-scale EPC, site support, renewable energy and data centers in Texas and
  Oklahoma.
- Wind’s Eye Capital: https://windseyecapital.com/ — the site was readable during
  this review despite the reported outage; Amarillo address, commercial real
  estate, Sun Belt focus. No placeholder testimonials or return claims reused.
- Western Heritage: https://westernheritagerealtytx.com/ — Silverton brokerage,
  farm/ranch/residential/investment property and regional service area.
- Double B Ranch: https://bbranchtexas.com/ and the maintained gv-ranch frontend
  Home/About pages — Caprock heritage, ranch landscapes and branded merchandise.

The Texas-growth paragraphs describe how those services relate to the economy;
no unverified project outcomes are attributed to an advertiser.

## Delivery

- Four local WebP logos total 23,206 bytes (about 22.7 KiB). The supplied files
  plus the previously shipped ranch WebP totaled 33,885 bytes. Logo shapes and
  lettering are preserved. The Matrix file is trimmed to remove its large empty
  border. White/black logo backplates retain readable original brand colors.
- Double B Ranch: 200×200, 10,246 bytes, lossless WebP, down from 14,898 bytes.
- Advanced Matrix: 231×117, 3,794 bytes, lossless WebP.
- Wind’s Eye Capital: 176×124, 3,082 bytes, WebP quality 85.
- Western Heritage: native 150×150, 6,084 bytes, lossless WebP. Not enlarged into
  a fake high-resolution source.
- Local assets use build hashes (small files may be inlined by Vite). No remote
  logo requests, ad SDK, or tracking service was added. Images use fixed boxes,
  asynchronous decoding, and lazy loading for cards/profiles.
- Four homepage placements; inline ads rotate through all four every ten news
  articles. Footer selection varies by route; filters retain a compact badge.
- `/partners` is linked in desktop/mobile navigation and the footer, added to
  the sitemap and explicit Amplify HTTP-200 SPA rewrite.
- Every ad and profile CTA opens its advertiser’s HTTPS website in a new tab
  with sponsored/nofollow/noopener/noreferrer attributes.
- Existing in-memory ad measurement remains local; Google Analytics is pending.

## Validation

Lint and production build passed. Desktop and mobile checks cover all four
feed rotations, local image decoding, sponsor labels, outbound destinations,
actual new-tab behavior, and responsive overflow. Automated WCAG checks cover
the home, partners page, and mobile navigation. The news API is unchanged.
