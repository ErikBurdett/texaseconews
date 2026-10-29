import doubleBRanchLogo from "../../ad-assets/partners/double-b-ranch.webp";
import matrixLogo from "../../ad-assets/partners/advanced-matrix.webp";
import windsEyeLogo from "../../ad-assets/partners/winds-eye-capital.webp";
import westernHeritageLogo from "../../ad-assets/partners/western-heritage.webp";

export type AdSlotId = "hero" | "feed-inline" | "sidebar" | "footer" | "partners";
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
  logoTheme: "dark" | "light" | "black";
  sector: string;
  about: string;
  texasImpact: string;
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
    title: "Rooted in the Texas Caprock",
    body: "Discover ranch heritage, canyon country, and Double B Ranch merchandise.",
    cta: "Visit Double B Ranch",
    // The creative reads www.bbranchtexas.com; the destination must match it.
    href: "https://bbranchtexas.com/",
    disclosure: "advertisement",
    consideration:
      "Reciprocal advertising — Double B Ranch, a separate entity, carries " +
      "TexasBusiness.News placements in exchange. Barter is consideration, so " +
      "this is a genuine advertisement and needs a written trade agreement on file.",
    imageUrl: doubleBRanchLogo,
    logoTheme: "dark",
    sector: "Ranch heritage & merchandise",
    about: "Double B Ranch shares the landscapes and history of the Texas Caprock, alongside ranch-branded apparel and merchandise.",
    texasImpact: "Its focus on ranch heritage brings attention to rural Texas, its communities, and the landscapes behind the state’s agricultural identity. Its reciprocal advertising with TexasBusiness.News also helps readers discover positive Texas business coverage.",
    active: true,
    priority: 100,
    placement: "leaderboard",
    targeting: { slots: ["hero", "feed-inline", "sidebar", "footer", "partners"] },
  },
  {
    id: "advanced-matrix", campaignId: "advanced-matrix", sponsor: "Advanced Matrix LLC",
    title: "Building the next Texas chapter",
    body: "Civil construction and site support for renewable energy and data center infrastructure.",
    cta: "Explore Advanced Matrix", href: "https://www.advancedmatrixllc.net/",
    disclosure: "advertisement", imageUrl: matrixLogo, logoTheme: "black",
    sector: "Construction & infrastructure",
    about: "Advanced Matrix LLC provides civil construction, small-scale engineering, procurement and construction solutions, and specialized site support. Its operations focus on renewable energy and data center projects across Texas and Oklahoma.",
    texasImpact: "Site preparation, construction, and ongoing support help create the physical infrastructure Texas businesses depend on. The firm’s work serves two areas of the state’s economy: energy development and digital infrastructure.",
    active: true, priority: 90, placement: "leaderboard",
    targeting: { slots: ["hero", "feed-inline", "sidebar", "footer", "partners"] },
  },
  {
    id: "winds-eye-capital", campaignId: "winds-eye-capital", sponsor: "Wind’s Eye Capital",
    title: "West Texas roots. A broader horizon.",
    body: "A relationship-driven commercial real estate firm based in Amarillo.",
    cta: "Meet Wind’s Eye Capital", href: "https://windseyecapital.com/",
    disclosure: "advertisement", imageUrl: windsEyeLogo, logoTheme: "light",
    sector: "Commercial real estate",
    about: "Based in Amarillo, Wind’s Eye Capital is a commercial real estate private equity firm focused on growth markets across the Sun Belt. Its stated interests include industrial, multifamily, retail, and mixed-use real estate.",
    texasImpact: "Commercial property connects capital with the places where people work, live, and do business. The firm brings a West Texas base and a relationship-focused approach to that part of the economy.",
    active: true, priority: 80, placement: "leaderboard",
    targeting: { slots: ["hero", "feed-inline", "sidebar", "footer", "partners"] },
  },
  {
    id: "western-heritage", campaignId: "western-heritage", sponsor: "Western Heritage Realty & Investments",
    title: "Land. Legacy. New possibilities.",
    body: "Local real estate expertise for Texas farms, ranches, homes, and commercial property.",
    cta: "Explore Western Heritage", href: "https://westernheritagerealtytx.com/",
    disclosure: "advertisement", imageUrl: westernHeritageLogo, logoTheme: "light",
    sector: "Texas land & real estate",
    about: "Western Heritage Realty & Investments is a real estate brokerage based in Silverton, Texas. It serves buyers and sellers across the Panhandle, South Plains, and beyond, with a focus on farm, ranch, residential, and investment properties.",
    texasImpact: "Helping buyers and sellers navigate land and property transactions supports the movement of Texas’s rural economy. Agricultural acreage, homes, and commercial spaces give families, producers, and businesses places to build their next chapter.",
    active: true, priority: 70, placement: "leaderboard",
    targeting: { slots: ["hero", "feed-inline", "sidebar", "footer", "partners"] },
  },
];
