export type TopicCategory = "technology" | "energy" | "industry" | "finance" | "places" | "public-sector" | "lifestyle" | "education" | "outdoors" | "real-estate";

export type TopicDefinition = {
  label: string;
  shortLabel?: string;
  category: TopicCategory;
  description: string;
  queryTerms: string[];
  subtopics?: string[];
};

export const topicCatalog = {
  ai: {
    label: "AI",
    category: "technology",
    description: "Artificial intelligence, automation, chips, and applied innovation across Texas.",
    queryTerms: ["AI", "artificial intelligence", "automation", "semiconductor", "chip"],
  },
  "data-centers": {
    label: "Data Centers",
    category: "technology",
    description: "Power, land, infrastructure, and data center investment signals.",
    queryTerms: ["data center", "data centers", "power infrastructure", "digital infrastructure"],
  },
  jobs: {
    label: "Jobs",
    category: "industry",
    description: "Hiring, workforce training, and employer expansion news.",
    queryTerms: ["jobs", "hiring", "workforce training", "new jobs", "job growth"],
  },
  manufacturing: {
    label: "Manufacturing",
    category: "industry",
    description: "Factories, industrial investment, production, chips, and supply-chain growth.",
    queryTerms: ["manufacturing", "factory", "industrial", "semiconductor", "production"],
  },
  energy: {
    label: "Energy",
    category: "energy",
    description: "Power generation, transmission, energy investment, and grid readiness.",
    queryTerms: ["energy", "power", "transmission", "renewable", "grid", "oil", "gas", "wind", "solar", "nuclear"],
    subtopics: ["Oil", "Gas", "Wind", "Solar", "Nuclear", "Grid", "Transmission", "Batteries", "Geothermal", "Hydrogen", "LNG"],
  },
  "small-business": {
    label: "Small Business",
    category: "industry",
    description: "Local entrepreneurship, startups, storefronts, and Main Street opportunity.",
    queryTerms: ["small business", "startup", "entrepreneur", "opens", "launches"],
  },
  technology: {
    label: "Technology",
    category: "technology",
    description: "Software, chips, data, AI, automation, digital infrastructure, and applied technology growth.",
    queryTerms: ["technology", "software", "AI", "data center", "semiconductor", "automation", "digital infrastructure"],
  },
  finance: {
    label: "Finance",
    category: "finance",
    description: "Banking, fintech, private equity, insurance, and Texas financial-sector growth.",
    queryTerms: ["finance", "banking", "fintech", "private equity", "insurance", "Texas Stock Exchange", "Y'all Street"],
    subtopics: ["Banking", "Fintech", "Private Equity", "Insurance", "Texas Financial System", "Texas Stock Exchange"],
  },
  "tx-stock-exchange": {
    label: "TX Stock Exchange",
    category: "finance",
    description: "Texas Stock Exchange, capital markets, listings, finance jobs, and related business services.",
    queryTerms: ["Texas Stock Exchange", "TXSE", "Y'all Street", "stock exchange", "capital markets", "listings"],
  },
  aerospace: {
    label: "Aerospace",
    category: "industry",
    description: "Aviation, space, aerospace manufacturing, suppliers, and launch economy stories.",
    queryTerms: ["aerospace", "aviation", "space industry", "spaceport", "aircraft manufacturing", "defense aerospace"],
  },
  infrastructure: {
    label: "Infrastructure",
    category: "industry",
    description: "Construction, rock, roads, ports, utilities, logistics, water, and public works growth.",
    queryTerms: ["infrastructure", "construction", "aggregate", "rock", "roads", "ports", "logistics", "water", "utilities"],
    subtopics: ["Rock", "Construction", "Roads", "Ports", "Logistics", "Water", "Utilities"],
  },
  semiconductors: {
    label: "Semiconductors",
    shortLabel: "Chips",
    category: "technology",
    description: "Chip fabs, semiconductor suppliers, advanced manufacturing, and electronics investment.",
    queryTerms: ["semiconductor", "semiconductors", "chip", "chips", "fab", "electronics manufacturing"],
  },
  robotics: {
    label: "Robotics",
    category: "technology",
    description: "Automation, robotics, drones, advanced manufacturing, and field technology in Texas.",
    queryTerms: ["robotics", "robot", "automation", "drones", "autonomous", "advanced manufacturing"],
  },
  film: {
    label: "Film",
    category: "lifestyle",
    description: "Studio investment, film production, workforce, and Texas movie-industry growth.",
    queryTerms: ["film industry", "movie production", "studio", "soundstage", "film incentives", "movie capital"],
  },
  "sports-business": {
    label: "Sports",
    category: "lifestyle",
    description: "College and pro sports operations, facilities, training centers, ownership, and sports health business.",
    queryTerms: ["sports business", "college sports", "pro sports", "training facility", "stadium", "sports operations", "sports health insurance"],
    subtopics: ["Business Operations", "New Facilities", "Training Facilities", "Sports Health Insurance"],
  },
  "theme-parks": {
    label: "Theme Parks",
    category: "lifestyle",
    description: "Attractions, destination development, entertainment districts, and theme-park investment.",
    queryTerms: ["theme park", "theme parks", "attractions", "entertainment district", "Frisco", "Disney", "Legoland"],
  },
  defense: {
    label: "Defense",
    category: "public-sector",
    description: "Defense, military, installations, contractors, aerospace defense, and allied security investment.",
    queryTerms: ["defense", "military", "army", "air force", "naval", "defense contractor", "European defense"],
  },
  medicine: {
    label: "Medicine",
    category: "industry",
    description: "Hospital construction, health research, medical real estate, biotech, and Texas health-system growth.",
    queryTerms: ["hospital construction", "medical research", "health system", "Baylor Scott White", "Rice", "MD Anderson", "biotech"],
  },
  medical: {
    label: "Medical",
    category: "industry",
    description: "Hospitals, care systems, research, medical real estate, and health business growth.",
    queryTerms: ["medical", "hospital", "health system", "Baylor Scott and White", "Baylor Scott White", "clinic", "medical research", "biotech"],
  },
  agriculture: {
    label: "Agricultural",
    category: "industry",
    description: "Farming, ranching, cattle, hemp, food systems, agtech, and rural business development.",
    queryTerms: ["agriculture", "farming", "ranching", "cattle", "hemp", "food production", "agtech"],
    subtopics: ["Hemp", "Farming", "Ranching", "Cattle", "Food", "Agtech"],
  },
  space: {
    label: "Space",
    category: "technology",
    description: "Space launch, aerospace suppliers, SpaceX, Blue Origin, Firefly, and Texas space-economy growth.",
    queryTerms: ["space", "SpaceX", "Blue Origin", "Firefly Aerospace", "spaceport", "launch site", "rocket", "aerospace"],
  },
  "real-estate": {
    label: "Real Estate",
    category: "real-estate",
    description: "Commercial real estate, development, housing, land, industrial, retail, and mixed-use growth.",
    queryTerms: ["real estate", "commercial real estate", "development", "land", "industrial real estate", "multifamily", "mixed-use"],
  },
  ranching: {
    label: "Ranching",
    category: "outdoors",
    description: "Ranching, land stewardship, rural business, wildlife, and working-land business trends.",
    queryTerms: ["ranching", "ranch", "ranch land", "land stewardship", "wildlife management", "rural business"],
  },
  cattle: {
    label: "Cattle",
    category: "industry",
    description: "Cattle, beef, livestock markets, ranch operations, and food-supply business news.",
    queryTerms: ["cattle", "beef", "livestock", "ranch operations", "cattle market", "meat processing"],
  },
  "higher-education": {
    label: "Higher Education",
    category: "education",
    description: "Texas colleges, universities, research, workforce pipelines, facilities, and higher-ed business activity.",
    queryTerms: ["higher education", "university", "college", "WTAMU", "West Texas A&M", "TSU", "Texas Southern University", "UT", "University of Texas", "Texas A&M"],
    subtopics: ["WTAMU", "TSU", "UT", "Texas A&M", "Research", "Workforce"],
  },
  hunting: {
    label: "Hunting",
    category: "outdoors",
    description: "Hunting, outfitting, wildlife, outdoor recreation, land, and tourism business.",
    queryTerms: ["hunting", "outfitter", "wildlife", "deer", "outdoor recreation", "hunting lease"],
  },
  tourism: {
    label: "Tourism",
    category: "lifestyle",
    description: "Travel, hospitality, attractions, destination marketing, conventions, and visitor economy growth.",
    queryTerms: ["tourism", "travel", "hospitality", "visitor economy", "hotel", "convention", "destination marketing"],
  },
  "state-parks": {
    label: "State Parks",
    category: "outdoors",
    description: "Texas state parks, outdoor recreation, park investments, trails, tourism, and conservation business.",
    queryTerms: ["Texas state parks", "state park", "TPWD", "parks and wildlife", "outdoor recreation", "trails"],
  },
} as const satisfies Record<string, TopicDefinition>;

export type TopicSlug = keyof typeof topicCatalog;

export const topicSlugs = Object.keys(topicCatalog) as TopicSlug[];
export const featuredTopicSlugs = [
  "energy",
  "robotics",
  "small-business",
  "infrastructure",
  "technology",
  "sports-business",
  "finance",
  "tx-stock-exchange",
  "agriculture",
  "space",
  "real-estate",
  "ranching",
  "cattle",
  "higher-education",
  "medical",
  "hunting",
  "tourism",
  "state-parks",
] as const satisfies TopicSlug[];

export const heroTopicSlugs = featuredTopicSlugs;

export function getTopicBySlug(slug?: string) {
  return slug && isTopicSlug(slug) ? topicCatalog[slug] : undefined;
}

export function isTopicSlug(slug: string): slug is TopicSlug {
  return slug in topicCatalog;
}
