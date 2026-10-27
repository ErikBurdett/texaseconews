export const coverageTiers = ["county", "market", "nearby", "statewide"] as const;
export type CoverageTier = (typeof coverageTiers)[number];
export type CoverageMix = Partial<Record<CoverageTier, number>>;

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source?: string;
  sourceUrl?: string;
  publishedAt?: string;
  description?: string;
  imageUrl?: string;
  feedLabel?: string;
  countySlug?: string;
  region?: string;
  coverageTier?: CoverageTier;
  coverageLabel?: string;
  topics: string[];
};

export type FeedMeta = {
  count: number;
  /**
   * Items available in the complete feed before limit and offset, and whether
   * any remain past this page. Both are optional so an older API, and the
   * browser RSS fallback, still validate; absent means "this is everything".
   */
  total?: number;
  hasMore?: boolean;
  nextCursor?: string;
  history?: boolean;
  retryable?: boolean;
  windowStart?: string;
  windowEnd?: string;
  sourcesUsed: string[];
  fetchedAt: string;
  cacheTtlSeconds: number;
  stale: boolean;
  partialFailures: number;
  coverageMix?: CoverageMix;
};

export type FeedResponse = {
  items: NewsItem[];
  meta: FeedMeta;
};

export type HomePageResponse = {
  county: FeedResponse | null;
  statewide: FeedResponse;
  meta: {
    fetchedAt: string;
  };
};

export type HomePageQuery = {
  counties: readonly string[];
  regions: readonly string[];
  topics: readonly string[];
  limit: number;
  /** Items to skip, so a reader scrolling past the first page gets the next. */
  offset?: number;
  countyCursor?: string;
  statewideCursor?: string;
};

type RequestOptions = {
  signal?: AbortSignal;
  forceRefresh?: boolean;
};

export type CountySourceDirectory = {
  countySlug: string;
  sources: Array<{
    id: string;
    name: string;
    websiteUrl: string;
    kind: "newsroom" | "official" | "registered";
    coverage: "county" | "statewide";
  }>;
};

export async function fetchCountySources(countySlug: string, signal: AbortSignal): Promise<CountySourceDirectory> {
  const base = new URL(resolveApiUrl());
  base.search = "";
  base.hash = "";
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const response = await fetch(new URL(`v1/sources/counties/${encodeURIComponent(countySlug)}`, base), { signal });
  if (!response.ok) throw new NewsApiError("The source directory is temporarily unavailable.");
  const value: unknown = await response.json();
  if (!isRecord(value) || value.countySlug !== countySlug || !Array.isArray(value.sources) || !value.sources.every((source) =>
    isRecord(source) && isString(source.id) && isString(source.name) && isString(source.websiteUrl) &&
    /^https?:\/\//u.test(source.websiteUrl) && ["newsroom", "official", "registered"].includes(String(source.kind)) &&
    ["county", "statewide"].includes(String(source.coverage)))) {
    throw new NewsApiError("The source directory returned an invalid response.");
  }
  return value as CountySourceDirectory;
}

const localApiUrl = "http://localhost:8787";

export class NewsApiError extends Error {
  constructor(
    message: string,
    readonly fallbackEligible = false,
  ) {
    super(message);
    this.name = "NewsApiError";
  }
}

export async function fetchHomePage(query: HomePageQuery, options: RequestOptions = {}): Promise<HomePageResponse> {
  try {
    return await fetchHomePageFromApi(query, options);
  } catch (error) {
    if (options.signal?.aborted || isAbortError(error)) throw error;
    if (error instanceof NewsApiError && !error.fallbackEligible) throw error;
    if (!rssFallbackEnabled()) throw error;

    try {
      const { fetchRssFallbackPage } = await import("./rss-fallback");
      return await fetchRssFallbackPage(query, options);
    } catch (fallbackError) {
      if (options.signal?.aborted || isAbortError(fallbackError)) throw fallbackError;
      throw new NewsApiError("News API and RSS fallback providers are unavailable.");
    }
  }
}

function rssFallbackEnabled() {
  const configured = import.meta.env.VITE_ENABLE_RSS_FALLBACK?.trim().toLowerCase();
  if (configured) return configured === "true";
  return import.meta.env.DEV;
}

const recentPages = new Map<string, { savedAt: number; page: HomePageResponse }>();

async function fetchHomePageFromApi(query: HomePageQuery, options: RequestOptions) {
  const url = buildHomePageUrl(query);
  const key = url.toString();
  const recent = recentPages.get(key);
  if (!options.forceRefresh && recent && Date.now() - recent.savedAt < 120_000) return recent.page;
  const response = await fetch(url, {
    ...(options.forceRefresh ? { cache: "reload" as const } : {}),
    headers: {
      Accept: "application/json",
    },
    signal: options.signal,
  });

  if (!response.ok) {
    const fallbackEligible =
      response.status >= 500 ||
      [401, 403, 408, 429].includes(response.status);
    throw new NewsApiError(await responseErrorMessage(response), fallbackEligible);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new NewsApiError("News API returned invalid JSON.", true);
  }

  if (!isHomePageResponse(payload)) {
    throw new NewsApiError("News API returned an invalid home page response.", true);
  }

  if (payload.statewide.items.length || payload.county?.items.length || !payload.statewide.meta.partialFailures) {
    recentPages.delete(key);
    while (recentPages.size >= 30) recentPages.delete(recentPages.keys().next().value!);
    recentPages.set(key, { savedAt: Date.now(), page: payload });
  }
  return payload;
}

async function responseErrorMessage(response: Response) {
  const fallback = `News API request failed with status ${response.status}.`;
  try {
    const payload = (await response.json()) as unknown;
    if (!isRecord(payload) || !isRecord(payload.error)) return fallback;
    const message = payload.error.message;
    return isString(message) && message.trim() ? message.trim() : fallback;
  } catch {
    return fallback;
  }
}

export function buildHomePageUrl(query: HomePageQuery) {
  if (!Number.isInteger(query.limit) || query.limit < 1) {
    throw new NewsApiError("News API query limit must be a positive integer.");
  }
  const offset = query.offset ?? 0;
  if (!Number.isInteger(offset) || offset < 0) {
    throw new NewsApiError("News API query offset must be a non-negative integer.");
  }

  const baseUrl = new URL(resolveApiUrl());
  baseUrl.search = "";
  baseUrl.hash = "";
  if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";

  const url = new URL("v1/pages/home", baseUrl);
  url.search = new URLSearchParams({
    counties: query.counties.join(","),
    regions: query.regions.join(","),
    topics: query.topics.join(","),
    limit: String(query.limit),
    offset: String(offset),
    ...(query.countyCursor ? { countyCursor: query.countyCursor } : {}),
    ...(query.statewideCursor ? { statewideCursor: query.statewideCursor } : {}),
  }).toString();
  return url;
}

function resolveApiUrl() {
  const configuredUrl = import.meta.env.VITE_NEWS_API_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported protocol");
      return url.toString();
    } catch {
      throw new NewsApiError(
        "VITE_NEWS_API_URL must be a valid HTTP or HTTPS URL.",
        true,
      );
    }
  }

  if (import.meta.env.DEV) return localApiUrl;

  throw new NewsApiError(
    "News API is not configured. Set VITE_NEWS_API_URL for this production build.",
    true,
  );
}

function isHomePageResponse(value: unknown): value is HomePageResponse {
  if (!isRecord(value)) return false;
  return (
    (value.county === null || isFeedResponse(value.county)) &&
    isFeedResponse(value.statewide) &&
    isRecord(value.meta) &&
    isIsoDateString(value.meta.fetchedAt)
  );
}

function isFeedResponse(value: unknown): value is FeedResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isNewsItem) || !isRecord(value.meta)) return false;

  const meta = value.meta;
  return (
    isNonNegativeInteger(meta.count) &&
    Array.isArray(meta.sourcesUsed) &&
    meta.sourcesUsed.every(isString) &&
    isIsoDateString(meta.fetchedAt) &&
    isNonNegativeInteger(meta.cacheTtlSeconds) &&
    typeof meta.stale === "boolean" &&
    isNonNegativeInteger(meta.partialFailures) &&
    (meta.total === undefined || isNonNegativeInteger(meta.total)) &&
    (meta.hasMore === undefined || typeof meta.hasMore === "boolean") &&
    (meta.nextCursor === undefined || (typeof meta.nextCursor === "string" && /^[A-Za-z0-9_-]{1,1024}$/u.test(meta.nextCursor))) &&
    (meta.history === undefined || typeof meta.history === "boolean") &&
    (meta.retryable === undefined || typeof meta.retryable === "boolean") &&
    (meta.coverageMix === undefined || isCoverageMix(meta.coverageMix))
  );
}

function isNewsItem(value: unknown): value is NewsItem {
  if (!isRecord(value)) return false;
  const validFields = (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.link) &&
    Array.isArray(value.topics) &&
    value.topics.every(isString) &&
    isOptionalString(value.source) &&
    isOptionalString(value.sourceUrl) &&
    isOptionalString(value.publishedAt) &&
    isOptionalString(value.description) &&
    isOptionalString(value.imageUrl) &&
    isOptionalString(value.feedLabel) &&
    isOptionalString(value.countySlug) &&
    isOptionalString(value.region) &&
    isOptionalCoverageTier(value.coverageTier) &&
    isOptionalString(value.coverageLabel)
  );
  if (!validFields || value.coverageTier === undefined) return validFields;
  if (value.coverageTier === "county") {
    return isString(value.countySlug) && Boolean(value.countySlug.trim());
  }
  if (value.countySlug !== undefined) return false;
  if (value.coverageTier === "market" || value.coverageTier === "nearby") {
    return Boolean(
      (isString(value.coverageLabel) && value.coverageLabel.trim()) ||
      (isString(value.feedLabel) && value.feedLabel.trim()),
    );
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

function isOptionalCoverageTier(value: unknown): value is CoverageTier | undefined {
  return value === undefined ||
    (isString(value) && coverageTiers.some((tier) => tier === value));
}

function isCoverageMix(value: unknown): value is CoverageMix {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([tier, count]) =>
    coverageTiers.some((candidate) => candidate === tier) &&
    isNonNegativeInteger(count)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isIsoDateString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isAbortError(value: unknown) {
  return value instanceof DOMException && value.name === "AbortError";
}
