export type AdvertiserTierKey = "preferred" | "gold" | "platinum" | "county" | "statewide";
export type AdvertiserPlacementKey =
  | "advertiser-directory"
  | "ticker-sponsor"
  | "county-hero-sponsor"
  | "statewide-hero-sponsor"
  | "feed-articles"
  | "feed-industry"
  | "county-sidebar"
  | "footer-banner";
export type BillingCadence = "monthly" | "annual";

export type AdvertiserTier = {
  key: AdvertiserTierKey;
  label: string;
  monthly?: number;
  annual?: number;
  summary: string;
  includes: string[];
};

export type AdvertiserPlacement = {
  key: AdvertiserPlacementKey;
  label: string;
  tier: AdvertiserTierKey;
  monthly?: number;
  annual?: number;
  priceLabel: string;
  description: string;
  format: "250×250" | "980×300" | "Presented by";
  countyTargeted: boolean;
};

export const advertiserTiers: AdvertiserTier[] = [
  {
    key: "preferred",
    label: "Preferred Advertiser",
    monthly: 95,
    annual: 950,
    summary: "A clickable advertiser directory listing with logo, description, and destination link.",
    includes: ["Advertiser directory listing", "Business logo and short description", "Website or social profile link"],
  },
  {
    key: "gold",
    label: "Gold Advertiser",
    monthly: 295,
    annual: 2_950,
    summary: "A feed, ticker, sidebar, or industry sponsorship plus directory visibility.",
    includes: ["Everything in Preferred", "One primary feed or Presented by sponsorship", "Rotating sponsor placement"],
  },
  {
    key: "platinum",
    label: "Platinum Advertiser",
    monthly: 495,
    annual: 4_950,
    summary: "Priority rotation and a responsive page-bottom banner with directory visibility.",
    includes: ["Everything in Gold", "Priority sponsor rotation", "980×300 page-bottom banner", "Feed sponsorship priority"],
  },
  {
    key: "county",
    label: "County Advertiser",
    monthly: 995,
    annual: 9_950,
    summary: "Premium county hero Presented by visibility for a category leader in one county.",
    includes: ["County hero Presented by logo and link", "Premium county-specific visibility", "Directory listing"],
  },
  {
    key: "statewide",
    label: "Statewide Advertiser",
    summary: "Custom statewide hero, homepage rotation, and category-exclusivity options.",
    includes: ["Statewide hero Presented by", "Homepage sponsor rotation", "Page-bottom banner inventory", "Custom category exclusivity options"],
  },
];

export const advertiserPlacements: AdvertiserPlacement[] = [
  {
    key: "advertiser-directory",
    label: "Advertiser directory listing",
    tier: "preferred",
    monthly: 95,
    annual: 950,
    priceLabel: "$95/mo · $950/yr",
    description: "Clickable business logo, short description, and destination link.",
    format: "250×250",
    countyTargeted: false,
  },
  {
    key: "ticker-sponsor",
    label: "Market ticker sponsor",
    tier: "gold",
    monthly: 295,
    annual: 2_950,
    priceLabel: "$295/mo · $2,950/yr",
    description: "Compact Presented by placement near the market and crypto ticker stack.",
    format: "Presented by",
    countyTargeted: false,
  },
  {
    key: "county-hero-sponsor",
    label: "County hero Presented by",
    tier: "county",
    monthly: 995,
    annual: 9_950,
    priceLabel: "$995/mo · $9,950/yr",
    description: "Premium Presented by placement on a selected county experience.",
    format: "Presented by",
    countyTargeted: true,
  },
  {
    key: "statewide-hero-sponsor",
    label: "Statewide hero Presented by",
    tier: "statewide",
    priceLabel: "Custom statewide quote",
    description: "Custom homepage hero and statewide visibility package.",
    format: "Presented by",
    countyTargeted: false,
  },
  {
    key: "feed-articles",
    label: "Articles feed sponsor",
    tier: "gold",
    monthly: 295,
    annual: 2_950,
    priceLabel: "$295/mo · $2,950/yr",
    description: "Responsive in-feed placement after every five article cards.",
    format: "250×250",
    countyTargeted: true,
  },
  {
    key: "feed-industry",
    label: "Industry feed sponsor",
    tier: "gold",
    monthly: 295,
    annual: 2_950,
    priceLabel: "$295/mo · $2,950/yr",
    description: "Presented by or in-feed visibility for one Texas business industry.",
    format: "250×250",
    countyTargeted: false,
  },
  {
    key: "county-sidebar",
    label: "County sidebar sponsor",
    tier: "gold",
    monthly: 295,
    annual: 2_950,
    priceLabel: "$295/mo · $2,950/yr",
    description: "Rotating county-targeted card beside feed controls.",
    format: "250×250",
    countyTargeted: true,
  },
  {
    key: "footer-banner",
    label: "Page-bottom banner",
    tier: "platinum",
    monthly: 495,
    annual: 4_950,
    priceLabel: "$495/mo · $4,950/yr",
    description: "Responsive 980×300 banner across page bottoms.",
    format: "980×300",
    countyTargeted: false,
  },
];

export const adAssetSpecs = [
  {
    format: "Square / card creative",
    dimensions: "250×250 px",
    fileTypes: "JPG or PNG",
    maximumFileSize: "10 MB upload limit; under 300 KB recommended",
  },
  {
    format: "Page-bottom banner",
    dimensions: "980×300 px",
    fileTypes: "JPG or PNG",
    maximumFileSize: "10 MB upload limit; under 500 KB recommended",
  },
] as const;

export const additionalCountyMultiplier = 0.5;
export const multiPlacementDiscount = 0.1;
export const categoryExclusivityPremiumRange = "25%–50%";

export function placementByKey(key: AdvertiserPlacementKey) {
  return advertiserPlacements.find((placement) => placement.key === key) || advertiserPlacements[0];
}

export function calculateAdvertiserPrice(
  placementKey: AdvertiserPlacementKey,
  billing: BillingCadence,
  countyCount: number,
) {
  const placement = placementByKey(placementKey);
  const base = billing === "annual" ? placement.annual : placement.monthly;
  if (base === undefined) return { due: 0, base: 0, isQuoteOnly: true };

  const targetCount = placement.countyTargeted ? Math.max(1, countyCount) : 1;
  const additionalTargets = Math.max(0, targetCount - 1);
  const due = base + additionalTargets * base * additionalCountyMultiplier;

  return { due, base, isQuoteOnly: false };
}

export function formatAdPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}
