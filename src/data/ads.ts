import doubleBRanchLogo from "../../ad-assets/bb-ranch-deer-final.webp";

export type AdSlotId = "hero" | "feed-inline" | "sidebar" | "footer";
export type AdPlacement = "leaderboard" | "card" | "compact";

/**
 * How a placement is disclosed to readers.
 *
 * "advertisement" covers a placement an unaffiliated advertiser gave
 * consideration for, whether that consideration is cash or an exchange of
 * advertising. "house" is reserved for a placement promoting a business the
 * operator also owns, where the FTC's endorsement guidance turns on that
 * material connection and it has to appear in the label itself.
 *
 * The label is derived from this field rather than written into each creative,
 * so a placement cannot end up asserting a relationship that does not exist.
 */
export type AdDisclosure = "advertisement" | "house";

export type AdCreative = {
  id: string;
  campaignId: string;
  sponsor: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  disclosure: AdDisclosure;
  /**
   * What the advertiser gave for the placement. Kept with the creative because
   * the advertising program requires a record of consideration per campaign,
   * and a barter arrangement is easy to leave undocumented.
   */
  consideration?: string;
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
    // The creative reads www.bbranchtexas.com; the destination must match it.
    href: "https://bbranchtexas.com/",
    disclosure: "advertisement",
    consideration:
      "Reciprocal advertising — Double B Ranch, a separate entity, carries " +
      "TexasBusiness.News placements in exchange. Barter is consideration, so " +
      "this is a genuine advertisement and needs a written trade agreement on file.",
    imageUrl: doubleBRanchLogo,
    active: true,
    priority: 100,
    placement: "leaderboard",
    targeting: { slots: ["hero", "feed-inline", "sidebar", "footer"] },
  },
];
