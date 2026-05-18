import { countyQueryAliases, type TexasCounty } from "./counties";
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

const positiveEconomicTerms = [
  "economic growth",
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
  "economic opportunity",
];

const excludedTerms = "-death -killed -murder -shooting -violence -drug -drugs -arrest -crash -fatal -crime -lawsuit -scandal";

export function googleNewsFeed(query: string) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
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
    url: googleNewsFeed(`Texas (${positiveEconomicTerms.slice(0, 7).join(" OR ")}) ${excludedTerms}`),
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
    url: googleNewsFeed(`Texas ("economic opportunity" OR "workforce training" OR startup OR "small business" OR "business expansion") ${excludedTerms}`),
  },
];

export function topicFeed(topic: TopicSlug): FeedDefinition {
  const topicDefinition = topicCatalog[topic];
  const terms = topicDefinition.queryTerms.join(" OR ");

  return {
    id: `topic-${topic}`,
    label: topicDefinition.label,
    scope: "texas",
    url: googleNewsFeed(`Texas (${terms}) ${excludedTerms}`),
  };
}

export function countyFeed(county: TexasCounty, topic?: TopicSlug): FeedDefinition {
  const locationTerms = countyQueryAliases(county).map((alias) => `"${alias}"`).join(" OR ");
  const terms = topic ? topicCatalog[topic].queryTerms.join(" OR ") : positiveEconomicTerms.join(" OR ");

  return {
    id: topic ? `county-${county.slug}-${topic}` : `county-${county.slug}`,
    label: topic ? `${county.displayName} ${topicCatalog[topic].label}` : county.displayName,
    scope: "county",
    countySlug: county.slug,
    region: county.region,
    url: googleNewsFeed(`(${locationTerms}) (${terms}) ${excludedTerms}`),
  };
}

export function selectedFeeds(counties: TexasCounty[], topic?: TopicSlug) {
  if (counties.length) return counties.map((county) => countyFeed(county, topic));
  if (topic) return [topicFeed(topic)];
  return statewideFeeds;
}
