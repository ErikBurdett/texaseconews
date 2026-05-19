import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import { AdSlot } from "./components/AdSlot";
import { countySearchText, getCountyBySlug, normalizeCountySearch, texasCounties, type TexasCounty } from "./data/counties";
import { selectedFeeds, type FeedDefinition } from "./data/feeds";
import { getTopicBySlug, isTopicSlug, topicCatalog, topicSlugs, type TopicSlug } from "./data/topics";
import { fetchNewsFeeds, type NewsItem } from "./lib/rss";

const mission =
  "Howdy. Texas EcoNews gathers positive economic news and opportunity signals from across the Lone Star State so citizens, builders, employers, investors, visitors, and future Texans can see where momentum is forming. We focus on growth, jobs, small business, innovation, data centers, AI advancement, infrastructure, workforce pathways, and local wins that help people make the most of opportunity close to home.";

const curatedStorageKey = "texaseconews:selected-counties";
const pageSize = 12;

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/counties" element={<CountyDirectoryPage />} />
      <Route path="/mission" element={<MissionPage />} />
      <Route path="/advertise" element={<AdvertisePage />} />
      <Route path="/topic/:topicSlug" element={<TopicPage />} />
      <Route path="/county/:countySlug" element={<CountyPage />} />
      <Route path="/county/:countySlug/topic/:topicSlug" element={<CountyTopicPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function HomePage({ initialCounty, topicSlug }: { initialCounty?: TexasCounty; topicSlug?: TopicSlug }) {
  const [selectedSlugs, setSelectedSlugs] = useStoredCountySelection();
  const selectedCounties = useMemo(() => selectedSlugs.map(getCountyBySlug).filter(Boolean) as TexasCounty[], [selectedSlugs]);
  const activeTopic = topicSlug ? topicCatalog[topicSlug] : undefined;
  const countyFeedRequests = useMemo(() => (selectedCounties.length ? selectedFeeds(selectedCounties, topicSlug) : []), [selectedCounties, topicSlug]);
  const statewideFeedRequests = useMemo(() => selectedFeeds([], topicSlug), [topicSlug]);
  const countyNews = useNews(countyFeedRequests);
  const statewideNews = useNews(statewideFeedRequests);
  const [visibleCountyCount, setVisibleCountyCount] = useState(pageSize);
  const [visibleStatewideCount, setVisibleStatewideCount] = useState(pageSize);
  const topics = useMemo(
    () => [...new Set([...(topicSlug ? [topicSlug] : []), ...countyNews.items.flatMap((item) => item.topics), ...statewideNews.items.flatMap((item) => item.topics)])],
    [countyNews.items, statewideNews.items, topicSlug],
  );
  const scopeLabel = selectedCounties.length ? selectedCounties.map((county) => county.name).join(", ") : "Texas statewide";
  const feedTitle = `${scopeLabel} ${activeTopic ? activeTopic.label.toLowerCase() : "economic momentum"}`;
  const isLoading = countyNews.loading || statewideNews.loading;
  const hasError = countyNews.error || statewideNews.error;

  usePageTitle(activeTopic ? `${activeTopic.label} News` : "Positive Texas Economic News");
  useInfiniteScroll(() => {
    if (selectedCounties.length && visibleCountyCount < countyNews.items.length) {
      setVisibleCountyCount((current) => Math.min(current + pageSize, countyNews.items.length));
      return;
    }
    setVisibleStatewideCount((current) => Math.min(current + pageSize, statewideNews.items.length));
  }, (selectedCounties.length && visibleCountyCount < countyNews.items.length) || visibleStatewideCount < statewideNews.items.length);

  useEffect(() => {
    setVisibleCountyCount(pageSize);
    setVisibleStatewideCount(pageSize);
  }, [selectedSlugs, topicSlug]);

  useEffect(() => {
    if (initialCounty) setSelectedSlugs([initialCounty.slug]);
  }, [initialCounty, setSelectedSlugs]);

  return (
    <Shell>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{activeTopic ? "Lone Star topic radar" : "Texas growth signal"}</p>
          <h1>{activeTopic ? `${activeTopic.label} news across Texas.` : "Good news from every corner of Texas."}</h1>
          <p>{activeTopic ? activeTopic.description : mission}</p>
          <div className="hero-stats">
            <span><strong>{texasCounties.length}</strong> counties</span>
            <span><strong>{selectedCounties.length || "All"}</strong> feed scope</span>
            <span><strong>{activeTopic ? activeTopic.label : "Bright"}</strong> growth filter</span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="orb" />
          <h2>{activeTopic ? `Track ${activeTopic.label.toLowerCase()} by county` : "Build your Texas opportunity radar"}</h2>
          <p>Pick one county, several counties, or stay statewide. We check each local story for real Texas place signals before it lands in your feed.</p>
          <AdSlot slot="hero" limit={1} />
        </div>
      </section>

      <section className="workspace">
        <aside className="control-rail">
          <FeedControls selectedSlugs={selectedSlugs} activeTopic={topicSlug} onChange={setSelectedSlugs} />
          <AdSlot slot="sidebar" topics={topics} limit={2} />
        </aside>

        <main className="feed-column">
          <div className="feed-toolbar">
            <div>
              <p className="eyebrow">Live feed</p>
              <h2>{feedTitle}</h2>
            </div>
            <button className="button ghost" onClick={() => { countyNews.refresh(); statewideNews.refresh(); }} type="button">Refresh</button>
          </div>

          {isLoading ? <StatusCard title="Rounding up Texas growth stories" body="Loading positive economic stories from the selected Texas feeds." /> : null}
          {hasError ? <StatusCard title="Feed provider unavailable" body="Showing cached results when available. Try refreshing in a few minutes." /> : null}
          {!isLoading && selectedCounties.length > 0 && !countyNews.items.length ? <StatusCard title="No county-specific growth stories yet" body="The strict county filter did not find matching local stories. Statewide Texas articles are still listed below." /> : null}

          {selectedCounties.length ? (
            <FeedSection
              emptyBody="Try another county, city, or topic while the local filters refresh."
              emptyTitle="No county-specific growth stories yet"
              items={countyNews.items}
              title={`${selectedCounties.length > 1 ? "Selected counties" : selectedCounties[0].displayName} articles`}
              visibleCount={visibleCountyCount}
              onLoadMore={() => setVisibleCountyCount((current) => Math.min(current + pageSize, countyNews.items.length))}
            />
          ) : null}

          <FeedSection
            emptyBody="Try refreshing or clearing topic filters while the statewide feed updates."
            emptyTitle="No Texas statewide growth stories yet"
            items={statewideNews.items}
            title={selectedCounties.length ? "Texas statewide articles" : "Texas statewide articles"}
            visibleCount={visibleStatewideCount}
            onLoadMore={() => setVisibleStatewideCount((current) => Math.min(current + pageSize, statewideNews.items.length))}
          />
        </main>
      </section>
    </Shell>
  );
}

function CountyPage() {
  const { countySlug } = useParams();
  const county = getCountyBySlug(countySlug);

  if (!county) return <NotFoundPage title="County not found" body="That county URL does not match a Texas county in the directory." />;
  return <HomePage initialCounty={county} />;
}

function TopicPage() {
  const { topicSlug } = useParams();
  const topic = getTopicBySlug(topicSlug);

  if (!topic || !topicSlug) return <NotFoundPage title="Topic not found" body="That topic is not available in the Texas EcoNews feed." />;
  return <HomePage topicSlug={topicSlug as TopicSlug} />;
}

function CountyTopicPage() {
  const { countySlug, topicSlug } = useParams();
  const county = getCountyBySlug(countySlug);
  const topic = getTopicBySlug(topicSlug);

  if (!county) return <NotFoundPage title="County not found" body="That county URL does not match a Texas county in the directory." />;
  if (!topic || !topicSlug) return <NotFoundPage title="Topic not found" body="That topic is not available in the Texas EcoNews feed." />;
  return <HomePage initialCounty={county} topicSlug={topicSlug as TopicSlug} />;
}

function CountyDirectoryPage() {
  const [query, setQuery] = useState("");
  const searchTerms = searchTokens(query);
  const filtered = texasCounties.filter((county) => countyMatchesSearch(county, searchTerms));
  const countiesByRegion = useMemo(
    () => filtered.reduce<Record<string, TexasCounty[]>>((groups, county) => {
      groups[county.region] = [...(groups[county.region] || []), county];
      return groups;
    }, {}),
    [filtered],
  );

  usePageTitle("County Directory");

  return (
    <Shell>
      <section className="page-hero">
        <p className="eyebrow">County directory</p>
        <h1>Find good economic news by Texas county.</h1>
        <p>Open a county feed, then narrow by topic for shareable local growth pages with strict Texas place checks.</p>
        <input className="search-input directory-search" placeholder="Search counties, cities, metros, or regions..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </section>
      <section className="directory-grid">
        {Object.entries(countiesByRegion).map(([region, counties]) => (
          <article className="directory-section" key={region}>
            <h2>{region}</h2>
            <div className="county-link-grid">
              {counties.map((county) => (
                <Link className="county-link-card" key={county.fips} to={`/county/${county.slug}`}>
                  <strong>{county.displayName}</strong>
                  <span>{county.metro || county.region}</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </Shell>
  );
}

function MissionPage() {
  usePageTitle("Mission");

  return (
    <Shell>
      <section className="page-hero">
        <p className="eyebrow">Mission</p>
        <h1>Helping Texans spot useful economic opportunity.</h1>
        <p>{mission}</p>
      </section>
      <section className="mission-grid">
        <InfoCard title="Gather" body="We monitor statewide and local public feeds for growth stories that point to new jobs, investment, innovation, training, infrastructure, tourism, and small business activity." />
        <InfoCard title="Filter" body="We steer clear of crime, tragedy, drugs, violence, and outrage cycles so the product stays focused on constructive Texas signal." />
        <InfoCard title="Guide" body="We make it easier for Texans, visitors, founders, workers, and families to see where doors are opening across the state." />
      </section>
    </Shell>
  );
}

function AdvertisePage() {
  usePageTitle("Advertise");

  return (
    <Shell>
      <section className="page-hero">
        <p className="eyebrow">Dynamic ads</p>
        <h1>Reach Texans looking for what is growing.</h1>
        <p>Sponsor statewide, regional, county-specific, or topic-specific placements across Texas EcoNews. Every placement sits beside constructive opportunity signals, not outrage cycles.</p>
      </section>
      <section className="feature-grid">
        <InfoCard title="County Spotlights" body="Own a county or corridor placement for economic development, hiring, launches, tourism, and infrastructure audiences across Texas." />
        <InfoCard title="Topic Targeting" body="Align campaigns to AI, data centers, jobs, manufacturing, energy, or small business stories as the feed updates." />
        <InfoCard title="Clean Measurement" body="Impression and click events are pushed to dataLayer with campaign, slot, county, and region metadata." />
      </section>
      <section className="advertise-panel">
        <div>
          <p className="eyebrow">Launch packages</p>
          <h2>Built for sponsors with a Texas growth story.</h2>
          <p>Use hero, sidebar, inline feed, and footer placements to reach readers while they are actively exploring where Texas is moving next.</p>
        </div>
        <div className="package-list">
          <InfoCard title="Statewide Launch Partner" body="Broad Texas visibility across hero and footer placements." />
          <InfoCard title="Regional Growth Partner" body="Target metros, regions, or county clusters where your work is creating opportunity." />
          <InfoCard title="Topic Partner" body="Sponsor focused areas such as AI infrastructure, jobs, energy, or small business expansion." />
        </div>
      </section>
      <AdSlot slot="footer" limit={3} />
    </Shell>
  );
}

function NotFoundPage({ title = "Page not found", body = "The page you requested does not exist yet. Try the live feed or county directory." }: { title?: string; body?: string }) {
  usePageTitle(title);

  return (
    <Shell>
      <section className="page-hero not-found">
        <p className="eyebrow">404</p>
        <h1>{title}</h1>
        <p>{body}</p>
        <div className="hero-actions">
          <Link className="button" to="/">Back to feed</Link>
          <Link className="button ghost" to="/counties">Browse counties</Link>
        </div>
      </section>
    </Shell>
  );
}

function FeedControls({ selectedSlugs, activeTopic, onChange }: { selectedSlugs: string[]; activeTopic?: TopicSlug; onChange: (slugs: string[]) => void }) {
  const [query, setQuery] = useState("");
  const selected = new Set(selectedSlugs);
  const searchTerms = searchTokens(query);
  const filtered = texasCounties.filter((county) => countyMatchesSearch(county, searchTerms));
  const selectedCounties = selectedSlugs.map(getCountyBySlug).filter(Boolean) as TexasCounty[];

  function toggleCounty(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onChange([...next]);
  }

  function applyMatchingCounties() {
    const next = new Set(selectedSlugs);
    if (query.trim()) filtered.forEach((county) => next.add(county.slug));
    onChange([...next]);
  }

  return (
    <section className="controls-card">
      <div className="controls-heading">
        <p className="eyebrow">Pick your Texas</p>
        <h2>County radar</h2>
      </div>
      <form className="search-row" onSubmit={(event) => { event.preventDefault(); applyMatchingCounties(); }}>
        <input className="search-input" placeholder="Search counties, cities, metros, or regions. Try: Potter, Randall" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="button search-button" type="submit">Search</button>
      </form>
      <div className="quick-actions">
        <button type="button" onClick={() => onChange([])}>Texas feed</button>
        <button type="button" onClick={() => onChange(["dallas", "tarrant", "collin", "denton"])}>DFW</button>
        <button type="button" onClick={() => onChange(["travis", "williamson", "hays"])}>Austin corridor</button>
        <button type="button" onClick={() => onChange(["harris", "fort-bend", "montgomery", "galveston"])}>Houston</button>
      </div>
      {selectedCounties.length ? (
        <div className="selected-counties" aria-label="Selected counties">
          {selectedCounties.map((county) => (
            <button key={county.slug} type="button" onClick={() => toggleCounty(county.slug)}>
              {county.name} x
            </button>
          ))}
        </div>
      ) : null}
      <div className="topic-links">
        <Link className={!activeTopic ? "topic-chip selected" : "topic-chip"} to="/">All growth</Link>
        {topicSlugs.map((slug) => (
          <Link className={activeTopic === slug ? "topic-chip selected" : "topic-chip"} key={slug} to={topicPath(slug, selectedCounties.length === 1 ? selectedCounties[0] : undefined)}>
            {topicCatalog[slug].label}
          </Link>
        ))}
      </div>
      <p className="picker-count">{filtered.length} of {texasCounties.length} Texas counties shown. Search accepts multiple counties or cities separated by commas.</p>
      <div className="county-picker">
        {filtered.map((county) => (
          <label className={selected.has(county.slug) ? "county-pill selected" : "county-pill"} key={county.fips}>
            <input checked={selected.has(county.slug)} onChange={() => toggleCounty(county.slug)} type="checkbox" />
            <span>{county.name}</span>
            <small>{county.metro || county.region}</small>
          </label>
        ))}
      </div>
      <button className="button apply-filters" onClick={applyMatchingCounties} type="button">
        {query.trim() ? `Apply ${filtered.length} matching filters` : "Apply filters"}
      </button>
    </section>
  );
}

function searchTokens(query: string) {
  return query
    .split(/,|;|\n|\band\b/i)
    .map((token) => normalizeCountySearch(token))
    .filter(Boolean);
}

function countyMatchesSearch(county: TexasCounty, terms: string[]) {
  if (!terms.length) return true;
  const text = normalizeCountySearch(countySearchText(county));
  return terms.some((term) => text.includes(term));
}

function topicPath(topicSlug: TopicSlug, county?: TexasCounty) {
  return county ? `/county/${county.slug}/topic/${topicSlug}` : `/topic/${topicSlug}`;
}

function FeedSection({ title, items, visibleCount, emptyTitle, emptyBody, onLoadMore }: { title: string; items: NewsItem[]; visibleCount: number; emptyTitle: string; emptyBody: string; onLoadMore: () => void }) {
  const visibleItems = items.slice(0, visibleCount);

  return (
    <section className="feed-section">
      <div className="section-heading">
        <p className="eyebrow">{items.length} stories</p>
        <h2>{title}</h2>
      </div>
      {!visibleItems.length ? <StatusCard title={emptyTitle} body={emptyBody} /> : null}
      <div className="news-list">
        {visibleItems.map((item, index) => (
          <div key={item.id}>
            {index > 0 && index % 5 === 0 ? <AdSlot slot="feed-inline" topics={item.topics} county={getCountyBySlug(item.countySlug)} /> : null}
            <NewsCard item={item} />
          </div>
        ))}
      </div>
      {visibleCount < items.length ? <button className="button load-more" onClick={onLoadMore} type="button">Load more growth stories</button> : null}
    </section>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="news-card">
      <a className="news-image" href={item.link} rel="noopener noreferrer" target="_blank">
        <img src={item.imageUrl} alt="" loading="lazy" />
      </a>
      <div className="news-body">
        <div className="meta-row">
          <span>{item.feedLabel}</span>
          {item.publishedAt ? <time>{new Date(item.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time> : null}
        </div>
        <h3><a href={item.link} rel="noopener noreferrer" target="_blank">{item.title}</a></h3>
        {item.description ? <p>{item.description}</p> : null}
        <div className="tag-row">
          {(item.topics.length ? item.topics : ["growth"]).map((topic) => (
            isTopicSlug(topic) ? <Link key={topic} to={topicPath(topic, getCountyBySlug(item.countySlug))}>{topicCatalog[topic].label}</Link> : <span key={topic}>{topic.replace("-", " ")}</span>
          ))}
          {item.countySlug ? <Link to={`/county/${item.countySlug}`}>{getCountyBySlug(item.countySlug)?.name || "County"}</Link> : null}
          {item.source ? <span>{item.source}</span> : null}
        </div>
      </div>
    </article>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">TX</span>
          <span>Texas EcoNews</span>
        </Link>
        <nav>
          <NavLink to="/">Feed</NavLink>
          <NavLink to="/counties">Counties</NavLink>
          <NavLink to="/mission">Mission</NavLink>
          <NavLink to="/advertise">Advertise</NavLink>
        </nav>
      </header>
      <div className="site-tagline">A Centralized source for positive economic news in the state of Texas</div>
      {children}
      <footer className="footer">
        <div>
          <strong>Texas EcoNews</strong>
          <p>Positive economic signal for the Lone Star State.</p>
        </div>
        <AdSlot slot="footer" limit={1} />
      </footer>
    </>
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="status-card">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="info-card">
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}

function useNews(feeds: FeedDefinition[]) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    async () => {
      setLoading(true);
      setError(false);
      try {
        setItems(await fetchNewsFeeds(feeds));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [feeds],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refresh: load };
}

function useStoredCountySelection() {
  const [slugs, setSlugs] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(curatedStorageKey) || "[]") as string[];
      return parsed.filter((slug) => getCountyBySlug(slug));
    } catch {
      return [];
    }
  });

  const update = useCallback((next: string[]) => {
    setSlugs(next);
    window.localStorage.setItem(curatedStorageKey, JSON.stringify(next));
  }, []);

  return [slugs, update] as const;
}

function useInfiniteScroll(onNearEnd: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    function onScroll() {
      const remaining = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (remaining < 900) onNearEnd();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, onNearEnd]);
}

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Texas EcoNews`;
  }, [title]);
}

export default App;
