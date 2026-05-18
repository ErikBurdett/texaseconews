export const topicCatalog = {
  ai: {
    label: "AI",
    description: "Artificial intelligence, automation, chips, and applied innovation across Texas.",
    queryTerms: ["AI", "artificial intelligence", "automation", "semiconductor", "chip"],
  },
  "data-centers": {
    label: "Data Centers",
    description: "Power, land, infrastructure, and data center investment signals.",
    queryTerms: ["data center", "data centers", "power infrastructure", "digital infrastructure"],
  },
  jobs: {
    label: "Jobs",
    description: "Hiring, workforce training, and employer expansion news.",
    queryTerms: ["jobs", "hiring", "workforce training", "new jobs", "job growth"],
  },
  manufacturing: {
    label: "Manufacturing",
    description: "Factories, industrial investment, production, chips, and supply-chain growth.",
    queryTerms: ["manufacturing", "factory", "industrial", "semiconductor", "production"],
  },
  energy: {
    label: "Energy",
    description: "Power generation, transmission, energy investment, and grid readiness.",
    queryTerms: ["energy", "power", "transmission", "renewable", "grid"],
  },
  "small-business": {
    label: "Small Business",
    description: "Local entrepreneurship, startups, storefronts, and Main Street opportunity.",
    queryTerms: ["small business", "startup", "entrepreneur", "opens", "launches"],
  },
} as const;

export type TopicSlug = keyof typeof topicCatalog;

export const topicSlugs = Object.keys(topicCatalog) as TopicSlug[];

export function getTopicBySlug(slug?: string) {
  return slug && isTopicSlug(slug) ? topicCatalog[slug] : undefined;
}

export function isTopicSlug(slug: string): slug is TopicSlug {
  return slug in topicCatalog;
}
