import { countyQueryAliases, type TexasCounty } from "./counties";
import { regionCatalog, type RegionSlug } from "./regions";
import { topicCatalog, type TopicSlug } from "./topics";

export type FeedScope = "texas" | "county";

export type FeedDefinition = {
  id: string;
  label: string;
  scope: FeedScope;
  url: string;
  countySlug?: string;
  region?: string;
};

const positiveBusinessTerms = [
  "business growth",
  "jobs",
  "business expansion",
  "new headquarters",
  "manufacturing",
  "data center",
  "artificial intelligence",
  "AI",
  "semiconductor",
  "energy investment",
  "workforce training",
  "startup",
  "small business",
  "tourism",
  "infrastructure",
  "port expansion",
  "housing development",
  "business opportunity",
  "robotics",
  "technology",
  "sports business",
  "finance",
  "Texas Stock Exchange",
  "space",
  "SpaceX",
  "Blue Origin",
  "Firefly Aerospace",
  "real estate",
  "ranching",
  "cattle",
  "higher education",
  "medical",
  "Baylor Scott and White",
  "hunting",
  "state park",
] as const;

const countyGrowthTerms = [
  "business growth",
  "jobs",
  "hiring",
  "investment",
  "business expansion",
  "opens",
  "new headquarters",
  "manufacturing",
  "workforce training",
  "startup",
  "small business",
  "infrastructure",
  "housing development",
  "business opportunity",
  "economic development",
] as const;

const countySectorTerms = [
  "data center",
  "artificial intelligence",
  "semiconductor",
  "energy investment",
  "tourism",
  "robotics",
  "technology",
  "sports business",
  "finance",
  "space",
  "real estate",
  "ranching",
  "cattle",
  "higher education",
  "medical",
  "hunting",
  "state park",
] as const;

const countyDirectSources = [
  {
    id: "abc7-amarillo-local",
    label: "ABC7 Amarillo Local",
    url: "https://abc7amarillo.com/news/local.rss",
    countySlugs: ["potter", "randall"],
  },
  {
    id: "my-high-plains-news",
    label: "MyHighPlains News",
    url: "https://www.myhighplains.com/news/feed/",
    countySlugs: ["potter", "randall"],
  },
  {
    id: "my-high-plains-local",
    label: "MyHighPlains Local News",
    url: "https://www.myhighplains.com/news/local-news/feed/",
    countySlugs: ["potter", "randall"],
  },
  {
    id: "my-high-plains-today",
    label: "MyHighPlains Today in Amarillo",
    url: "https://www.myhighplains.com/news/today-in-amarillo/feed/",
    countySlugs: ["potter", "randall"],
  },
  {
    id: "amarillo-tribune",
    label: "Amarillo Tribune",
    url: "https://www.amarillotribune.org/feed/",
    countySlugs: ["potter", "randall"],
  },
] as const;

const excludedTerms = [
  "death",
  "killed",
  "murder",
  "shooting",
  "violence",
  "drug",
  "drugs",
  "arrest",
  "crash",
  "fatal",
  "crime",
  "lawsuit",
  "scandal",
  "layoff",
  "layoffs",
  "job cuts",
  "bankruptcy",
  "plant closure",
  "facility closure",
].map((term) => `-"${term}"`).join(" ");

export function googleNewsFeed(query: string) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", `${query} when:30d`);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  return url.toString();
}

export const statewideFeeds: FeedDefinition[] = [
  {
    id: "texas-growth",
    label: "Texas Growth",
    scope: "texas",
    url: googleNewsFeed(`Texas (${positiveBusinessTerms.slice(0, 13).join(" OR ")}) ${excludedTerms}`),
  },
  {
    id: "texas-ai-data-centers",
    label: "AI + Data Centers",
    scope: "texas",
    url: googleNewsFeed(`Texas ("data center" OR "artificial intelligence" OR AI OR semiconductor OR chip) jobs investment ${excludedTerms}`),
  },
  {
    id: "texas-opportunity",
    label: "Opportunity",
    scope: "texas",
    url: googleNewsFeed(`Texas ("business opportunity" OR "workforce training" OR startup OR "small business" OR "business expansion") ${excludedTerms}`),
  },
  {
    id: "texas-business-sectors",
    label: "Texas Business Sectors",
    scope: "texas",
    url: googleNewsFeed(`Texas (robotics OR technology OR finance OR "Texas Stock Exchange" OR space OR "real estate" OR ranching OR cattle OR "higher education" OR medical OR hunting OR tourism OR "state park") ${excludedTerms}`),
  },
];

export function topicFeed(topic: TopicSlug): FeedDefinition {
  const definition = topicCatalog[topic];
  return {
    id: `topic-${topic}`,
    label: definition.label,
    scope: "texas",
    url: googleNewsFeed(`Texas (${definition.queryTerms.join(" OR ")}) ${excludedTerms}`),
  };
}

export function regionFeed(region: RegionSlug, topic?: TopicSlug): FeedDefinition {
  const definition = regionCatalog[region];
  const locationTerms = definition.queryTerms.map((term) => `"${term}"`).join(" OR ");
  const terms = topic ? topicCatalog[topic].queryTerms.join(" OR ") : positiveBusinessTerms.join(" OR ");
  return {
    id: topic ? `region-${region}-${topic}` : `region-${region}`,
    label: topic ? `${definition.label} ${topicCatalog[topic].label}` : definition.label,
    scope: "texas",
    region: definition.label,
    url: googleNewsFeed(`(${locationTerms}) (${terms}) ${excludedTerms}`),
  };
}

export function countyFeed(county: TexasCounty, topic?: TopicSlug): FeedDefinition {
  const terms = topic ? topicCatalog[topic].queryTerms : countyGrowthTerms;
  return countyFeedForTerms(
    county,
    topic || "growth",
    topic ? `${county.displayName} ${topicCatalog[topic].label}` : `${county.displayName} Growth`,
    terms,
  );
}

function countyFeedForTerms(
  county: TexasCounty,
  idSuffix: string,
  label: string,
  terms: readonly string[],
): FeedDefinition {
  const locationTerms = countyQueryAliases(county).map((alias) => `"${alias}"`).join(" OR ");
  return {
    id: `county-${county.slug}-${idSuffix}`,
    label,
    scope: "county",
    countySlug: county.slug,
    region: county.region,
    url: googleNewsFeed(`(${locationTerms}) Texas (${joinQueryTerms(terms)}) ${excludedTerms}`),
  };
}

function countyGeneralFeeds(county: TexasCounty) {
  return [
    countyFeed(county),
    countyFeedForTerms(
      county,
      "sectors",
      `${county.displayName} Business Sectors`,
      countySectorTerms,
    ),
  ];
}

function directCountyFeeds(counties: TexasCounty[]): FeedDefinition[] {
  return counties.flatMap((county) =>
    countyDirectSources
      .filter((source) => source.countySlugs.some((slug) => slug === county.slug))
      .map((source) => ({
        id: `county-${county.slug}-direct-${source.id}`,
        label: source.label,
        scope: "county" as const,
        url: source.url,
        countySlug: county.slug,
        region: county.region,
      })),
  );
}

export function selectedFeeds(
  counties: TexasCounty[],
  topics: TopicSlug[],
  regions: RegionSlug[] = [],
) {
  if (counties.length) {
    const queryFeeds = topics.length
      ? counties.flatMap((county) => topics.map((topic) => countyFeed(county, topic)))
      : counties.flatMap(countyGeneralFeeds);
    return [...queryFeeds, ...directCountyFeeds(counties)];
  }
  if (regions.length) {
    return topics.length
      ? regions.flatMap((region) => topics.map((topic) => regionFeed(region, topic)))
      : regions.map((region) => regionFeed(region));
  }
  if (topics.length) return topics.map(topicFeed);
  return statewideFeeds;
}

function joinQueryTerms(terms: readonly string[]) {
  return terms
    .map((term) => term.includes(" ") ? `"${term}"` : term)
    .join(" OR ");
}
