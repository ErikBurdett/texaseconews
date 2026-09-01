import doubleBRanchLogo from "../../ad-assets/bb-ranch-deer-final.png";

export type AdSlotId = "hero" | "feed-inline" | "sidebar" | "footer";
export type AdPlacement = "leaderboard" | "card" | "compact";

export type AdCreative = {
  id: string;
  campaignId: string;
  sponsor: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  imageUrl?: string;
  active: boolean;
  priority: number;
  placement: AdPlacement;
  targeting: {
    slots: AdSlotId[];
    countySlugs?: string[];
    regions?: string[];
    topics?: string[];
  };
};

export const ads: AdCreative[] = [
  {
    id: "double-b-ranch",
    campaignId: "double-b-ranch",
    sponsor: "Double B Ranch",
    title: "Premium ranch products from Double B Ranch",
    body: "Explore ranch offerings rooted in Texas land, wildlife, and premium outdoor living.",
    cta: "Visit Double B Ranch",
    href: "https://grandevistaranch.com/",
    imageUrl: doubleBRanchLogo,
    active: true,
    priority: 100,
    placement: "leaderboard",
    targeting: { slots: ["hero", "feed-inline", "sidebar", "footer"] },
  },
];
