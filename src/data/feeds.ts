import { getCountyExpansionTerms, getCountyMarketCities, getNearbyTexasCounties } from "../geo";
import type { CoverageTier } from "../lib/news-api";
import {
  countyAliases,
  countyQueryAliases,
  getCountyBySlug,
  type TexasCounty,
} from "./counties";
import { regionCatalog, type RegionSlug } from "./regions";
import { topicCatalog, type TopicSlug } from "./topics";

export type FeedScope = "texas" | "county";

export type FeedDefinition = {
  id: string;
  label: string;
  scope: FeedScope;
  url: string;
  coverageTier: CoverageTier;
  coverageLabel?: string;
  countySlug?: string;
  region?: string;
  /**
   * Browser-fallback evidence only. These terms are never copied to NewsItem
   * fields and must be found in an article title or plain-text description.
   */
  locationTerms: readonly string[];
};

export const countyFallbackFeedBounds = {
  primary: 6,
  market: 3,
  nearby: 1,
  total: 10,
} as const;

const maxTopicPlans = 4;

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

type DirectFeedSource = {
  id: string;
  label: string;
  url: string;
  statewide?: boolean;
  regionSlugs?: readonly RegionSlug[];
  countySlugs?: readonly string[];
};

const statewideLocationTerms = [
  "Texas",
  "Lone Star State",
  "ERCOT",
  "Dallas",
  "Dallas-Fort Worth",
  "DFW",
  "Fort Worth",
  "Houston",
  "Austin",
  "San Antonio",
  "El Paso",
  "Corpus Christi",
  "Amarillo",
  "Lubbock",
  "Midland",
  "McAllen",
  "Tyler",
  "Waco",
  "Beaumont",
  "Rio Grande Valley",
  "Permian Basin",
  "Texas Panhandle",
  "Gulf Coast",
] as const;

const directSources: readonly DirectFeedSource[] = [
  {
    id: "texas-tribune-economy",
    label: "Texas Tribune Economy",
    url: "https://www.texastribune.org/topics/economy/feed/",
    statewide: true,
  },
  {
    id: "dallas-fed-updates",
    label: "Dallas Fed Updates",
    url: "https://www.dallasfed.org/rss/updates.xml",
    statewide: true,
  },
  {
    id: "texas-comptroller-news",
    label: "Texas Comptroller News",
    url: "https://public.govdelivery.com/topics/TXCOMPT_1/feed.rss",
    statewide: true,
  },
  {
    id: "texas-real-estate-research-center",
    label: "Texas Real Estate Research Center",
    url: "https://trerc.tamu.edu/feed/?post_type=post",
    statewide: true,
  },
  {
    id: "agrilife-today",
    label: "AgriLife Today",
    url: "https://agrilifetoday.tamu.edu/feed/",
    statewide: true,
  },
  {
    id: "texas-energy-and-power",
    label: "Texas Energy & Power",
    url: "https://www.texasenergyandpower.com/feed",
    statewide: true,
  },
  {
    id: "texas-border-business",
    label: "Texas Border Business",
    url: "https://texasborderbusiness.com/feed/",
    statewide: true,
    countySlugs: ["hidalgo", "cameron"],
  },
  {
    id: "ketk-local",
    label: "KETK Local",
    url: "https://www.ketk.com/news/local-news/feed/",
    statewide: true,
    countySlugs: ["smith"],
  },
  {
    id: "dallas-innovates",
    label: "Dallas Innovates",
    url: "https://dallasinnovates.com/feed/",
    regionSlugs: ["dfw"],
    countySlugs: ["dallas"],
  },
  {
    id: "fort-worth-report-business",
    label: "Fort Worth Report Business",
    url: "https://fortworthreport.org/category/business/feed/",
    regionSlugs: ["dfw"],
    countySlugs: ["tarrant"],
  },
  {
    id: "houston-public-media-business",
    label: "Houston Public Media Business",
    url: "https://www.houstonpublicmedia.org/topics/news/business/feed/",
    regionSlugs: ["gulf"],
    countySlugs: ["harris"],
  },
  {
    id: "opportunity-austin",
    label: "Opportunity Austin",
    url: "https://opportunityaustin.com/feed/",
    regionSlugs: ["austin-corridor"],
    countySlugs: ["travis"],
  },
  {
    id: "bexar-ecd",
    label: "Bexar Economic & Community Development",
    url: "https://www.bexar.org/RSSFeed.aspx?ModID=1&CID=Economic-Community-Development-Press-Rel-65",
    regionSlugs: ["san-antonio"],
    countySlugs: ["bexar"],
  },
  {
    id: "san-antonio-report",
    label: "San Antonio Report",
    url: "https://sanantonioreport.org/feed/",
    regionSlugs: ["san-antonio"],
    countySlugs: ["bexar"],
  },
  {
    id: "el-paso-matters",
    label: "El Paso Matters",
    url: "https://elpasomatters.org/feed/",
    regionSlugs: ["west-texas"],
    countySlugs: ["el-paso"],
  },
  {
    id: "amarillo-edc",
    label: "Amarillo EDC",
    url: "https://amarilloedc.com/feed/",
    regionSlugs: ["texas-panhandle"],
    countySlugs: ["potter", "randall"],
  },
  {
    id: "midland-reporter-telegram",
    label: "Midland Reporter-Telegram",
    url: "https://www.mrt.com/news/feed/news-1437.php",
    regionSlugs: ["permian-basin", "west-texas"],
    countySlugs: ["midland"],
  },
  {
    id: "port-corpus-christi",
    label: "Port Corpus Christi",
    url: "https://portofcc.com/category/press-releases/feed/",
    regionSlugs: ["gulf"],
    countySlugs: ["nueces"],
  },
  {
    id: "everything-lubbock",
    label: "Everything Lubbock",
    url: "https://www.everythinglubbock.com/feed/",
    regionSlugs: ["west-texas"],
    countySlugs: ["lubbock"],
  },
  {
    id: "abc7-amarillo-local",
    label: "ABC7 Amarillo Local",
    url: "https://abc7amarillo.com/news/local.rss",
    regionSlugs: ["texas-panhandle"],
    countySlugs: ["potter", "randall"],
  },
  {
    id: "my-high-plains-news",
    label: "MyHighPlains News",
    url: "https://www.myhighplains.com/news/feed/",
    regionSlugs: ["texas-panhandle"],
    countySlugs: ["potter", "randall"],
  },
  {
    id: "my-high-plains-local",
    label: "MyHighPlains Local News",
    url: "https://www.myhighplains.com/news/local-news/feed/",
    regionSlugs: ["texas-panhandle"],
    countySlugs: ["potter", "randall"],
  },
  {
    id: "my-high-plains-today",
    label: "MyHighPlains Today in Amarillo",
    url: "https://www.myhighplains.com/news/today-in-amarillo/feed/",
    regionSlugs: ["texas-panhandle"],
    countySlugs: ["potter", "randall"],
  },
  {
    id: "amarillo-tribune",
    label: "Amarillo Tribune",
    url: "https://www.amarillotribune.org/feed/",
    regionSlugs: ["texas-panhandle"],
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

export function googleNewsFeed(query: string, windowDays = 30) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", `${query} when:${windowDays}d`);
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
    coverageTier: "statewide",
    coverageLabel: "Texas statewide",
    locationTerms: statewideLocationTerms,
  },
  {
    id: "texas-ai-data-centers",
    label: "AI + Data Centers",
    scope: "texas",
    url: googleNewsFeed(`Texas ("data center" OR "artificial intelligence" OR AI OR semiconductor OR chip) jobs investment ${excludedTerms}`),
    coverageTier: "statewide",
    coverageLabel: "Texas statewide",
    locationTerms: statewideLocationTerms,
  },
  {
    id: "texas-opportunity",
    label: "Opportunity",
    scope: "texas",
    url: googleNewsFeed(`Texas ("business opportunity" OR "workforce training" OR startup OR "small business" OR "business expansion") ${excludedTerms}`),
    coverageTier: "statewide",
    coverageLabel: "Texas statewide",
    locationTerms: statewideLocationTerms,
  },
  {
    id: "texas-business-sectors",
    label: "Texas Business Sectors",
    scope: "texas",
    url: googleNewsFeed(`Texas (robotics OR technology OR finance OR "Texas Stock Exchange" OR space OR "real estate" OR ranching OR cattle OR "higher education" OR medical OR hunting OR tourism OR "state park") ${excludedTerms}`),
    coverageTier: "statewide",
    coverageLabel: "Texas statewide",
    locationTerms: statewideLocationTerms,
  },
];

export function topicFeed(topic: TopicSlug): FeedDefinition {
  const definition = topicCatalog[topic];
  return {
    id: `topic-${topic}`,
    label: definition.label,
    scope: "texas",
    url: googleNewsFeed(`Texas (${definition.queryTerms.join(" OR ")}) ${excludedTerms}`),
    coverageTier: "statewide",
    coverageLabel: "Texas statewide",
    locationTerms: statewideLocationTerms,
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
    url: googleNewsFeed(`Texas (${locationTerms}) (${terms}) ${excludedTerms}`),
    coverageTier: "statewide",
    coverageLabel: definition.label,
    locationTerms: definition.queryTerms,
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
    coverageTier: "county",
    coverageLabel: county.displayName,
    countySlug: county.slug,
    region: county.region,
    url: googleNewsFeed(`(${locationTerms}) Texas (${joinQueryTerms(terms)}) ${excludedTerms}`),
    locationTerms: countyAliases(county).map(({ label: alias }) => alias),
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

function directCountyFeeds(county: TexasCounty): FeedDefinition[] {
  return directSources
    .filter((source) => source.countySlugs?.includes(county.slug))
    .map((source) => ({
      id: `county-${county.slug}-direct-${source.id}`,
      label: source.label,
      scope: "county",
      url: source.url,
      coverageTier: "county",
      coverageLabel: county.displayName,
      countySlug: county.slug,
      region: county.region,
      locationTerms: countyAliases(county).map(({ label: alias }) => alias),
    }));
}

export function primaryCountyFeeds(
  county: TexasCounty,
  topics: readonly TopicSlug[] = [],
): FeedDefinition[] {
  const boundedTopics = uniqueValues(topics).slice(0, maxTopicPlans);
  const queryFeeds = boundedTopics.length
    ? boundedTopics.map((topic) => countyFeed(county, topic))
    : countyGeneralFeeds(county);

  return [...queryFeeds, ...directCountyFeeds(county)]
    .slice(0, countyFallbackFeedBounds.primary);
}

export function marketCountyFeeds(
  county: TexasCounty,
  topics: readonly TopicSlug[] = [],
): FeedDefinition[] {
  const marketCities = getCountyMarketCities(county, 2);
  const expansionTerms = getCountyExpansionTerms(county, 2);
  const planTerms = uniqueValues([...marketCities, ...expansionTerms])
    .slice(0, 2);
  const businessTerms = expansionBusinessTerms(topics);

  if (!planTerms.length) return [];
  const marketLabel = planTerms.join(" / ");
  const marketKeys = new Set(planTerms.map(normalizeLookupKey));
  const searchFeed: FeedDefinition = {
    id: `county-${county.slug}-market-${slugifyId(marketLabel)}`,
    label: `${marketLabel} market`,
    scope: "county",
    url: googleNewsFeed(`Texas (${joinQuotedTerms(planTerms)}) (${joinQueryTerms(businessTerms)}) ${excludedTerms}`, 60),
    coverageTier: "market",
    coverageLabel: `${marketLabel} market`,
    locationTerms: planTerms,
  };
  const directMarketFeeds: FeedDefinition[] = directSources
    .filter((source) =>
      sourceMarketTerms(source).some((term) =>
        marketKeys.has(normalizeLookupKey(term))
      )
    )
    .map((source) => ({
      id: `county-${county.slug}-market-direct-${source.id}`,
      label: source.label,
      scope: "county",
      url: source.url,
      coverageTier: "market",
      coverageLabel: `${marketLabel} market`,
      locationTerms: planTerms,
    }));

  return [searchFeed, ...directMarketFeeds]
    .slice(0, countyFallbackFeedBounds.market);
}

export function nearbyCountyFeeds(
  county: TexasCounty,
  topics: readonly TopicSlug[] = [],
): FeedDefinition[] {
  const businessTerms = expansionBusinessTerms(topics);
  const nearbyCounties = getNearbyTexasCounties(county, 3);
  if (!nearbyCounties.length) return [];
  const queryAliases = nearbyCounties.flatMap(countyQueryAliases);
  const nearbyLabel = nearbyCounties
    .map((nearbyCounty) => nearbyCounty.displayName)
    .join(" / ");
  return [{
    id: `county-${county.slug}-nearby`,
    label: `${nearbyLabel} business`,
    scope: "county",
    url: googleNewsFeed(`Texas (${joinQuotedTerms(queryAliases)}) (${joinQueryTerms(businessTerms)}) ${excludedTerms}`, 60),
    coverageTier: "nearby",
    coverageLabel: nearbyLabel,
    locationTerms: nearbyCounties.flatMap((nearbyCounty) =>
      countyAliases(nearbyCounty)
        .filter(({ label }) => /\bTexas\b|(?:^|\s)TX$/i.test(label))
        .map(({ label: alias }) => alias)
    ),
  }];
}

export function countyExpansionFeeds(
  county: TexasCounty,
  topics: readonly TopicSlug[] = [],
): FeedDefinition[] {
  return [
    ...marketCountyFeeds(county, topics),
    ...nearbyCountyFeeds(county, topics),
  ].slice(0, countyFallbackFeedBounds.total - countyFallbackFeedBounds.primary);
}

export function statewideFallbackFeeds(
  topics: readonly TopicSlug[] = [],
  regions: readonly RegionSlug[] = [],
): FeedDefinition[] {
  const boundedTopics = uniqueValues(topics).slice(0, maxTopicPlans);
  const boundedRegions = uniqueValues(regions).slice(0, 4);
  const searchFeeds = boundedRegions.length
    ? boundedTopics.length
      ? boundedRegions.flatMap((region) => boundedTopics.map((topic) => regionFeed(region, topic)))
      : boundedRegions.map((region) => regionFeed(region))
    : boundedTopics.length
      ? boundedTopics.map(topicFeed)
      : statewideFeeds;

  return uniqueFeeds([
    ...searchFeeds,
    ...statewideDirectFeeds(),
    ...regionalDirectFeeds(boundedRegions),
  ]).slice(0, 10);
}

function statewideDirectFeeds(): FeedDefinition[] {
  return directSources
    .filter((source) => source.statewide)
    .slice(0, 6)
    .map((source) => ({
      id: `texas-direct-${source.id}`,
      label: source.label,
      scope: "texas",
      url: source.url,
      coverageTier: "statewide",
      coverageLabel: "Texas statewide",
      locationTerms: statewideLocationTerms,
    }));
}

function regionalDirectFeeds(regions: readonly RegionSlug[]): FeedDefinition[] {
  return regions.flatMap((region) => {
    const definition = regionCatalog[region];
    return directSources
      .filter((source) => source.regionSlugs?.includes(region))
      .map((source) => ({
        id: `region-${region}-direct-${source.id}`,
        label: source.label,
        scope: "texas",
        url: source.url,
        coverageTier: "statewide",
        coverageLabel: definition.label,
        region: definition.label,
        locationTerms: definition.queryTerms,
      }));
  });
}

export function selectedFeeds(
  counties: TexasCounty[],
  topics: TopicSlug[],
  regions: RegionSlug[] = [],
) {
  if (counties.length) {
    return counties.flatMap((county) => primaryCountyFeeds(county, topics));
  }
  return statewideFallbackFeeds(topics, regions);
}

function joinQueryTerms(terms: readonly string[]) {
  return terms
    .map((term) => term.includes(" ") ? `"${term}"` : term)
    .join(" OR ");
}

function expansionBusinessTerms(topics: readonly TopicSlug[]) {
  const boundedTopics = uniqueValues(topics).slice(0, maxTopicPlans);
  if (!boundedTopics.length) {
    return uniqueValues([
      ...countyGrowthTerms,
      ...countySectorTerms,
    ]).slice(0, 24);
  }
  return uniqueValues(
    boundedTopics.flatMap((topic) => topicCatalog[topic].queryTerms),
  ).slice(0, 18);
}

function joinQuotedTerms(terms: readonly string[]) {
  return uniqueValues(terms)
    .slice(0, 10)
    .map((term) => `"${escapeQueryPhrase(term)}"`)
    .join(" OR ");
}

function escapeQueryPhrase(value: string) {
  return value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
}

function slugifyId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sourceMarketTerms(source: DirectFeedSource) {
  return (source.countySlugs || [])
    .map(getCountyBySlug)
    .filter((county): county is TexasCounty => Boolean(county))
    .flatMap((county) => getCountyMarketCities(county, 3));
}

function normalizeLookupKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueValues<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function uniqueFeeds(feeds: FeedDefinition[]) {
  const seen = new Set<string>();
  return feeds.filter((feed) => {
    const key = `${feed.coverageTier}|${feed.url}|${feed.countySlug || ""}|${feed.region || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
