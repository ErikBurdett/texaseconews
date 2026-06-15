import { getCountyBySlug, isCountyRelevantText } from "../data/counties";
import { isTopicSlug } from "../data/topics";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source?: string;
  sourceUrl?: string;
  publishedAt?: string;
  description?: string;
  imageUrl?: string;
  feedLabel: string;
  countySlug?: string;
  region?: string;
  topics: string[];
};

export type FeedRequest = {
  url: string;
  label: string;
  countySlug?: string;
  region?: string;
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

const providerUrl = "https://api.rss2json.com/v1/api.json";
const rawProxyUrl = "https://api.allorigins.win/raw";
const cacheTtlMs = 45 * 60 * 1000;

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
  " ai ",
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
];

const blockedKeywords = [
  "death",
  "dead",
  "killed",
  "murder",
  "shooting",
  "violence",
  "drug",
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
];

export async function fetchNewsFeeds(feeds: FeedRequest[]) {
  const results = await Promise.allSettled(feeds.map(fetchFeed));
  const seen = new Set<string>();

  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => isPositiveEconomicItem(item))
    .filter((item) => isRelevantToCountyScope(item))
    .sort((first, second) => timestamp(second.publishedAt) - timestamp(first.publishedAt))
    .filter((item) => {
      const key = `${item.title.toLowerCase()}|${item.source || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function fetchFeed(feed: FeedRequest): Promise<NewsItem[]> {
  const cached = readCache(feed.url);
  if (cached && Date.now() - cached.fetchedAt < cacheTtlMs) return cached.items;

  if (isGoogleNewsUrl(feed.url)) {
    try {
      const items = await fetchRawRss(feed);
      writeCache(feed.url, items);
      return items;
    } catch {
      // Fall back to RSS2JSON when the raw proxy is unavailable.
    }
  }

  try {
    const items = await fetchRss2Json(feed);
    writeCache(feed.url, items);
    return items;
  } catch {
    if (cached) return cached.items;
    const items = await fetchRawRss(feed);
    writeCache(feed.url, items);
    return items;
  }
}

async function fetchRss2Json(feed: FeedRequest) {
  const url = new URL(import.meta.env.VITE_RSS_PROVIDER_URL || providerUrl);
  url.searchParams.set("rss_url", feed.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error("RSS provider failed.");
  const json = (await response.json()) as Rss2JsonResponse;
  if (json.status && json.status !== "ok") throw new Error("RSS provider returned an error.");

  return (json.items || []).map((item, index) => {
    const sourceUrl = sourceUrlFromRss2JsonItem(item);
    const rawDescription = item.description || item.content || "";

    return {
      id: item.guid || item.link || `${feed.label}-${index}`,
      title: decode(stripHtml(item.title || "Untitled growth update")),
      link: articleLink(item.link || json.feed?.link || "#", rawDescription, sourceUrl),
      source: sourceNameFromRss2JsonItem(item) || json.feed?.title,
      sourceUrl,
      publishedAt: item.pubDate,
      description: decode(stripHtml(rawDescription)).slice(0, 220),
      imageUrl: item.thumbnail || item.enclosure?.thumbnail || (item.enclosure?.type?.startsWith("image/") ? item.enclosure.link : "") || fallbackImage(feed.label),
      feedLabel: feed.label,
      countySlug: feed.countySlug,
      region: feed.region,
      topics: extractTopics(`${item.title || ""} ${rawDescription}`),
    };
  });
}

async function fetchRawRss(feed: FeedRequest) {
  const url = new URL(import.meta.env.VITE_RSS_RAW_PROXY_URL || rawProxyUrl);
  url.searchParams.set("url", feed.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Raw RSS proxy failed.");
  const xml = await response.text();

  return Array.from(new DOMParser().parseFromString(xml, "text/xml").querySelectorAll("item")).map((item, index) => {
    const description = tag(item, "description");
    const title = tag(item, "title") || "Untitled growth update";
    const sourceUrl = tagAttribute(item, "source", "url");
    return {
      id: tag(item, "guid") || tag(item, "link") || `${feed.label}-${index}`,
      title: decode(title),
      link: articleLink(tag(item, "link") || "#", description, sourceUrl),
      source: tag(item, "source"),
      sourceUrl,
      publishedAt: tag(item, "pubDate"),
      description: decode(stripHtml(description)).slice(0, 220),
      imageUrl: mediaImage(item) || fallbackImage(feed.label),
      feedLabel: feed.label,
      countySlug: feed.countySlug,
      region: feed.region,
      topics: extractTopics(`${title} ${description}`),
    };
  });
}

function isPositiveEconomicItem(item: NewsItem) {
  const text = `${item.title} ${item.description || ""}`.toLowerCase();
  return positiveKeywords.some((keyword) => text.includes(keyword)) && !blockedKeywords.some((keyword) => text.includes(keyword));
}

function isRelevantToCountyScope(item: NewsItem) {
  if (!item.countySlug) return true;
  const county = getCountyBySlug(item.countySlug);
  if (!county) return false;

  return isCountyRelevantText(county, `${item.title} ${item.description || ""} ${item.source || ""} ${item.link}`);
}

function extractTopics(value: string) {
  const text = ` ${value.toLowerCase()} `;
  const topics: string[] = [];
  if (text.includes("data center") || text.includes(" ai ") || text.includes("artificial intelligence")) topics.push("ai", "data-centers");
  if (text.includes("job") || text.includes("hiring") || text.includes("workforce")) topics.push("jobs");
  if (text.includes("manufactur") || text.includes("semiconductor")) topics.push("manufacturing");
  if (text.includes("energy") || text.includes("power") || text.includes("oil") || text.includes("gas") || text.includes("wind") || text.includes("solar") || text.includes("nuclear")) topics.push("energy");
  if (text.includes("startup") || text.includes("small business")) topics.push("small-business");
  if (text.includes("finance") || text.includes("bank") || text.includes("fintech") || text.includes("private equity") || text.includes("stock exchange")) topics.push("finance");
  if (text.includes("aerospace") || text.includes("aviation") || text.includes("space industry")) topics.push("aerospace");
  if (text.includes("infrastructure") || text.includes("construction") || text.includes("port") || text.includes("logistics")) topics.push("infrastructure");
  if (text.includes("chip") || text.includes("fab")) topics.push("semiconductors");
  if (text.includes("robot")) topics.push("robotics");
  if (text.includes("film") || text.includes("movie") || text.includes("studio")) topics.push("film");
  if (text.includes("sports") || text.includes("stadium") || text.includes("training facility")) topics.push("sports-business");
  if (text.includes("theme park") || text.includes("attraction")) topics.push("theme-parks");
  if (text.includes("defense") || text.includes("military")) topics.push("defense");
  if (text.includes("hospital") || text.includes("medical") || text.includes("medicine") || text.includes("health system")) topics.push("medicine");
  if (text.includes("agriculture") || text.includes("farming") || text.includes("ranching") || text.includes("cattle") || text.includes("hemp")) topics.push("agriculture");
  return [...new Set(topics)].filter(isTopicSlug);
}

function timestamp(value?: string) {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function tag(item: Element, name: string) {
  return item.getElementsByTagName(name)[0]?.textContent?.trim() || "";
}

function tagAttribute(item: Element, name: string, attribute: string) {
  return item.getElementsByTagName(name)[0]?.getAttribute(attribute)?.trim() || "";
}

function sourceNameFromRss2JsonItem(item: NonNullable<Rss2JsonResponse["items"]>[number]) {
  if (typeof item.source === "string") return item.source;
  return item.source?.title || item.author;
}

function sourceUrlFromRss2JsonItem(item: NonNullable<Rss2JsonResponse["items"]>[number]) {
  if (typeof item.source === "object" && item.source?.url) return item.source.url;
  if (item.author && isHttpUrl(item.author)) return item.author;
  return "";
}

function articleLink(link: string, html: string, sourceUrl?: string) {
  const directLink = firstExternalPublisherLink(html);
  if (directLink) return directLink;
  if (isGoogleNewsUrl(link) && sourceUrl) return sourceUrl;
  return link;
}

function firstExternalPublisherLink(html: string) {
  const container = document.createElement("template");
  container.innerHTML = html;
  const links = Array.from(container.content.querySelectorAll("a"))
    .map((anchor) => anchor.href)
    .filter((href) => isHttpUrl(href) && !isGoogleNewsUrl(href));

  return links[0] || "";
}

function isGoogleNewsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname === "news.google.com" || url.hostname.endsWith(".news.google.com");
  } catch {
    return false;
  }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function mediaImage(item: Element) {
  return (
    item.getElementsByTagName("media:content")[0]?.getAttribute("url") ||
    item.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") ||
    item.getElementsByTagName("enclosure")[0]?.getAttribute("url") ||
    ""
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decode(value: string) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function fallbackImage(label: string) {
  return `https://placehold.co/720x460/07111f/e9f8ef?text=${encodeURIComponent(label.slice(0, 28))}`;
}

type CachedFeed = { fetchedAt: number; items: NewsItem[] };

function cacheKey(feedUrl: string) {
  let hash = 0;
  for (let index = 0; index < feedUrl.length; index += 1) hash = (hash * 31 + feedUrl.charCodeAt(index)) >>> 0;
  return `texaseconews:rss:v2:${hash.toString(16)}`;
}

function readCache(feedUrl: string): CachedFeed | undefined {
  try {
    const raw = window.localStorage.getItem(cacheKey(feedUrl));
    return raw ? (JSON.parse(raw) as CachedFeed) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(feedUrl: string, items: NewsItem[]) {
  try {
    window.localStorage.setItem(cacheKey(feedUrl), JSON.stringify({ fetchedAt: Date.now(), items }));
  } catch {
    // Private browsing and strict storage settings can block localStorage.
  }
}
