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
    id: "tx-innovation-council",
    campaignId: "launch-partners",
    sponsor: "Texas Innovation Council",
    title: "Back the next Texas growth story",
    body: "Sponsor positive coverage in the counties where your work is creating jobs, infrastructure, and momentum.",
    cta: "Become a launch partner",
    href: "/advertise",
    active: true,
    priority: 90,
    placement: "leaderboard",
    targeting: { slots: ["hero", "footer"] },
  },
  {
    id: "ai-corridor-brief",
    campaignId: "ai-data-centers",
    sponsor: "Opportunity Desk",
    title: "AI, power, and Texas land readiness",
    body: "Reach readers tracking AI infrastructure and data center development across fast-growing Texas markets.",
    cta: "Explore the corridor",
    href: "/advertise",
    active: true,
    priority: 80,
    placement: "card",
    targeting: { slots: ["feed-inline", "sidebar"], topics: ["ai", "data-centers"] },
  },
  {
    id: "county-growth-spotlight",
    campaignId: "county-growth",
    sponsor: "Texas EcoNews",
    title: "Sponsor a county growth spotlight",
    body: "Put your project in front of readers tracking new jobs, new investment, and local Texas opportunity.",
    cta: "Reserve a county",
    href: "/advertise",
    active: true,
    priority: 70,
    placement: "compact",
    targeting: { slots: ["feed-inline", "sidebar"] },
  },
];
