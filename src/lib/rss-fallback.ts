import { getCountyBySlug, type TexasCounty } from "../data/counties";
import {
  marketCountyFeeds,
  nearbyCountyFeeds,
  primaryCountyFeeds,
  statewideFallbackFeeds,
  type FeedDefinition,
} from "../data/feeds";
import { isRegionSlug, type RegionSlug } from "../data/regions";
import { isTopicSlug, type TopicSlug } from "../data/topics";
import type {
  CoverageMix,
  FeedResponse,
  HomePageQuery,
  HomePageResponse,
  NewsItem,
} from "./news-api";

type FallbackOptions = {
  signal?: AbortSignal;
};

type FallbackNewsItem = NewsItem;

type FallbackFeedResult = {
  items: FallbackNewsItem[];
  stale: boolean;
};

type FallbackBatchResult = {
  items: FallbackNewsItem[];
  stale: boolean;
  partialFailures: number;
  successfulFeeds: number;
};

type Rss2JsonResponse = {
  status?: "ok" | "error";
  feed?: { title?: string; link?: string };
  items?: Array<{
    title?: string;
    link?: string;
    guid?: string;
    pubDate?: string;
    author?: string;
    description?: string;
    content?: string;
    thumbnail?: string;
    enclosure?: { link?: string; type?: string; thumbnail?: string };
    source?: string | { title?: string; url?: string };
  }>;
};

const defaultProviderUrl = "https://api.rss2json.com/v1/api.json";
const defaultRawProxyUrl = "https://api.allorigins.win/raw";
const cacheTtlMs = 45 * 60 * 1000;
const requestTimeoutMs = 10_000;
const maxConcurrentProxyRequests = 6;
const articleMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const expansionArticleMaxAgeMs = 60 * 24 * 60 * 60 * 1000;
const futureSkewMs = 60 * 60 * 1000;
const countyExpansionThreshold = 12;
const sourceFirstPassLimit = 3;

const positiveKeywords = [
  "growth",
  "jobs",
  "hiring",
  "investment",
  "expansion",
  "opens",
  "launches",
  "startup",
  "small business",
  "manufacturing",
  "data center",
  "artificial intelligence",
  "ai",
  "semiconductor",
  "energy",
  "workforce",
  "training",
  "opportunity",
  "tourism",
  "infrastructure",
  "development",
  "headquarters",
  "innovation",
  "robotics",
  "technology",
  "sports",
  "finance",
  "stock exchange",
  "space",
  "spacex",
  "blue origin",
  "firefly",
  "real estate",
  "ranching",
  "cattle",
  "higher education",
  "university",
  "college",
  "medical",
  "hospital",
  "hunting",
  "state park",
] as const;

const blockedKeywords = [
  "death",
  "dead",
  "killed",
  "murder",
  "shooting",
  "violence",
  "drug",
  "drugs",
  "fentanyl",
  "arrest",
  "crash",
  "fatal",
  "crime",
  "lawsuit",
  "scandal",
  "prison",
  "sentenced",
  "indicted",
  "abuse",
  "assault",
  "layoff",
  "layoffs",
  "laid off",
  "job loss",
  "job losses",
  "job cuts",
  "bankruptcy",
  "employment slips",
  "employment falls",
  "employment declines",
] as const;

const blockedPatterns = [
  /\b(?:cutting|cuts?|eliminating|eliminates?|losing|loses?|lost)\s+(?:\d+\s+)*jobs?\b/i,
  /\b(?:plant|facility|business|stores?)\b.{0,48}\b(?:closing|closes?|closure|shutdown|shuts?\s+down)\b/i,
  /\b(?:closing|closes?|closure|shutdown|shuts?\s+down)\b.{0,48}\b(?:plant|facility|business|stores?)\b/i,
  /\b(?:ai|automation|robots?)\b.{0,48}\b(?:taking|replacing|threatening|threatens?)\s+jobs?\b/i,
  /\b(?:fail|fails|failed|failing)\s+compliance\b/i,
] as const;

const explicitTexasSignals = ["Texas", "Texan", "TX"] as const;
const otherStateNames = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
] as const;

export async function fetchRssFallbackPage(
  query: HomePageQuery,
  options: FallbackOptions = {},
): Promise<HomePageResponse> {
  const counties = query.counties
    .map(getCountyBySlug)
    .filter((county): county is TexasCounty => Boolean(county));
  const topics = query.topics.filter(isTopicSlug) as TopicSlug[];
  const regions = query.regions.filter(isRegionSlug) as RegionSlug[];
  const statewideFeeds = statewideFallbackFeeds(topics, regions);

  const [countyResult, statewideResult] = await Promise.allSettled([
    counties.length
      ? loadCountyFallbackSection(counties, query.limit, topics, options.signal)
      : Promise.resolve<FeedResponse | null>(null),
    loadFallbackSection(statewideFeeds, query.limit, topics, options.signal),
  ]);

  if (options.signal?.aborted) throw abortError();
  if (
    statewideResult.status === "rejected" &&
    (!counties.length || countyResult.status === "rejected")
  ) {
    throw new Error("News API and RSS fallback providers are unavailable.");
  }

  return {
    county:
      countyResult.status === "fulfilled"
        ? countyResult.value
        : emptyFallbackFeed(1),
    statewide:
      statewideResult.status === "fulfilled"
        ? statewideResult.value
        : emptyFallbackFeed(1),
    meta: { fetchedAt: new Date().toISOString() },
  };
}

async function loadFallbackSection(
  feeds: FeedDefinition[],
  limit: number,
  topics: TopicSlug[],
  signal?: AbortSignal,
): Promise<FeedResponse> {
  const batch = await loadFeedBatch(feeds, topics, signal);
  if (!batch.successfulFeeds) {
    throw new Error("RSS fallback providers are unavailable.");
  }
  return fallbackFeedResponse(batch, limit);
}

async function loadCountyFallbackSection(
  counties: TexasCounty[],
  limit: number,
  topics: TopicSlug[],
  signal?: AbortSignal,
): Promise<FeedResponse> {
  const results = await Promise.allSettled(
    counties.map((county) => loadCountyCoverage(county, topics, signal)),
  );
  if (signal?.aborted) throw abortError();

  const successful = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (!successful.length) {
    throw new Error("RSS fallback providers are unavailable.");
  }

  return fallbackFeedResponse({
    items: successful.flatMap((result) => result.items),
    stale: successful.some((result) => result.stale),
    partialFailures:
      successful.reduce((total, result) => total + result.partialFailures, 0) +
      (results.length - successful.length),
    successfulFeeds: successful.reduce(
      (total, result) => total + result.successfulFeeds,
      0,
    ),
  }, limit);
}

async function loadCountyCoverage(
  county: TexasCounty,
  topics: TopicSlug[],
  signal?: AbortSignal,
): Promise<FallbackBatchResult> {
  const batches: FallbackBatchResult[] = [];
  const primary = await loadFeedBatch(primaryCountyFeeds(county, topics), topics, signal);
  batches.push(primary);

  let inventory = prepareItems(primary.items);
  if (inventory.length < countyExpansionThreshold) {
    const [market, nearby] = await Promise.all([
      loadFeedBatch(marketCountyFeeds(county, topics), topics, signal),
      loadFeedBatch(nearbyCountyFeeds(county, topics), topics, signal),
    ]);
    batches.push(market, nearby);
    inventory = prepareItems([
      ...inventory,
      ...market.items,
      ...nearby.items,
    ]);
  }

  const successfulFeeds = batches.reduce(
    (total, batch) => total + batch.successfulFeeds,
    0,
  );
  if (!successfulFeeds) {
    throw new Error(`RSS fallback providers are unavailable for ${county.displayName}.`);
  }

  return {
    items: inventory,
    stale: batches.some((batch) => batch.stale),
    partialFailures: batches.reduce(
      (total, batch) => total + batch.partialFailures,
      0,
    ),
    successfulFeeds,
  };
}

async function loadFeedBatch(
  feeds: FeedDefinition[],
  topics: TopicSlug[],
  signal?: AbortSignal,
): Promise<FallbackBatchResult> {
  const results = await Promise.allSettled(
    feeds.map(async (feed) => ({
      feed,
      result: await fetchFallbackFeed(feed, signal),
    })),
  );
  if (signal?.aborted) throw abortError();

  const successful = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  return {
    items: successful.flatMap(({ feed, result }) =>
      result.items.filter((item) => isEligibleFallbackItem(item, topics, feed))
    ),
    stale: successful.some(({ result }) => result.stale),
    partialFailures: results.length - successful.length,
    successfulFeeds: successful.length,
  };
}

function fallbackFeedResponse(
  batch: FallbackBatchResult,
  limit: number,
): FeedResponse {
  const items = prepareItems(batch.items)
    .slice(0, Math.max(1, limit))
    .map(rightsSafeItem);
  return {
    items,
    meta: {
      count: items.length,
      sourcesUsed: ["rss-proxy-fallback"],
      fetchedAt: new Date().toISOString(),
      cacheTtlSeconds: Math.floor(cacheTtlMs / 1000),
      stale: batch.stale,
      partialFailures: batch.partialFailures,
      coverageMix: coverageMix(items),
    },
  };
}

async function fetchFallbackFeed(
  feed: FeedDefinition,
  signal?: AbortSignal,
): Promise<FallbackFeedResult> {
  if (!isHttpUrl(feed.url)) {
    throw new Error(`RSS fallback URL is unsafe for ${feed.id}.`);
  }
  const cached = readCache(feed);
  if (cached && Date.now() - cached.fetchedAt < cacheTtlMs) {
    return { items: cached.items, stale: false };
  }

  const loaders = isGoogleNewsUrl(feed.url)
    ? [fetchRawRss, fetchRss2Json]
    : [fetchRss2Json, fetchRawRss];

  for (const load of loaders) {
    try {
      const items = await load(feed, signal);
      writeCache(feed, items.map(rightsSafeItem));
      return { items, stale: false };
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  if (cached) return { items: cached.items, stale: true };
  throw new Error(`RSS fallback failed for ${feed.id}.`);
}

async function fetchRss2Json(feed: FeedDefinition, signal?: AbortSignal) {
  const url = safeProxyUrl(
    import.meta.env.VITE_RSS_PROVIDER_URL,
    defaultProviderUrl,
  );
  url.searchParams.set("rss_url", feed.url);
  const response = await fetchWithTimeout(url, signal, feed.scope === "county");
  if (!response.ok) throw new Error("RSS2JSON fallback failed.");
  const payload = (await response.json()) as Rss2JsonResponse;
  if (payload.status && payload.status !== "ok") {
    throw new Error("RSS2JSON fallback returned an error.");
  }

  return (payload.items || []).flatMap((item, index): FallbackNewsItem[] => {
    const rawDescription = item.description || item.content || "";
    const title = plainText(item.title || "Untitled Texas business update");
    const plainDescription = plainText(rawDescription).slice(0, 220);
    const link = articleLink(item.link || payload.feed?.link || "#", rawDescription);
    if (!isHttpUrl(link)) return [];
    const sourceUrl = sourceUrlFromRss2JsonItem(item);
    return [{
      id: item.guid || item.link || `${feed.id}-${index}`,
      title,
      link,
      ...(sourceNameFromRss2JsonItem(item) || payload.feed?.title
        ? { source: sourceNameFromRss2JsonItem(item) || payload.feed?.title }
        : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(item.pubDate ? { publishedAt: item.pubDate } : {}),
      ...(plainDescription ? { description: plainDescription } : {}),
      imageUrl: safeImageUrl(
        item.thumbnail,
        item.enclosure?.thumbnail,
        item.enclosure?.type?.startsWith("image/") ? item.enclosure.link : undefined,
      ) || fallbackImage(feed.label),
      feedLabel: feed.label,
      coverageTier: feed.coverageTier,
      ...(feed.coverageLabel ? { coverageLabel: feed.coverageLabel } : {}),
      ...(feed.coverageTier === "county" && feed.countySlug
        ? { countySlug: feed.countySlug }
        : {}),
      ...(feed.region ? { region: feed.region } : {}),
      topics: extractTopics(`${title} ${plainDescription}`),
    }];
  });
}

async function fetchRawRss(feed: FeedDefinition, signal?: AbortSignal) {
  const url = safeProxyUrl(
    import.meta.env.VITE_RSS_RAW_PROXY_URL,
    defaultRawProxyUrl,
  );
  url.searchParams.set("url", feed.url);
  const response = await fetchWithTimeout(url, signal, feed.scope === "county");
  if (!response.ok) throw new Error("Raw RSS fallback failed.");
  const xml = await response.text();
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new Error("Raw RSS fallback returned unsupported XML declarations.");
  }
  const documentNode = new DOMParser().parseFromString(xml, "text/xml");
  if (documentNode.querySelector("parsererror")) {
    throw new Error("Raw RSS fallback returned malformed XML.");
  }

  return Array.from(documentNode.querySelectorAll("item, entry")).flatMap(
    (item, index): FallbackNewsItem[] => {
      const rawDescription =
        tag(item, "description") ||
        tag(item, "summary") ||
        tag(item, "content");
      const plainDescription = plainText(rawDescription).slice(0, 220);
      const title = plainText(
        tag(item, "title") || "Untitled Texas business update",
      );
      const rawLink = tag(item, "link") || tagAttribute(item, "link", "href");
      const link = articleLink(rawLink || "#", rawDescription);
      if (!isHttpUrl(link)) return [];
      const sourceUrl = tagAttribute(item, "source", "url");
      const publishedAt =
        tag(item, "pubDate") ||
        tag(item, "published") ||
        tag(item, "updated");
      return [{
        id: tag(item, "guid") || tag(item, "id") || link || `${feed.id}-${index}`,
        title,
        link,
        ...(tag(item, "source") ? { source: tag(item, "source") } : {}),
        ...(isHttpUrl(sourceUrl) ? { sourceUrl } : {}),
        ...(publishedAt ? { publishedAt } : {}),
        ...(plainDescription ? { description: plainDescription } : {}),
        imageUrl: mediaImage(item) || fallbackImage(feed.label),
        feedLabel: feed.label,
        coverageTier: feed.coverageTier,
        ...(feed.coverageLabel ? { coverageLabel: feed.coverageLabel } : {}),
        ...(feed.coverageTier === "county" && feed.countySlug
          ? { countySlug: feed.countySlug }
          : {}),
        ...(feed.region ? { region: feed.region } : {}),
        topics: extractTopics(`${title} ${plainDescription}`),
      }];
    },
  );
}

function prepareItems(items: FallbackNewsItem[]) {
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped = [...items]
    .sort((left, right) =>
      coveragePriority(left) - coveragePriority(right) ||
      timestamp(right.publishedAt) - timestamp(left.publishedAt) ||
      left.id.localeCompare(right.id)
    )
    .filter((item) => {
      const link = canonicalUrl(item.link);
      const title = normalizeText(item.title);
      if ((link && seenLinks.has(link)) || seenTitles.has(title)) return false;
      if (link) seenLinks.add(link);
      seenTitles.add(title);
      return true;
    })
    .sort((left, right) =>
      timestamp(right.publishedAt) - timestamp(left.publishedAt) ||
      coveragePriority(left) - coveragePriority(right) ||
      left.id.localeCompare(right.id)
    );
  return diversifySources(deduped);
}

function coveragePriority(item: FallbackNewsItem) {
  if (item.coverageTier === "county") return 0;
  if (item.coverageTier === "market") return 1;
  if (item.coverageTier === "nearby") return 2;
  return 3;
}

function isEligibleFallbackItem(
  item: FallbackNewsItem,
  selectedTopics: TopicSlug[],
  feed: FeedDefinition,
) {
  const text = `${item.title} ${item.description || ""}`;
  const maxAgeMs =
    feed.coverageTier === "market" || feed.coverageTier === "nearby"
      ? expansionArticleMaxAgeMs
      : articleMaxAgeMs;
  if (!isHttpUrl(item.link) || !isRecent(item.publishedAt, maxAgeMs) || !containsAnyTerm(text, positiveKeywords)) return false;
  if (containsAnyTerm(text, blockedKeywords)) return false;
  const normalized = normalizeText(text);
  if (blockedPatterns.some((pattern) => pattern.test(normalized))) return false;
  if (
    selectedTopics.length &&
    !selectedTopics.some((topic) => item.topics.includes(topic))
  ) return false;
  if (!containsAnyTerm(text, feed.locationTerms)) return false;
  if (feed.coverageTier === "market" || feed.coverageTier === "nearby") {
    if (
      feed.coverageTier === "nearby" &&
      !containsAnyTerm(text, explicitTexasSignals)
    ) return false;
    const mentionsOtherState = containsAnyTerm(text, otherStateNames);
    if (
      mentionsOtherState &&
      !containsAnyTerm(text, explicitTexasSignals)
    ) return false;
  }
  return true;
}

function diversifySources(items: FallbackNewsItem[]) {
  const sourceCounts = new Map<string, number>();
  const firstPass: FallbackNewsItem[] = [];
  const deferred: FallbackNewsItem[] = [];

  for (const item of items) {
    const source = normalizedSource(item);
    const count = sourceCounts.get(source) || 0;
    if (count < sourceFirstPassLimit) {
      firstPass.push(item);
      sourceCounts.set(source, count + 1);
    } else {
      deferred.push(item);
    }
  }

  return [...firstPass, ...deferred];
}

function normalizedSource(item: FallbackNewsItem) {
  const source =
    item.source ||
    hostname(item.sourceUrl) ||
    hostname(item.link) ||
    item.feedLabel ||
    "unknown source";
  return normalizeText(source).replace(/^www /, "") || "unknown source";
}

function hostname(value?: string) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function coverageMix(items: FallbackNewsItem[]) {
  return items.reduce<CoverageMix>((mix, item) => {
    if (item.coverageTier) {
      mix[item.coverageTier] = (mix[item.coverageTier] || 0) + 1;
    }
    return mix;
  }, {});
}

function isRecent(value: string | undefined, maxAgeMs: number) {
  const publishedAt = timestamp(value);
  if (!publishedAt) return false;
  const now = Date.now();
  return publishedAt >= now - maxAgeMs && publishedAt <= now + futureSkewMs;
}

function containsAnyTerm(value: string, terms: readonly string[]) {
  const normalized = ` ${normalizeText(value)} `;
  return terms.some((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm && normalized.includes(` ${normalizedTerm} `);
  });
}

function extractTopics(value: string) {
  const text = ` ${normalizeText(value)} `;
  const topics: string[] = [];
  if (text.includes(" data center ") || text.includes(" ai ") || text.includes(" artificial intelligence ")) topics.push("ai", "data-centers");
  if (text.includes(" technology ") || text.includes(" software ") || text.includes(" digital infrastructure ")) topics.push("technology");
  if (text.includes(" job ") || text.includes(" jobs ") || text.includes(" hiring ") || text.includes(" workforce ")) topics.push("jobs");
  if (text.includes(" manufactur") || text.includes(" semiconductor ")) topics.push("manufacturing");
  if ([" energy ", " power ", " oil ", " gas ", " wind ", " solar ", " nuclear "].some((term) => text.includes(term))) topics.push("energy");
  if (text.includes(" startup ") || text.includes(" small business ")) topics.push("small-business");
  if ([" finance ", " bank ", " fintech ", " private equity ", " stock exchange "].some((term) => text.includes(term))) topics.push("finance");
  if (text.includes(" texas stock exchange ") || text.includes(" txse ") || text.includes(" yall street ")) topics.push("tx-stock-exchange");
  if (text.includes(" aerospace ") || text.includes(" aviation ") || text.includes(" space industry ")) topics.push("aerospace");
  if (text.includes(" space ") || text.includes(" spacex ") || text.includes(" blue origin ") || text.includes(" firefly ")) topics.push("space");
  if ([" infrastructure ", " construction ", " port ", " logistics "].some((term) => text.includes(term))) topics.push("infrastructure");
  if (text.includes(" chip ") || text.includes(" chips ") || text.includes(" fab ")) topics.push("semiconductors");
  if (text.includes(" robot")) topics.push("robotics");
  if (text.includes(" film ") || text.includes(" movie ") || text.includes(" studio ")) topics.push("film");
  if (text.includes(" sports ") || text.includes(" stadium ") || text.includes(" training facility ")) topics.push("sports-business");
  if (text.includes(" theme park ") || text.includes(" attraction")) topics.push("theme-parks");
  if (text.includes(" defense ") || text.includes(" military ")) topics.push("defense");
  if (text.includes(" real estate ") || text.includes(" development ") || text.includes(" multifamily ") || text.includes(" mixed use ")) topics.push("real-estate");
  if (text.includes(" ranching ") || text.includes(" ranch ") || text.includes(" ranch land ")) topics.push("ranching");
  if (text.includes(" cattle ") || text.includes(" beef ") || text.includes(" livestock ")) topics.push("cattle");
  if (text.includes(" higher education ") || text.includes(" university ") || text.includes(" college ")) topics.push("higher-education");
  if (text.includes(" hospital ") || text.includes(" medical ") || text.includes(" medicine ") || text.includes(" health system ")) topics.push("medicine", "medical");
  if (text.includes(" agriculture ") || text.includes(" farming ") || text.includes(" ranching ") || text.includes(" cattle ")) topics.push("agriculture");
  if (text.includes(" hunting ") || text.includes(" outfitter ") || text.includes(" wildlife ")) topics.push("hunting");
  if (text.includes(" tourism ") || text.includes(" travel ") || text.includes(" hospitality ") || text.includes(" visitor economy ")) topics.push("tourism");
  if (text.includes(" state park ") || text.includes(" texas state parks ") || text.includes(" tpwd ")) topics.push("state-parks");
  return [...new Set(topics)].filter(isTopicSlug);
}

function articleLink(link: string, html: string) {
  return firstExternalPublisherLink(html) || link;
}

function firstExternalPublisherLink(html: string) {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  return Array.from(documentNode.querySelectorAll("a"))
    .map((anchor) => anchor.href)
    .find((href) => isHttpUrl(href) && !isGoogleNewsUrl(href)) || "";
}

function sourceNameFromRss2JsonItem(item: NonNullable<Rss2JsonResponse["items"]>[number]) {
  if (typeof item.source === "string") return item.source;
  return item.source?.title || item.author;
}

function sourceUrlFromRss2JsonItem(item: NonNullable<Rss2JsonResponse["items"]>[number]) {
  if (typeof item.source === "object" && isHttpUrl(item.source?.url || "")) {
    return item.source.url;
  }
  return item.author && isHttpUrl(item.author) ? item.author : "";
}

function mediaImage(item: Element) {
  const candidate =
    item.getElementsByTagName("media:content")[0]?.getAttribute("url") ||
    item.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") ||
    item.getElementsByTagName("enclosure")[0]?.getAttribute("url") ||
    "";
  return isHttpUrl(candidate) ? candidate : "";
}

function tag(item: Element, name: string) {
  return item.getElementsByTagName(name)[0]?.textContent?.trim() || "";
}

function tagAttribute(item: Element, name: string, attribute: string) {
  return item.getElementsByTagName(name)[0]?.getAttribute(attribute)?.trim() || "";
}

function stripHtml(value: string) {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function plainText(value: string) {
  return stripHtml(decodeHtml(value));
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return "";
  }
}

function isGoogleNewsUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "news.google.com" || hostname.endsWith(".news.google.com");
  } catch {
    return false;
  }
}

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function safeProxyUrl(configuredUrl: string | undefined, fallbackUrl: string) {
  const url = new URL(configuredUrl?.trim() || fallbackUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("RSS fallback proxy URL must use HTTP or HTTPS.");
  }
  return url;
}

function safeImageUrl(...values: Array<string | undefined>) {
  return values.find((value) =>
    Boolean(
      value &&
      (isHttpUrl(value) || /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)),
    ),
  );
}

async function fetchWithTimeout(
  url: URL,
  parentSignal?: AbortSignal,
  prioritize = false,
) {
  await acquireProxySlot(prioritize);
  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (parentSignal?.aborted) throw abortError();
    throw error;
  } finally {
    window.clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
    releaseProxySlot();
  }
}

let activeProxyRequests = 0;
const proxyWaiters: Array<() => void> = [];

async function acquireProxySlot(prioritize: boolean) {
  if (activeProxyRequests < maxConcurrentProxyRequests) {
    activeProxyRequests += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    if (prioritize) proxyWaiters.unshift(resolve);
    else proxyWaiters.push(resolve);
  });
}

function releaseProxySlot() {
  const next = proxyWaiters.shift();
  if (next) next();
  else activeProxyRequests = Math.max(0, activeProxyRequests - 1);
}

function timestamp(value?: string) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function fallbackImage(label: string) {
  return `https://placehold.co/720x460/07111f/e9f8ef?text=${encodeURIComponent(label.slice(0, 28))}`;
}

type CachedFeed = { fetchedAt: number; items: FallbackNewsItem[] };

function cacheKey(feed: FeedDefinition) {
  const value = [
    feed.scope,
    feed.coverageTier,
    feed.id,
    feed.url,
    feed.countySlug || "",
    feed.region || "",
  ].join("|");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `texaseconews:rss-fallback:v3:${hash.toString(16)}`;
}

function readCache(feed: FeedDefinition): CachedFeed | undefined {
  try {
    const key = cacheKey(feed);
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedFeed;
    if (typeof parsed.fetchedAt !== "number" || !Array.isArray(parsed.items)) return undefined;
    if (Date.now() - parsed.fetchedAt >= cacheTtlMs) {
      window.localStorage.removeItem(key);
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function writeCache(feed: FeedDefinition, items: FallbackNewsItem[]) {
  try {
    window.localStorage.setItem(
      cacheKey(feed),
      JSON.stringify({ fetchedAt: Date.now(), items }),
    );
  } catch {
    // Strict storage policies may block fallback caching.
  }
}

function rightsSafeItem(item: FallbackNewsItem): FallbackNewsItem {
  const safeItem = { ...item };
  delete safeItem.description;
  delete safeItem.imageUrl;
  return safeItem;
}

function emptyFallbackFeed(partialFailures: number): FeedResponse {
  return {
    items: [],
    meta: {
      count: 0,
      sourcesUsed: ["rss-proxy-fallback"],
      fetchedAt: new Date().toISOString(),
      cacheTtlSeconds: Math.floor(cacheTtlMs / 1000),
      stale: false,
      partialFailures,
      coverageMix: {},
    },
  };
}

function abortError() {
  return new DOMException("The request was aborted.", "AbortError");
}
