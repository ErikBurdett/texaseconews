import emailjs from "@emailjs/browser";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import { AdSlot, SponsorBadge } from "./components/AdSlot";
import { countySearchText, getCountyBySlug, normalizeCountySearch, texasCounties, type TexasCounty } from "./data/counties";
import { getRegionBySlug, regionCatalog, regionSlugs, type RegionSlug } from "./data/regions";
import { featuredTopicSlugs, getTopicBySlug, heroTopicSlugs, isTopicSlug, topicCatalog, type TopicSlug } from "./data/topics";
import { fetchHomePage, type HomePageQuery, type HomePageResponse, type NewsItem } from "./lib/news-api";

const siteName = "TexasBusiness.News";
const mission =
  "Howdy. TexasBusiness.News gathers positive business news and opportunity signals from across the Lone Star State so citizens, builders, employers, investors, visitors, and future Texans can see where momentum is forming. We focus on growth, jobs, small business, innovation, data centers, AI advancement, infrastructure, workforce pathways, and local wins that help people make the most of opportunity close to home.";

const curatedStorageKey = "texasbusiness-news:selected-counties";
const pageSize = 12;
const pageApiLimit = pageSize * 5;
const maxCountyFilters = 4;
const maxRegionFilters = 4;
const maxTopicFilters = 4;
const maxFilterCombinations = 8;
const noNewsItems: NewsItem[] = [];
const fallbackNewsImage = "https://placehold.co/720x460/07111f/e9f8ef?text=TexasBusiness.News";

function App() {
  return (
    <>
      <TickerStack />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/counties" element={<CountyDirectoryPage />} />
        <Route path="/mission" element={<MissionPage />} />
        <Route path="/advertise" element={<AdvertisePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/topic/:topicSlug" element={<TopicPage />} />
        <Route path="/industry/:topicSlug" element={<TopicPage />} />
        <Route path="/region/:regionSlug" element={<RegionPage />} />
        <Route path="/region/:regionSlug/industry/:topicSlug" element={<RegionIndustryPage />} />
        <Route path="/county/:countySlug" element={<CountyPage />} />
        <Route path="/county/:countySlug/topic/:topicSlug" element={<CountyTopicPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function HomePage({ initialCounty, initialRegion, topicSlug }: { initialCounty?: TexasCounty; initialRegion?: RegionSlug; topicSlug?: TopicSlug }) {
  const [selectedSlugs, setSelectedSlugs] = useStoredCountySelection();
  const [selectedRegionSlugs, setSelectedRegionSlugs] = useState<RegionSlug[]>(() => (initialRegion ? [initialRegion] : []));
  const [selectedTopicSlugs, setSelectedTopicSlugs] = useState<TopicSlug[]>(() => (topicSlug ? [topicSlug] : []));
  const selectedCounties = useMemo(() => selectedSlugs.map(getCountyBySlug).filter(Boolean) as TexasCounty[], [selectedSlugs]);
  const selectedRegions = useMemo(() => selectedRegionSlugs.map((slug) => regionCatalog[slug]), [selectedRegionSlugs]);
  const selectedTopics = useMemo(() => selectedTopicSlugs.map((slug) => topicCatalog[slug]), [selectedTopicSlugs]);
  const pageNews = usePageNews({
    counties: selectedSlugs,
    regions: selectedRegionSlugs,
    topics: selectedTopicSlugs,
    limit: pageApiLimit,
  });
  const countyItems = pageNews.data?.county?.items ?? noNewsItems;
  const statewideItems = pageNews.data?.statewide.items ?? noNewsItems;
  const [visibleCountyCount, setVisibleCountyCount] = useState(pageSize);
  const [visibleStatewideCount, setVisibleStatewideCount] = useState(pageSize);
  const scopeLabel = selectedRegions.length ? selectedRegions.map(displayLabel).join(", ") : selectedCounties.length ? selectedCounties.map((county) => county.name).join(", ") : "Texas statewide";
  const industryLabel = selectedTopics.length ? selectedTopics.map(displayLabel).join(", ") : "";
  const feedTitle = `${scopeLabel} ${industryLabel ? industryLabel.toLowerCase() : "business momentum"}`;
  const countySectionTitle = selectedCounties.length > 1
    ? "Selected counties and nearby market articles"
    : `${selectedCounties[0]?.displayName || "County"} and nearby market articles`;
  const isLoading = pageNews.loading;
  const hasError = Boolean(pageNews.error);

  usePageTitle(selectedTopicSlugs.length || selectedRegionSlugs.length ? `${scopeLabel} ${industryLabel || "News"}` : "Positive Texas Business News");
  useInfiniteScroll(() => {
    if (selectedCounties.length && visibleCountyCount < countyItems.length) {
      setVisibleCountyCount((current) => Math.min(current + pageSize, countyItems.length));
      return;
    }
    setVisibleStatewideCount((current) => Math.min(current + pageSize, statewideItems.length));
  }, (selectedCounties.length && visibleCountyCount < countyItems.length) || visibleStatewideCount < statewideItems.length);

  useEffect(() => {
    setVisibleCountyCount(pageSize);
    setVisibleStatewideCount(pageSize);
  }, [selectedRegionSlugs, selectedSlugs, selectedTopicSlugs]);

  useEffect(() => {
    if (initialCounty) setSelectedSlugs([initialCounty.slug]);
    else if (initialRegion) setSelectedSlugs([]);
  }, [initialCounty, initialRegion, setSelectedSlugs]);

  useEffect(() => {
    setSelectedRegionSlugs(initialRegion ? [initialRegion] : []);
  }, [initialRegion]);

  useEffect(() => {
    setSelectedTopicSlugs(topicSlug ? [topicSlug] : []);
  }, [topicSlug]);

  return (
    <Shell>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{selectedTopicSlugs.length || selectedRegionSlugs.length ? "Texas business radar" : "Texas growth signal"}</p>
          <h1>{selectedTopicSlugs.length === 1 ? `${selectedTopics[0].label} news across Texas.` : selectedRegionSlugs.length === 1 ? `${selectedRegions[0].label} growth news.` : "Good news from every corner of Texas."}</h1>
          <p>{selectedTopicSlugs.length === 1 ? selectedTopics[0].description : selectedRegionSlugs.length === 1 ? selectedRegions[0].description : mission}</p>
          <div className="hero-chip-group" aria-label="Texas business categories">
            {heroTopicSlugs.map((slug) => (
              <button
                aria-label={`Toggle ${topicCatalog[slug].label} hero category`}
                className={selectedTopicSlugs.includes(slug) ? "selected" : ""}
                disabled={!selectedTopicSlugs.includes(slug) && Boolean(filterSelectionIssue(selectedSlugs.length, selectedRegionSlugs.length, selectedTopicSlugs.length + 1))}
                key={slug}
                onClick={() => toggleListValue(selectedTopicSlugs, slug, setSelectedTopicSlugs)}
                type="button"
              >
                {displayLabel(topicCatalog[slug])}
              </button>
            ))}
          </div>
          <div className="hero-stats">
            <span><strong>{texasCounties.length}</strong> counties</span>
            <span><strong>{selectedRegions.length || selectedCounties.length || "All"}</strong> feed scope</span>
            <span><strong>{selectedTopics.length || "Bright"}</strong> growth filter</span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="orb" />
          <h2>{selectedTopics.length === 1 ? `Track ${selectedTopics[0].label.toLowerCase()} by region and county` : "Track Texas growth by region and industry"}</h2>
          <p>Search by county, metro, or corridor, then narrow the feed by the industries driving Texas business: energy, finance, infrastructure, chips, sports, medicine, agriculture, and more.</p>
          <AdSlot slot="hero" limit={1} />
        </div>
      </section>

      <section className="workspace">
        <div className="filter-stack">
          <FeedControls
            selectedRegionSlugs={selectedRegionSlugs}
            selectedSlugs={selectedSlugs}
            selectedTopicSlugs={selectedTopicSlugs}
            onCountyChange={setSelectedSlugs}
            onRegionChange={setSelectedRegionSlugs}
            onTopicChange={setSelectedTopicSlugs}
          />
        </div>
        <main className="feed-column">
          <div className="feed-toolbar">
            <div>
              <p className="eyebrow">Live feed</p>
              <h2>{feedTitle}</h2>
            </div>
            <button className="button ghost" onClick={pageNews.refresh} type="button">Refresh</button>
          </div>

          {isLoading ? <StatusCard loading title="Throwin' A Lasso 'Round The Latest..." body="please wait up to 1 minute for data" /> : null}
          {hasError ? <StatusCard title="News API unavailable" body={pageNews.error || "Showing the last available results. Try refreshing in a few minutes."} /> : null}
          {!isLoading && selectedCounties.length > 0 && !countyItems.length ? <StatusCard title="No local or nearby growth stories yet" body="The county, nearby-market, and nearby-county checks did not find matching stories. Statewide Texas articles are still listed below." /> : null}

          {selectedCounties.length ? (
            <FeedSection
              emptyBody="Try another county, city, or topic while the local and nearby filters refresh."
              emptyTitle="No local or nearby growth stories yet"
              items={countyItems}
              title={countySectionTitle}
              visibleCount={visibleCountyCount}
              onFetchMore={pageNews.refresh}
              onLoadMore={() => setVisibleCountyCount((current) => Math.min(current + pageSize, countyItems.length))}
            />
          ) : null}

          <FeedSection
            emptyBody="Try refreshing or clearing topic filters while the statewide feed updates."
            emptyTitle="No Texas statewide growth stories yet"
            items={statewideItems}
            title={selectedCounties.length ? "Texas statewide articles" : "Texas statewide articles"}
            visibleCount={visibleStatewideCount}
            onFetchMore={pageNews.refresh}
            onLoadMore={() => setVisibleStatewideCount((current) => Math.min(current + pageSize, statewideItems.length))}
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

  if (!topic || !topicSlug) return <NotFoundPage title="Topic not found" body={`That topic is not available in the ${siteName} feed.`} />;
  return <HomePage topicSlug={topicSlug as TopicSlug} />;
}

function RegionPage() {
  const { regionSlug } = useParams();
  const region = getRegionBySlug(regionSlug);

  if (!region || !regionSlug) return <NotFoundPage title="Region not found" body={`That region URL does not match an available ${siteName} region.`} />;
  return <HomePage initialRegion={regionSlug as RegionSlug} />;
}

function RegionIndustryPage() {
  const { regionSlug, topicSlug } = useParams();
  const region = getRegionBySlug(regionSlug);
  const topic = getTopicBySlug(topicSlug);

  if (!region || !regionSlug) return <NotFoundPage title="Region not found" body={`That region URL does not match an available ${siteName} region.`} />;
  if (!topic || !topicSlug) return <NotFoundPage title="Industry not found" body={`That industry is not available in the ${siteName} feed.`} />;
  return <HomePage initialRegion={regionSlug as RegionSlug} topicSlug={topicSlug as TopicSlug} />;
}

function CountyTopicPage() {
  const { countySlug, topicSlug } = useParams();
  const county = getCountyBySlug(countySlug);
  const topic = getTopicBySlug(topicSlug);

  if (!county) return <NotFoundPage title="County not found" body="That county URL does not match a Texas county in the directory." />;
  if (!topic || !topicSlug) return <NotFoundPage title="Topic not found" body={`That topic is not available in the ${siteName} feed.`} />;
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
        <h1>Find good business news by Texas county.</h1>
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
        <h1>Helping Texans spot useful business opportunity.</h1>
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
        <p>Sponsor statewide, regional, county-specific, or topic-specific placements across {siteName}. Every placement sits beside constructive opportunity signals, not outrage cycles.</p>
      </section>
      <section className="feature-grid">
        <InfoCard title="County Spotlights" body="Own a county or corridor placement for business development, hiring, launches, tourism, and infrastructure audiences across Texas." />
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

function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  usePageTitle("Contact");

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setStatus("error");
      setStatusMessage("Contact form is not configured yet. Please email admin@texasbusiness.news.");
      return;
    }

    setStatus("submitting");
    setStatusMessage("");

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: "admin@texasbusiness.news",
          from_name: name,
          reply_to: email,
          message,
        },
        { publicKey },
      );
      form.reset();
      setStatus("success");
      setStatusMessage("Message sent. We will review it at admin@texasbusiness.news.");
    } catch {
      setStatus("error");
      setStatusMessage("Message failed to send. Please email admin@texasbusiness.news.");
    }
  }

  return (
    <Shell>
      <section className="page-hero legal-page">
        <p className="eyebrow">Contact</p>
        <h1>Reach TexasBusiness.News.</h1>
        <p>Use the contact form for sponsor questions, source suggestions, corrections, privacy requests, or general site feedback. You can also email <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>.</p>
      </section>
      <section className="contact-panel">
        <form className="contact-form" onSubmit={handleContactSubmit}>
          <label>
            <span>Name</span>
            <input name="name" placeholder="Your name" required type="text" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label>
            <span>Message</span>
            <textarea name="message" placeholder="How can we help?" required rows={6} />
          </label>
          <button className="button" disabled={status === "submitting"} type="submit">
            {status === "submitting" ? "Sending..." : "Send to admin@texasbusiness.news"}
          </button>
          {statusMessage ? <p className={`form-status ${status}`}>{statusMessage}</p> : null}
        </form>
        <InfoCard title="Contact Policy" body="TexasBusiness.News does not list phone numbers or street addresses on the site. Contact forms and admin@texasbusiness.news are the official contact paths." />
      </section>
    </Shell>
  );
}

function TermsPage() {
  usePageTitle("Terms of Service");

  return (
    <Shell>
      <section className="page-hero legal-page">
        <p className="eyebrow">Terms of service</p>
        <h1>Terms for using {siteName}.</h1>
        <p>{siteName} is provided for general informational and business-discovery purposes only. By using the site, you agree to use it responsibly and understand that third-party feeds, sponsor placements, market widgets, and publisher links may change or become unavailable.</p>
      </section>
      <section className="legal-grid">
        <InfoCard title="No Professional Advice" body="Content on this site does not provide legal, investment, medical, tax, insurance, or other professional advice. Always verify information with original publishers and qualified professionals before making decisions." />
        <InfoCard title="Third-Party Sources" body="News items, market data, crypto widgets, sponsor destinations, and external publisher pages are operated by third parties. We are not responsible for their availability, accuracy, practices, or content." />
        <InfoCard title="Permitted Use" body="You may browse and share public links from this site. Do not misuse the service, interfere with its operation, scrape it abusively, or present sponsor or publisher content as your own." />
      </section>
    </Shell>
  );
}

function PrivacyPage() {
  usePageTitle("Privacy Statement");

  return (
    <Shell>
      <section className="page-hero legal-page">
        <p className="eyebrow">Privacy statement</p>
        <h1>Privacy-first by design.</h1>
        <p>{siteName} is designed as a lightweight experience that avoids account creation and avoids collecting sensitive personal information. We use minimal browser-side preferences and link to third-party sources that may have their own privacy practices.</p>
      </section>
      <section className="legal-grid">
        <InfoCard title="Local Preferences" body="County, region, and industry filters are kept only for the current page session. Opening the home page starts with statewide Texas stories and no default county." />
        <InfoCard title="Sponsor Measurement" body="Sponsor impressions and clicks may be measured as anonymous interaction events. We do not use those events to create account profiles because this site does not currently have accounts." />
        <InfoCard title="Third-Party Widgets" body="Market widgets, crypto widgets, news sources, sponsors, and linked publishers may receive technical information when their content loads or when you click through to them. Review their privacy terms for details." />
        <InfoCard title="Privacy Contact" body="Use the contact form or admin@texasbusiness.news for privacy questions and requests. No street address or phone contact is listed for this site." />
      </section>
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

function FeedControls({
  selectedRegionSlugs,
  selectedSlugs,
  selectedTopicSlugs,
  onCountyChange,
  onRegionChange,
  onTopicChange,
}: {
  selectedRegionSlugs: RegionSlug[];
  selectedSlugs: string[];
  selectedTopicSlugs: TopicSlug[];
  onCountyChange: (slugs: string[]) => void;
  onRegionChange: (slugs: RegionSlug[]) => void;
  onTopicChange: (slugs: TopicSlug[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [filterError, setFilterError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [countyListOpen, setCountyListOpen] = useState(false);
  const filterToggleRef = useRef<HTMLButtonElement | null>(null);
  const selected = new Set(selectedSlugs);
  const searchTerms = searchTokens(query);
  const filtered = texasCounties.filter((county) => countyMatchesSearch(county, searchTerms));
  const selectedCounties = selectedSlugs.map(getCountyBySlug).filter(Boolean) as TexasCounty[];
  const activeFilterCount = selectedSlugs.length + selectedRegionSlugs.length + selectedTopicSlugs.length;

  function toggleCounty(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    const nextSlugs = [...next];
    if (!acceptFilterSelection(nextSlugs, selectedRegionSlugs, selectedTopicSlugs)) return;
    onCountyChange(nextSlugs);
  }

  function applyMatchingCounties() {
    const next = new Set(selectedSlugs);
    if (query.trim()) filtered.forEach((county) => next.add(county.slug));
    const nextSlugs = [...next];
    if (!acceptFilterSelection(nextSlugs, selectedRegionSlugs, selectedTopicSlugs)) return;
    onCountyChange(nextSlugs);
  }

  function toggleRegion(regionSlug: RegionSlug) {
    const next = toggledList(selectedRegionSlugs, regionSlug);
    if (!acceptFilterSelection(selectedSlugs, next, selectedTopicSlugs)) return;
    onRegionChange(next);
  }

  function toggleTopic(topicSlug: TopicSlug) {
    const next = toggledList(selectedTopicSlugs, topicSlug);
    if (!acceptFilterSelection(selectedSlugs, selectedRegionSlugs, next)) return;
    onTopicChange(next);
  }

  function acceptFilterSelection(counties: string[], regions: RegionSlug[], topics: TopicSlug[]) {
    const issue = filterSelectionIssue(counties.length, regions.length, topics.length);
    setFilterError(issue);
    return !issue;
  }

  function resetFeed() {
    setFilterError("");
    onCountyChange([]);
    onRegionChange([]);
    onTopicChange([]);
  }

  return (
    <section
      className="controls-card"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        setCountyListOpen(false);
        setFiltersOpen(false);
        filterToggleRef.current?.focus();
      }}
    >
      <div className="controls-heading-row">
        <div className="controls-heading">
          <p className="eyebrow">Search and filter news</p>
          <h2>Build your Texas feed</h2>
          <p>Select regions, counties, and industries to shape a focused Texas business feed.</p>
        </div>
        <SponsorBadge />
      </div>
      <form className="search-row" onSubmit={(event) => { event.preventDefault(); applyMatchingCounties(); }}>
        <input className="search-input" placeholder="Search county, city, metro, or region. Try: Frisco or Potter, Randall" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="button search-button" type="submit">Add matches</button>
      </form>

      {activeFilterCount ? (
        <div className="active-filter-summary">
          <span className="filter-label">{activeFilterCount} active</span>
          {selectedCounties.length ? (
            <div className="selected-counties" aria-label="Selected counties">
              {selectedCounties.map((county) => (
                <button aria-label={`Remove ${county.name} County`} key={county.slug} type="button" onClick={() => toggleCounty(county.slug)}>
                  {county.name} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}
          {selectedRegionSlugs.length || selectedTopicSlugs.length ? (
            <div className="selected-counties" aria-label="Selected region and industry filters">
              {selectedRegionSlugs.map((regionSlug) => (
                <button aria-label={`Remove ${regionCatalog[regionSlug].label} region`} key={regionSlug} type="button" onClick={() => toggleRegion(regionSlug)}>
                  {regionCatalog[regionSlug].label} <span aria-hidden="true">×</span>
                </button>
              ))}
              {selectedTopicSlugs.map((slug) => (
                <button aria-label={`Remove ${topicCatalog[slug].label} industry`} key={slug} type="button" onClick={() => toggleTopic(slug)}>
                  {topicCatalog[slug].label} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        aria-controls="feed-filter-panel"
        aria-expanded={filtersOpen}
        className="filter-toggle"
        onClick={() => setFiltersOpen((current) => !current)}
        ref={filterToggleRef}
        type="button"
      >
        <span>{filtersOpen ? "Hide filters" : "Show regions, industries & counties"}</span>
        <small>{activeFilterCount ? `${activeFilterCount} active` : "Optional"}</small>
      </button>

      <div className={filtersOpen ? "filter-panel open" : "filter-panel"} id="feed-filter-panel">
        <div className="filter-block">
          <span className="filter-label">Regions</span>
          <div className="quick-actions">
            <button className={!selectedRegionSlugs.length && !selectedSlugs.length && !selectedTopicSlugs.length ? "selected" : ""} onClick={resetFeed} type="button">Texas feed</button>
            {regionSlugs.map((regionSlug) => (
              <button
                className={selectedRegionSlugs.includes(regionSlug) ? "selected" : ""}
                disabled={!selectedRegionSlugs.includes(regionSlug) && Boolean(filterSelectionIssue(selectedSlugs.length, selectedRegionSlugs.length + 1, selectedTopicSlugs.length))}
                key={regionSlug}
                onClick={() => toggleRegion(regionSlug)}
                type="button"
              >
                {displayLabel(regionCatalog[regionSlug])}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-block">
          <span className="filter-label">Industries</span>
          <div className="topic-links">
            <button className={!selectedTopicSlugs.length ? "topic-chip selected" : "topic-chip"} onClick={() => { setFilterError(""); onTopicChange([]); }} type="button">All growth</button>
            {featuredTopicSlugs.map((slug) => (
              <button
                className={selectedTopicSlugs.includes(slug) ? "topic-chip selected" : "topic-chip"}
                disabled={!selectedTopicSlugs.includes(slug) && Boolean(filterSelectionIssue(selectedSlugs.length, selectedRegionSlugs.length, selectedTopicSlugs.length + 1))}
                key={slug}
                onClick={() => toggleTopic(slug)}
                type="button"
              >
                {displayLabel(topicCatalog[slug])}
              </button>
            ))}
          </div>
        </div>
        <div className="quick-actions suggested-searches">
          <span className="filter-label">Suggested searches</span>
          <button type="button" onClick={() => setQuery("Frisco")}>Frisco</button>
          <button type="button" onClick={() => setQuery("Permian Basin")}>Permian Basin</button>
          <button type="button" onClick={() => setQuery("Potter, Randall")}>Potter, Randall</button>
          <button type="button" onClick={() => setQuery("San Antonio")}>San Antonio</button>
        </div>
        <p className="picker-count" role="status">
          {filterError || `Choose up to ${maxCountyFilters} counties, ${maxRegionFilters} regions, and ${maxTopicFilters} industries within the ${maxFilterCombinations}-combination feed budget.`}
        </p>
        <button
          aria-controls="county-filter-panel"
          aria-expanded={countyListOpen}
          className="county-toggle"
          onClick={() => setCountyListOpen((current) => !current)}
          type="button"
        >
          <span>{countyListOpen ? "Hide county directory" : "Browse all Texas counties"}</span>
          <small>{filtered.length} matching</small>
        </button>
        <div className={countyListOpen ? "county-browser open" : "county-browser"} id="county-filter-panel">
          <p className="picker-count">{filtered.length} of {texasCounties.length} Texas counties shown. Search accepts counties, cities, metros, regions, and comma-separated lists.</p>
          <div className="county-picker">
            {filtered.map((county) => (
              <label className={selected.has(county.slug) ? "county-pill selected" : "county-pill"} key={county.fips}>
                <input
                  checked={selected.has(county.slug)}
                  disabled={!selected.has(county.slug) && Boolean(filterSelectionIssue(selectedSlugs.length + 1, selectedRegionSlugs.length, selectedTopicSlugs.length))}
                  onChange={() => toggleCounty(county.slug)}
                  type="checkbox"
                />
                <span>{county.name}</span>
                <small>{county.metro || county.region}</small>
              </label>
            ))}
          </div>
          <button className="button apply-filters" onClick={applyMatchingCounties} type="button">
            {query.trim() ? `Apply ${filtered.length} matching filters` : "Apply filters"}
          </button>
        </div>
      </div>
    </section>
  );
}

function searchTokens(query: string) {
  return query
    .split(/,|;|\n|\band\b/i)
    .map((token) => normalizeCountySearch(token))
    .filter(Boolean);
}

function toggleListValue<T>(values: T[], value: T, onChange: (next: T[]) => void) {
  onChange(toggledList(values, value));
}

function toggledList<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function filterSelectionIssue(countyCount: number, regionCount: number, topicCount: number) {
  if (countyCount > maxCountyFilters) return `Choose up to ${maxCountyFilters} counties. Narrow the search before adding matches.`;
  if (regionCount > maxRegionFilters) return `Choose up to ${maxRegionFilters} regions.`;
  if (topicCount > maxTopicFilters) return `Choose up to ${maxTopicFilters} industries.`;
  const topicFactor = Math.max(1, topicCount);
  const combinations = (countyCount + Math.max(1, regionCount)) * topicFactor;
  return combinations > maxFilterCombinations
    ? `This selection would create ${combinations} feed combinations. Remove a county, region, or industry to stay within ${maxFilterCombinations}.`
    : "";
}

function displayLabel(definition: { label: string; shortLabel?: string }) {
  return definition.shortLabel || definition.label;
}

function countyMatchesSearch(county: TexasCounty, terms: string[]) {
  if (!terms.length) return true;
  const text = normalizeCountySearch(countySearchText(county));
  return terms.some((term) => text.includes(term));
}

function topicPath(topicSlug: TopicSlug, county?: TexasCounty, region?: RegionSlug) {
  if (region) return `/region/${region}/industry/${topicSlug}`;
  return county ? `/county/${county.slug}/topic/${topicSlug}` : `/topic/${topicSlug}`;
}

function FeedSection({ title, items, visibleCount, emptyTitle, emptyBody, onLoadMore, onFetchMore }: { title: string; items: NewsItem[]; visibleCount: number; emptyTitle: string; emptyBody: string; onLoadMore: () => void; onFetchMore: () => void }) {
  const visibleItems = items.slice(0, visibleCount);
  const hasHiddenItems = visibleCount < items.length;

  return (
    <section className="feed-section">
      <div className="section-heading">
        <p className="eyebrow">{items.length} stories</p>
        <h2>{title}</h2>
      </div>
      {!visibleItems.length ? <StatusCard title={emptyTitle} body={emptyBody} /> : null}
      <div className="news-list">
        {visibleItems.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 && index % 10 === 0 ? (
              <div className="feed-ad-break">
                <AdSlot slot="feed-inline" topics={item.topics} county={getCountyBySlug(item.countySlug)} />
              </div>
            ) : null}
            <NewsCard item={item} />
          </Fragment>
        ))}
      </div>
      {visibleItems.length ? (
        <button className="button load-more" onClick={hasHiddenItems ? onLoadMore : onFetchMore} type="button">
          {hasHiddenItems ? "Load more articles" : "Fetch latest matching articles"}
        </button>
      ) : null}
    </section>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const matchedTopics = item.topics.filter(isTopicSlug);
  const publishedDate = formatPublishedDate(item.publishedAt);
  const topicCounty = item.coverageTier === "county"
    ? getCountyBySlug(item.countySlug)
    : undefined;
  const expandedCoverageLabel =
    item.coverageTier === "market"
      ? `Market coverage: ${item.coverageLabel || item.feedLabel || "nearby market"}`
      : item.coverageTier === "nearby"
        ? `Nearby coverage: ${item.coverageLabel || item.feedLabel || "nearby county"}`
        : "";

  return (
    <article className="news-card">
      <a aria-label={`Open article: ${item.title}`} className="news-image" href={item.link} rel="noopener noreferrer" target="_blank">
        <img alt="" decoding="async" height="460" loading="lazy" src={item.imageUrl || fallbackNewsImage} width="720" />
      </a>
      <div className="news-body">
        <div className="meta-row">
          <span>{item.feedLabel || item.source || "Texas business news"}</span>
          {expandedCoverageLabel ? (
            <span className={`coverage-chip ${item.coverageTier}`}>
              {expandedCoverageLabel}
            </span>
          ) : null}
          {publishedDate ? (
            <time dateTime={publishedDate.iso}>
              {publishedDate.label}
            </time>
          ) : null}
        </div>
        <h3><a href={item.link} rel="noopener noreferrer" target="_blank">{item.title}</a></h3>
        {item.description ? <p>{item.description}</p> : null}
        {matchedTopics.length ? (
          <div className="tag-row" aria-label="Matching industry tags">
            {matchedTopics.map((topic) => (
              <Link key={topic} to={topicPath(topic, topicCounty)}>{displayLabel(topicCatalog[topic])}</Link>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function formatPublishedDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return {
    iso: date.toISOString(),
    label: date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to news</a>
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">TX</span>
          <span>{siteName}</span>
        </Link>
        <button
          aria-controls="site-navigation"
          aria-expanded={navigationOpen}
          className="nav-toggle"
          onClick={() => setNavigationOpen((current) => !current)}
          type="button"
        >
          {navigationOpen ? "Close menu" : "Menu"}
        </button>
        <nav className={navigationOpen ? "open" : ""} id="site-navigation">
          <NavLink onClick={() => setNavigationOpen(false)} to="/">Feed</NavLink>
          <NavLink onClick={() => setNavigationOpen(false)} to="/counties">Counties</NavLink>
          <NavLink onClick={() => setNavigationOpen(false)} to="/mission">Mission</NavLink>
          <NavLink onClick={() => setNavigationOpen(false)} to="/advertise">Advertise</NavLink>
          <NavLink onClick={() => setNavigationOpen(false)} to="/contact">Contact</NavLink>
        </nav>
      </header>
      <div className="site-tagline">A Centralized source for positive business news in the state of Texas</div>
      <div id="main-content">{children}</div>
      <footer className="footer">
        <section className="footer-card footer-brand">
          <strong>{siteName}</strong>
          <p>Positive business signal for the Lone Star State.</p>
          <p className="footer-small">Independent news discovery experience linking readers to original publishers and public third-party sources.</p>
        </section>
        <section className="footer-card">
          <h2>Legal</h2>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Statement</Link>
          <Link to="/contact">Contact</Link>
        </section>
        <section className="footer-card">
          <h2>Site Notes</h2>
          <p>No accounts. News is delivered through a read-only API. Official contact paths are the contact form and admin@texasbusiness.news.</p>
        </section>
        <AdSlot slot="footer" limit={1} />
      </footer>
    </>
  );
}

function TickerStack() {
  return (
    <div className="ticker-stack" aria-label="Market tickers">
      <CryptoTicker />
      <MarketTicker />
    </div>
  );
}

function CryptoTicker() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let script: HTMLScriptElement | undefined;
    const timer = window.setTimeout(() => {
      container.innerHTML = '<div class="livecoinwatch-widget-5" lcw-base="USD" lcw-color-tx="#ffffff" lcw-marquee-1="coins" lcw-marquee-2="none" lcw-marquee-items="12"></div>';
      script = document.createElement("script");
      script.async = true;
      script.src = "https://www.livecoinwatch.com/static/lcw-widget.js";
      container.appendChild(script);
    }, 250);

    return () => {
      window.clearTimeout(timer);
      script?.remove();
      container.innerHTML = "";
    };
  }, []);

  return (
    <aside className="crypto-ticker" aria-label="Crypto ticker">
      <div className="livecoinwatch-widget-container" ref={containerRef} />
    </aside>
  );
}

function MarketTicker() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let script: HTMLScriptElement | undefined;
    const timer = window.setTimeout(() => {
      container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
      script = document.createElement("script");
      script.async = true;
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
      script.textContent = JSON.stringify({
        symbols: [
          { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
          { proName: "TVC:DJI", title: "Dow" },
          { proName: "NASDAQ:IXIC", title: "Nasdaq" },
          { proName: "NASDAQ:TXN", title: "Texas Instruments" },
          { proName: "NYSE:XOM", title: "Exxon Mobil" },
          { proName: "NYSE:CVX", title: "Chevron" },
          { proName: "NASDAQ:TSLA", title: "Tesla" },
          { proName: "NYMEX:CL1!", title: "Crude Oil" },
          { proName: "NYMEX:NG1!", title: "Natural Gas" },
        ],
        showSymbolLogo: true,
        isTransparent: false,
        displayMode: "adaptive",
        colorTheme: "dark",
        locale: "en",
      });
      container.appendChild(script);
    }, 350);

    return () => {
      window.clearTimeout(timer);
      script?.remove();
      container.innerHTML = "";
    };
  }, []);

  return (
    <aside className="market-ticker" aria-label="Market ticker">
      <div className="tradingview-widget-container" ref={containerRef} />
    </aside>
  );
}

function StatusCard({ title, body, loading = false }: { title: string; body: string; loading?: boolean }) {
  return (
    <div className={loading ? "status-card loading-card" : "status-card"}>
      {loading ? <span className="loading-ring" aria-hidden="true" /> : null}
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

function usePageNews({ counties, regions, topics, limit }: HomePageQuery) {
  const [data, setData] = useState<HomePageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const activeRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = activeRequest.current + 1;
    activeRequest.current = requestId;
    setLoading(true);
    setError(null);

    fetchHomePage({ counties, regions, topics, limit }, { signal: controller.signal })
      .then((response) => {
        if (activeRequest.current === requestId) setData(response);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || activeRequest.current !== requestId) return;
        setError(requestError instanceof Error ? requestError.message : "News API request failed.");
      })
      .finally(() => {
        if (!controller.signal.aborted && activeRequest.current === requestId) setLoading(false);
      });

    return () => controller.abort();
  }, [counties, limit, refreshVersion, regions, topics]);

  const refresh = useCallback(() => setRefreshVersion((current) => current + 1), []);
  return { data, loading, error, refresh };
}

function useStoredCountySelection() {
  const [slugs, setSlugs] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(curatedStorageKey) || "[]",
      ) as string[];
      return parsed
        .filter((slug) => getCountyBySlug(slug))
        .slice(0, maxCountyFilters);
    } catch {
      return [];
    }
  });

  const update = useCallback((next: string[]) => {
    const bounded = next
      .filter((slug) => getCountyBySlug(slug))
      .slice(0, maxCountyFilters);
    setSlugs(bounded);
    try {
      window.localStorage.setItem(curatedStorageKey, JSON.stringify(bounded));
    } catch {
      // Strict storage settings may prevent preference persistence.
    }
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
    document.title = `${title} | ${siteName}`;
  }, [title]);
}

export default App;
