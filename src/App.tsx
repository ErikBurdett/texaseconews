import emailjs from "@emailjs/browser";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AdSlot, SponsorBadge } from "./components/AdSlot";
import { CountyCombobox } from "./components/CountyCombobox";
import { TexasMap } from "./components/TexasMap";
import { countySearchText, getCountyBySlug, normalizeCountySearch, texasCounties, type TexasCounty } from "./data/counties";
import { countyPlaces } from "./data/county-places";
import { getRegionBySlug, regionCatalog, regionSlugs, type RegionSlug } from "./data/regions";
import { featuredTopicSlugs, getTopicBySlug, isTopicSlug, topicCatalog, type TopicSlug } from "./data/topics";
import { fetchCountySources, fetchHomePage, type CountySourceDirectory, type FeedResponse, type HomePageQuery, type HomePageResponse, type NewsItem } from "./lib/news-api";

const siteName = "TexasBusiness.News";
/**
 * The legal entity that operates the site. Named in the Terms, the Privacy
 * Statement, and every advertising disclosure so a reader, an advertiser, or a
 * rights holder always knows who they are dealing with and contracting with.
 */
const siteOperator = "Texas Business News, LLC";
const legalEffectiveDate = "September 3, 2026";
/**
 * The one address this site is published at.
 *
 * The same build serves four domains on both apex and www. Every page declares
 * a canonical URL on this origin so search engines and anyone asking "which
 * domain does my placement run on" get a single answer.
 */
const canonicalOrigin = "https://texasbusiness.news";
const mission =
  "Howdy. TexasBusiness.News gathers positive business news and opportunity signals from across the Lone Star State so citizens, builders, employers, investors, visitors, and future Texans can see where momentum is forming. We focus on growth, jobs, small business, innovation, data centers, AI advancement, infrastructure, workforce pathways, and local wins that help people make the most of opportunity close to home.";

const curatedStorageKey = "texasbusiness-news:selected-counties";
const initialVisibleStories = 48;
const pageSize = 24;
const pageApiLimit = 96;
const maxCountyFilters = 4;
const maxRegionFilters = 4;
const maxTopicFilters = 4;
const maxFilterCombinations = 8;
const noNewsItems: NewsItem[] = [];

function App() {
  return (
    <AppContent />
  );
}

function AppContent() {
  useCanonicalUrl();

  return (
    <>
      <SiteHeader />
      <TickerStack />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/counties" element={<CountyDirectoryPage />} />
        <Route path="/txse" element={<TexasExchangePage />} />
        <Route path="/mission" element={<MissionPage />} />
        <Route path="/advertise" element={<AdvertisePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/advertising-standards" element={<AdvertisingStandardsPage />} />
        <Route path="/accessibility" element={<AccessibilityPage />} />
        <Route path="/topic/:topicSlug" element={<TopicPage />} />
        <Route path="/industry/:topicSlug" element={<TopicPage />} />
        <Route path="/region/:regionSlug" element={<RegionPage />} />
        <Route path="/region/:regionSlug/industry/:topicSlug" element={<RegionIndustryPage />} />
        <Route path="/county/:countySlug" element={<CountyPage />} />
        <Route path="/county/:countySlug/sources" element={<CountySourcesPage />} />
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
  const [visibleCountyCount, setVisibleCountyCount] = useState(initialVisibleStories);
  const [visibleStatewideCount, setVisibleStatewideCount] = useState(initialVisibleStories);
  const scopeLabel = selectedRegions.length ? selectedRegions.map(displayLabel).join(", ") : selectedCounties.length ? selectedCounties.map((county) => county.name).join(", ") : "Texas statewide";
  const industryLabel = selectedTopics.length ? selectedTopics.map(displayLabel).join(", ") : "";
  const feedTitle = `${scopeLabel} ${industryLabel ? industryLabel.toLowerCase() : "business momentum"}`;
  const countySectionTitle = selectedCounties.length > 1
    ? "Selected county coverage"
    : `${selectedCounties[0]?.displayName || "County"} coverage`;
  const isLoading = pageNews.loading;
  const hasError = Boolean(pageNews.error);

  usePageTitle(selectedTopicSlugs.length || selectedRegionSlugs.length ? `${scopeLabel} ${industryLabel || "News"}` : "Positive Texas Business News");
  useEffect(() => {
    setVisibleCountyCount(initialVisibleStories);
    setVisibleStatewideCount(initialVisibleStories);
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
      <section className="hero" aria-label="Discover Texas business news">
        <div className="hero-copy">
          <p className="eyebrow"><span className="signal-dot" /> The Texas opportunity journal</p>
          <h1>{selectedTopicSlugs.length === 1 ? `${selectedTopics[0].label} news across Texas.` : selectedRegionSlugs.length === 1 ? `${selectedRegions[0].label} growth news.` : <>Good news.<br /><em>Great Texas possibilities.</em></>}</h1>
          <p>{selectedTopicSlugs.length === 1 ? selectedTopics[0].description : selectedRegionSlugs.length === 1 ? selectedRegions[0].description : "The businesses, people, and projects moving Texas forward. Discover new jobs, local investment, and opportunity in the places you care about."}</p>
          <div className="hero-actions">
            <a className="button primary" href="#feed-controls" onClick={() => document.getElementById("county-search")?.focus()}>Find your county <span aria-hidden="true">↗</span></a>
            <a className="hero-text-link" href="#latest-news">Explore the latest <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-footnote"><span>254 counties. One connected Texas.</span><Link to="/methodology">Our editorial approach ↗</Link></div>
        </div>
        <TexasMap />
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
          {selectedCounties.length ? <nav className="directory-section" aria-label="Local source directories">
            <h2>Local sources</h2>
            {selectedCounties.map((county) => <p key={county.slug}><Link to={`/county/${county.slug}/sources`}>{county.displayName} sources and towns</Link></p>)}
          </nav> : null}
        </div>
        <div className="feed-column" id="latest-news">
          <div className="feed-toolbar">
            <div>
              <p className="eyebrow">Live feed</p>
              <h2>{feedTitle}</h2>
            </div>
            <button className="button ghost" onClick={pageNews.refresh} type="button">Refresh</button>
          </div>

          {isLoading ? <StatusCard loading title="Finding the latest Texas stories" body="Getting your selected stories from local publishers and statewide sources." /> : null}
          {hasError ? <StatusCard title="News API unavailable" body={pageNews.error || "Showing the last available results. Try refreshing in a few minutes."} /> : null}
          {!isLoading && selectedCounties.length > 0 && !countyItems.length ? <StatusCard title="No local or nearby growth stories yet" body="The county, nearby-market, and nearby-county checks did not find matching stories. Statewide Texas articles are still listed below." /> : null}

          {selectedCounties.length ? (
            <FeedSection
              emptyBody="Try another county, city, or topic while the local and nearby filters refresh."
              emptyTitle="No local or nearby growth stories yet"
              items={countyItems}
              title={countySectionTitle}
              visibleCount={visibleCountyCount}
              canFetchMore={pageNews.data?.county?.meta.hasMore ?? false}
              loadingMore={pageNews.loadingMore} loadMoreError={pageNews.loadMoreError}
              onFetchMore={pageNews.hasMore ? pageNews.loadMore : pageNews.refresh}
              onLoadMore={() => setVisibleCountyCount((current) => Math.min(current + pageSize, countyItems.length))}
            />
          ) : null}

          <FeedSection
            emptyBody="Try refreshing or clearing topic filters while the statewide feed updates."
            emptyTitle="No Texas statewide growth stories yet"
            items={statewideItems}
            title="Texas statewide articles"
            visibleCount={visibleStatewideCount}
            canFetchMore={pageNews.data?.statewide.meta.hasMore ?? false}
            loadingMore={pageNews.loadingMore} loadMoreError={pageNews.loadMoreError}
            onFetchMore={pageNews.hasMore ? pageNews.loadMore : pageNews.refresh}
            onLoadMore={() => setVisibleStatewideCount((current) => Math.min(current + pageSize, statewideItems.length))}
          />
        </div>
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
                  {countyPlaceLabel(county) ? <span>{countyPlaceLabel(county)}</span> : null}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </Shell>
  );
}

function CountySourcesPage() {
  const { countySlug = "" } = useParams();
  const county = getCountyBySlug(countySlug);
  const [result, setResult] = useState<{ slug: string; data?: CountySourceDirectory; error?: string }>();
  const [selection, setSelection] = useState({ countySlug: "", city: "" });
  const city = selection.countySlug === countySlug ? selection.city : "";
  usePageTitle(`${county?.displayName || "County"} Sources`);
  useEffect(() => {
    if (!county) return;
    const controller = new AbortController();
    fetchCountySources(county.slug, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ slug: county.slug, data }); },
      () => { if (!controller.signal.aborted) setResult({ slug: county.slug, error: "The source directory is temporarily unavailable. Please try again shortly." }); },
    );
    return () => controller.abort();
  }, [county]);
  if (!county) return <NotFoundPage title="County not found" body="Choose a Texas county from the directory." />;
  const current = result?.slug === countySlug ? result : undefined;
  const sources = current?.data?.sources;
  const groups = [
    { title: "Local newsrooms", match: (source: CountySourceDirectory["sources"][number]) => source.kind === "newsroom", empty: "We have not yet verified a local newsroom for this county. Official and statewide sources are listed separately below." },
    { title: "Official county sources", match: (source: CountySourceDirectory["sources"][number]) => source.kind === "official", empty: "No official source is currently listed." },
    { title: "Additional regional and statewide sources", match: (source: CountySourceDirectory["sources"][number]) => source.kind === "registered", empty: "No additional sources are currently listed." },
  ];
  return <Shell>
    <section className="page-hero">
      <p className="eyebrow">Local source directory</p>
      <h1>{city ? `${city}, ${county.displayName}` : county.displayName} sources</h1>
      <p>These sources help us find business growth, jobs, investment, and public projects. Each story must pass our positive business news and location checks.</p>
      <p><Link to={`/county/${county.slug}`}>Read {county.displayName} news</Link> · <Link to="/counties">Browse all counties</Link></p>
      <label htmlFor="source-city">City or town</label>
      <select id="source-city" className="search-input directory-search" value={city} onChange={(event) => setSelection({ countySlug, city: event.target.value })}>
        <option value="">All of {county.displayName}</option>
        {(countyPlaces[county.fips] ?? []).map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      {city ? <p>These are county-serving sources for {city}; a city story must also name {city}. A listed source may cover other towns.</p> : null}
      <p>A source listing does not guarantee a recent matching story. Official county announcements are distinct from newsroom reporting.</p>
    </section>
    {!current ? <StatusCard loading title="Loading local sources" body="Checking the county source directory." /> : null}
    {current?.error ? <StatusCard title="Sources unavailable" body={current.error} /> : null}
    {sources ? <section className="directory-grid">{groups.map((group) => {
      const entries = sources.filter(group.match);
      return <article className="directory-section" key={group.title}>
        <h2>{group.title}</h2>
        {!entries.length ? <p>{group.empty}</p> : <div className="county-link-grid">{entries.map((source) =>
          <a className="county-link-card" key={source.id} href={source.websiteUrl} target="_blank" rel="noopener noreferrer"><strong>{source.name}</strong><span>{source.coverage === "county" ? county.displayName : "Texas statewide"}</span></a>,
        )}</div>}
      </article>;
    })}</section> : null}
  </Shell>;
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
        <InfoCard title="Contextual Placements" body="Choose statewide, regional, county, or industry context. TexasBusiness.News does not currently build behavioral advertising profiles or target readers using sensitive personal data." />
        <InfoCard title="Unmistakable Disclosure" body="Every paid placement displays Advertisement and Paid sponsor labeling, remains visually separate from editorial links, and identifies the paying advertiser." />
        <InfoCard title="Minimal Measurement" body="Impression and click events are held in the page's in-memory dataLayer with campaign and slot fields. No analytics recipient is currently connected." />
      </section>
      <section className="advertise-panel">
        <div>
          <p className="eyebrow">Launch packages</p>
          <h2>Built for sponsors with a Texas growth story.</h2>
          <p>Use hero, sidebar, inline feed, and footer placements to reach readers while they explore Texas business coverage. Placement does not buy favorable coverage, editorial review, or publisher endorsement.</p>
          <p><Link to="/advertising-standards">Review the advertising standards, restricted categories, creative requirements, and preflight process.</Link></p>
        </div>
        <div className="package-list">
          <InfoCard title="Statewide Launch Partner" body="Broad Texas visibility across hero and footer placements." />
          <InfoCard title="Regional Growth Partner" body="Target metros, regions, or county clusters where your work is creating opportunity." />
          <InfoCard title="Topic Partner" body="Sponsor focused areas such as AI infrastructure, jobs, energy, or small business expansion." />
          <InfoCard title="Human Approval Required" body="Campaigns are not self-serve. Creative, claims, rights, regulated-industry disclosures, and HTTPS destinations must be reviewed before publication." />
        </div>
      </section>
      <AdSlot slot="footer" limit={3} />
    </Shell>
  );
}

/**
 * Abuse controls on the contact form.
 *
 * The form is the published intake path for privacy requests, corrections, and
 * copyright complaints, so the concern is a legally significant channel being
 * drowned in automated noise (and the EmailJS quota being exhausted), not spam
 * for its own sake. A honeypot field and a minimum fill time reject scripted
 * submissions; a per-browser cooldown caps the rate of genuine ones.
 */
const contactHoneypotField = "company_website";
const contactMinimumFillMs = 3_000;
const contactCooldownMs = 60_000;
const contactCooldownKey = "texasbusiness-news:contact-last-sent";

function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const formLoadedAt = useRef(0);
  usePageTitle("Contact");

  useEffect(() => {
    formLoadedAt.current = Date.now();
  }, []);

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    // A bot fills every field it finds, including one no reader can see. Report
    // success so an automated submitter learns nothing from the response.
    if (String(formData.get(contactHoneypotField) || "").trim()) {
      form.reset();
      setStatus("success");
      setStatusMessage("Message sent. We will review it at admin@texasbusiness.news.");
      return;
    }

    if (Date.now() - formLoadedAt.current < contactMinimumFillMs) {
      setStatus("error");
      setStatusMessage("That was submitted a little too quickly. Please review your message and send again.");
      return;
    }

    const cooldownRemaining = contactCooldownRemaining();
    if (cooldownRemaining > 0) {
      setStatus("error");
      setStatusMessage(
        `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before sending another message, or email admin@texasbusiness.news.`,
      );
      return;
    }

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
          submission_type: "general_contact",
        },
        { publicKey },
      );
      form.reset();
      formLoadedAt.current = Date.now();
      recordContactSubmission();
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
            <input autoComplete="name" maxLength={120} name="name" placeholder="Your name" required type="text" />
          </label>
          <label>
            <span>Email</span>
            <input autoComplete="email" maxLength={254} name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label>
            <span>Message</span>
            <textarea maxLength={5_000} name="message" placeholder="How can we help?" required rows={6} />
          </label>
          <div aria-hidden="true" className="contact-honeypot">
            <label htmlFor={contactHoneypotField}>Company website</label>
            <input autoComplete="off" id={contactHoneypotField} name={contactHoneypotField} tabIndex={-1} type="text" />
          </div>
          <p className="form-privacy-notice">
            We send these fields to EmailJS to deliver your request to our inbox. Do not submit sensitive personal
            information. See the <Link to="/privacy">Privacy Statement</Link>.
          </p>
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

function contactCooldownRemaining() {
  try {
    const lastSent = Number(window.localStorage.getItem(contactCooldownKey));
    if (!Number.isFinite(lastSent) || lastSent <= 0) return 0;
    return Math.max(0, contactCooldownMs - (Date.now() - lastSent));
  } catch {
    return 0;
  }
}

function recordContactSubmission() {
  try {
    window.localStorage.setItem(contactCooldownKey, String(Date.now()));
  } catch {
    // Storage is unavailable; the fill-time and honeypot checks still apply.
  }
}

function TermsPage() {
  usePageTitle("Terms of Service");

  return (
    <Shell>
      <section className="page-hero legal-page">
        <p className="eyebrow">Terms of service</p>
        <h1>Terms for using {siteName}.</h1>
        <p>Effective {legalEffectiveDate}. These terms are an agreement between you and {siteOperator}, a Texas limited liability company (“{siteOperator},” “we,” “us,” or “the operator”), which owns and operates {siteName}. They govern access to this independent news-discovery service, its filters, sponsor placements, contact form, and optional third-party widgets.</p>
      </section>
      <section className="legal-document">
        <LegalSection title="1. Acceptance and eligibility">
          <p>By accessing {siteName}, you accept these terms and the <Link to="/privacy">Privacy Statement</Link>. If you do not accept them, do not use the service. The service is intended for a general audience and is not directed to children under 13. {siteName} is operated by {siteOperator}, a Texas limited liability company; correspondence may be sent through the <Link to="/contact">contact form</Link> or to <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>.</p>
        </LegalSection>
        <LegalSection title="2. News-discovery service">
          <p>{siteName} organizes links to positive Texas business reporting using statewide, regional, county, and industry filters. It is not the original publisher of linked reporting. Automated relevance and topic labels can be incomplete or wrong; verify the original article before relying on a result. Our process is described in the <Link to="/methodology">Editorial and Source Methodology</Link>.</p>
        </LegalSection>
        <LegalSection title="3. Publisher content and attribution">
          <p>Publishers and other licensors retain all rights in their articles, headlines, photographs, marks, and feeds. A public RSS endpoint does not by itself grant republication rights. Until source-specific rights are confirmed, this site limits article cards to factual metadata such as a title, source, date, topic, and a direct link and does not display publisher images or excerpts.</p>
          <p>Do not use {siteName} to evade a publisher paywall, reproduce full articles, remove attribution, or imply that a publisher endorses this service or an advertiser.</p>
        </LegalSection>
        <LegalSection title="4. Advertising and editorial independence">
          <p>Every placement is labeled “Advertisement,” identifies the advertiser, and is technically separated from editorial cards. Consideration for a placement may be money or an exchange of advertising with the advertiser; either way it is disclosed as an advertisement and nothing further is claimed about the arrangement. If {siteOperator} ever runs a placement for a business it or its owners also own, that common ownership is disclosed in the placement itself. Advertising does not purchase coverage, favorable treatment, or influence over source selection. Advertisers are responsible for their claims, rights, offers, and destination pages and must follow our <Link to="/advertising-standards">Advertising Standards</Link>.</p>
        </LegalSection>
        <LegalSection title="5. No professional advice">
          <p>Nothing on the site is legal, investment, securities, tax, medical, health, insurance, employment, or other professional advice. Market and crypto information may be delayed or inaccurate. Consult the original source and a qualified professional before making decisions.</p>
        </LegalSection>
        <LegalSection title="6. Third-party services and links">
          <p>The news API, RSS providers, EmailJS, LiveCoinWatch, TradingView, sponsors, and linked publishers are independent third parties. Their content, availability, security, accessibility, and privacy practices are governed by their own terms. A link or adjacent advertisement does not constitute endorsement, partnership, or verification.</p>
        </LegalSection>
        <LegalSection title="7. Acceptable use">
          <p>You may browse the service and share links to public pages. You may not disrupt the site, bypass security or rate limits, introduce malicious code, scrape at a volume that harms the service, misrepresent affiliation, copy protected third-party content, use the service unlawfully, or use automated output to make high-impact decisions about another person.</p>
        </LegalSection>
        <LegalSection title="8. Our materials">
          <p>The {siteName} name, original interface, taxonomy, arrangement, and original policy text are protected to the extent allowed by law. No license is granted to third-party publisher or advertiser marks. Reasonable linking to public pages is permitted if it does not imply endorsement.</p>
        </LegalSection>
        <LegalSection title="9. Corrections and copyright concerns">
          <p>Send corrections, source opt-out requests, and copyright concerns through the <Link to="/contact">contact form</Link> or to <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>. Include the affected URL, the work or statement at issue, your authority to act, a clear explanation, and reliable contact information. We may remove or disable material while reviewing a request.</p>
          <p>This contact process is not a representation that the operator has registered a designated agent or currently claims every safe harbor under the Digital Millennium Copyright Act. Counsel should complete any formal DMCA registration and notice process before the site represents otherwise.</p>
        </LegalSection>
        <LegalSection title="10. Disclaimers">
          <p>The service is provided “as is” and “as available.” To the maximum extent permitted by law, the operator disclaims warranties of accuracy, completeness, merchantability, fitness for a particular purpose, title, non-infringement, uninterrupted availability, and error-free operation. Some jurisdictions do not allow every disclaimer.</p>
        </LegalSection>
        <LegalSection title="11. Limitation of liability">
          <p>To the maximum extent permitted by law, the operator will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, decisions based on linked content, third-party conduct, or service interruption. Rights that cannot legally be limited remain unaffected.</p>
        </LegalSection>
        <LegalSection title="12. Indemnification">
          <p>You will indemnify, defend, and hold harmless {siteOperator} and its members, officers, employees, and agents from any third-party claim, demand, loss, liability, damage, penalty, or reasonable attorneys’ fee arising out of your use of the service, your breach of these terms, your violation of law, or your infringement of another party’s rights. This does not apply to the extent a claim arises from the operator’s own conduct.</p>
          <p>An advertiser’s indemnification obligations are set out separately in its insertion order and are in addition to this section.</p>
        </LegalSection>
        <LegalSection title="13. Dispute resolution and venue">
          <p>Before filing any claim, contact us through the <Link to="/contact">contact form</Link> or at <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a> with a written description of the dispute and the relief you seek. The parties will attempt in good faith to resolve the matter informally for 30 days from that notice.</p>
          <p>If a dispute is not resolved informally, it must be brought exclusively in the state or federal courts located in the State of Texas, and you and {siteOperator} consent to the personal jurisdiction of those courts. Either party may seek injunctive relief in any court of competent jurisdiction to protect its intellectual property or confidential information. Nothing here prevents you from bringing a matter before a government agency that has authority over it, or from filing in small claims court if your claim qualifies.</p>
        </LegalSection>
        <LegalSection title="14. Changes, severability, and Texas law">
          <p>We may update the service or these terms by posting a new effective date. If one provision is unenforceable, the remaining provisions continue. These terms are governed by Texas law, without overriding mandatory consumer protections that apply where you live. These terms are the entire agreement between you and {siteOperator} regarding the service, and you may not assign them without our written consent.</p>
        </LegalSection>
        <LegalSection title="15. Contact">
          <p>Questions about these terms may be sent through the <Link to="/contact">contact form</Link> or to <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>.</p>
        </LegalSection>
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
        <p>Effective {legalEffectiveDate}. This statement explains the limited data used by {siteName}, operated by {siteOperator}, the vendors involved, your choices, and how to make a privacy request.</p>
      </section>
      <section className="legal-document">
        <LegalSection title="1. Scope and operator contact">
          <p>This statement applies to the {siteName} website. The controller of the personal data described here is {siteOperator}, a Texas limited liability company. The site currently has no user accounts, subscriptions, or direct payment processing. Contact the operator through the <Link to="/contact">contact form</Link> or at <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>.</p>
        </LegalSection>
        <LegalSection title="2. Information you provide">
          <p>The contact form collects the name, email address, and message you choose to submit. Do not include sensitive personal data. EmailJS transmits the submission to our inbox. Linked publishers, sponsors, and future advertiser intake forms collect information under their own notices.</p>
        </LegalSection>
        <LegalSection title="3. Browser preferences and RSS cache">
          <ul>
            <li>Selected county slugs are stored under <code>texasbusiness-news:selected-counties</code> until you clear them or browser storage.</li>
            <li>The time of your last contact-form submission is stored under <code>texasbusiness-news:contact-last-sent</code> to rate-limit the form. It holds a timestamp only, never message content.</li>
            <li>During an eligible API outage, normalized RSS fallback metadata may be cached under keys beginning <code>texaseconews:rss-fallback:v3:</code>. Entries expire after 45 minutes and are removed when next checked.</li>
            <li>Region and industry choices otherwise remain in React page state.</li>
          </ul>
        </LegalSection>
        <LegalSection title="4. Technical data">
          <p>AWS Amplify Hosting, the news API, and security infrastructure may process IP address, request time, requested URL, user-agent or browser details, referring page, device and network information, and error or security logs. Retention and access depend on the configured AWS and API logging settings.</p>
        </LegalSection>
        <LegalSection title="5. Sponsor measurement">
          <p>Visible sponsor impressions and sponsor-link clicks create limited events containing event type, campaign ID, sponsor name, and placement slot in the current page’s in-memory <code>dataLayer</code>. County, region, account, cross-site identifier, and sensitive data are not included. No analytics recipient is currently connected, and the in-memory events end with the page session.</p>
        </LegalSection>
        <LegalSection title="6. Market ticker widgets">
          <p>Every page loads market ticker widgets from LiveCoinWatch and TradingView. Because their scripts run in your browser, those vendors receive your IP address, browser and device details, and page-request information, and may use cookies, local storage, or similar technologies under their own privacy policies rather than this one. {siteName} does not receive or store what they collect.</p>
          <p>If you prefer not to load them, a browser content blocker or script blocker will stop them without affecting the news feed, the filters, or the sponsor labels, which do not depend on either vendor.</p>
        </LegalSection>
        <LegalSection title="7. News delivery and RSS proxies">
          <p>The primary news API receives selected county, region, and industry slugs plus a result limit. Browser RSS fallback is off by default in production and should be enabled only after source rights and proxy terms are approved. When enabled after an eligible API failure, RSS2JSON or AllOrigins receives the public feed URL and normal network request data. Those services do not receive contact-form content from this site and do not grant rights to publisher content.</p>
        </LegalSection>
        <LegalSection title="8. Uses and legal bases">
          <p>We use information to deliver requested pages, remember choices, route contact messages, secure and debug the service, prevent abuse, measure sponsor placement within the page, comply with law, and handle corrections or rights requests. Depending on the activity and applicable law, processing is based on providing the requested service, legitimate operational interests, or legal obligations.</p>
        </LegalSection>
        <LegalSection title="9. Disclosure and sale">
          <p>Information may be processed by AWS Amplify, the news API operator, EmailJS, and vendors you choose to load, and may be disclosed when legally required or in a business transfer subject to appropriate protections. {siteName} does not currently sell personal data, share it for cross-context behavioral advertising, or use it for targeted advertising as those terms are commonly defined. Current sponsor placement is contextual.</p>
        </LegalSection>
        <LegalSection title="10. Retention and security">
          <p>Browser preferences remain until cleared or changed. RSS fallback cache entries expire after 45 minutes. Page-memory ad events end when the page session ends. Contact messages and infrastructure logs are retained only as reasonably needed for the request, security, records, and legal obligations under operator and vendor settings. We use reasonable safeguards, but no internet system is completely secure.</p>
        </LegalSection>
        <LegalSection title="11. Texas privacy rights">
          <p>Where the Texas Data Privacy and Security Act or another law applies, you may request access, correction, deletion, or a portable copy of covered personal data, and may opt out of covered targeted advertising, sale, or certain profiling. You may also appeal a denied request. Submit requests through the <Link to="/contact">contact form</Link> or to <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>. We may verify your identity and authority and will respond within the period required by applicable law.</p>
        </LegalSection>
        <LegalSection title="12. Children and sensitive data">
          <p>The site is not directed to children under 13 and does not knowingly collect children’s personal information. We do not ask for precise geolocation, government identifiers, health records, account credentials, or other sensitive data. Do not place sensitive data in the contact form.</p>
        </LegalSection>
        <LegalSection title="13. External sites and transfers">
          <p>Publishers, sponsors, and widgets have separate privacy practices. Their processing may occur outside Texas or the United States. Review their notices before enabling a widget or following an external link.</p>
        </LegalSection>
        <LegalSection title="14. Changes and complaints">
          <p>We may update this statement by changing its effective date. Send questions, complaints, requests, or appeals through the <Link to="/contact">contact form</Link> or to <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>.</p>
        </LegalSection>
      </section>
    </Shell>
  );
}

function MethodologyPage() {
  usePageTitle("Editorial and Source Methodology");

  return (
    <Shell>
      <section className="page-hero legal-page">
        <p className="eyebrow">Editorial and source methodology</p>
        <h1>How the Texas business feed is built.</h1>
        <p>Effective August 31, 2026. TexasBusiness.News is a discovery layer, not the original publisher of the linked reporting.</p>
      </section>
      <section className="legal-document">
        <LegalSection title="Scope and selection">
          <p>The service looks for constructive Texas business signals involving jobs, investment, openings, infrastructure, technology, energy, workforce, tourism, agriculture, and related industries. Automated rules de-emphasize crime, tragedy, violence, and other topics outside the stated product scope. Inclusion is not an endorsement, and omission is not a judgment about a story’s importance.</p>
        </LegalSection>
        <LegalSection title="Geographic confidence">
          <p>County results require evidence in the article title or machine-readable description. Sparse county feeds may include clearly labeled nearby-market or nearby-county context. Those expanded items do not claim a county association and do not receive county-specific topic links.</p>
        </LegalSection>
        <LegalSection title="Primary API and outage fallback">
          <p>A read-only page API is the primary delivery path. Browser-side Google News and direct RSS retrieval through RSS2JSON or AllOrigins is an emergency fallback only. Production fallback is disabled by default and must not be enabled until the operator has approved the relevant source rights and proxy terms.</p>
        </LegalSection>
        <LegalSection title="Rights-conscious article cards">
          <p>Article cards identify the actual publisher when the feed provides it and link readers to the original page. The launch-safe display is limited to headline, publisher/source, publication date, coverage label, and automated industry tags. Publisher photographs and feed excerpts are not displayed unless a documented license or source policy permits that exact commercial use.</p>
        </LegalSection>
        <LegalSection title="Automation limits">
          <p>Topic extraction, source identity, dates, deduplication, and place matching can be incorrect. Tags describe automated matching, not publisher classifications. Market widgets are separate third-party data products and are not reporting produced by this site.</p>
        </LegalSection>
        <LegalSection title="Advertising separation">
          <p>Advertising is selected independently of article inclusion and uses separate components and unmistakable labels. A sponsor does not approve coverage, and an ad beside a story does not imply endorsement by the publisher, subject, county, or public entity.</p>
        </LegalSection>
        <LegalSection title="Corrections, source requests, and opt-outs">
          <p>Send a correction, source suggestion, source opt-out, or rights concern through the <Link to="/contact">contact form</Link> or to <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>. Include the page URL and supporting information. We may remove a result while reviewing it.</p>
        </LegalSection>
      </section>
    </Shell>
  );
}

function AdvertisingStandardsPage() {
  usePageTitle("Advertising Standards");

  return (
    <Shell>
      <section className="page-hero legal-page">
        <p className="eyebrow">Advertising standards</p>
        <h1>Paid placements must earn reader trust.</h1>
        <p>Effective August 31, 2026. Every campaign requires human approval and a signed insertion order or advertiser agreement before activation.</p>
      </section>
      <section className="legal-document">
        <LegalSection title="Disclosure and separation">
          <p>Every placement must show “Advertisement” and “Paid sponsor” next to the advertiser’s identity on every device. Ads must remain visually and technically distinct from article cards and may not mimic newsroom controls, system alerts, or publisher branding.</p>
        </LegalSection>
        <LegalSection title="Editorial independence and false association">
          <p>Payment does not guarantee coverage, placement near a specific publisher, favorable treatment, or editorial influence. Creative may not imply endorsement by {siteName}, a linked publisher, article subject, county, university, public agency, or other third party without documented permission.</p>
        </LegalSection>
        <LegalSection title="Prohibited advertising">
          <ul>
            <li>Illegal products, services, activity, or evasion of law.</li>
            <li>Deceptive claims, fabricated endorsements, impersonation, counterfeit goods, malware, phishing, or unsafe downloads.</li>
            <li>Discriminatory housing, employment, credit, insurance, or other unlawful audience exclusions.</li>
            <li>Adult sexual content, exploitation, hate, harassment, graphic violence, or content designed for children using manipulative practices.</li>
            <li>Tobacco, vaping, unapproved controlled substances, or products unlawfully marketed in Texas.</li>
            <li>Creative that infringes copyright, trademark, privacy, publicity, or other rights.</li>
          </ul>
        </LegalSection>
        <LegalSection title="Restricted categories">
          <p>Securities, investments, crypto, lending, insurance, health products, medical services, pharmaceuticals, political advocacy, ballot measures, gambling, sweepstakes, alcohol, firearms, hunting products, CBD or hemp, testimonials, environmental claims, and government or military themes require category-specific legal review and substantiation. The operator may decline these categories entirely.</p>
        </LegalSection>
        <LegalSection title="Claims and offers">
          <p>Advertisers must provide written support for objective claims, prices, comparisons, testimonials, results, origin claims, and environmental or health representations. Material limitations must be clear and close to the claim. The overall net impression, not fine print alone, must be truthful under FTC and applicable Texas standards.</p>
        </LegalSection>
        <LegalSection title="Creative and destination requirements">
          <p>Advertisers must own or license every logo, image, font, testimonial, and statement. Destinations must use HTTPS, match the offer, identify the advertiser, avoid forced downloads and deceptive interfaces, and maintain an appropriate privacy notice. Redirects and landing pages are reviewed before launch and may be rechecked.</p>
        </LegalSection>
        <LegalSection title="Privacy and targeting">
          <p>Current placements are contextual. Campaigns may not use sensitive data, precise location, children’s data, health conditions, financial hardship, or protected-class inferences. Behavioral targeting, pixels, audience matching, and data sharing require a separate privacy assessment, contract, disclosure, and any legally required opt-out or consent before implementation.</p>
        </LegalSection>
        <LegalSection title="Preflight, records, and enforcement">
          <p>Before activation, the operator must record advertiser identity, signed agreement, final creative, destination and redirects, claim support, rights evidence, category disclosures, approval date, placement, campaign dates, and reviewer. Keep versions, invoices, disclosure screenshots, measurement methodology, complaints, and takedown history under a documented retention schedule.</p>
          <p>The operator may reject, pause, relabel, or remove a campaign at any time for legal, safety, quality, or trust concerns. Material changes require re-review. Advertisers remain responsible for their content and must promptly cooperate with complaints and investigations.</p>
        </LegalSection>
        <LegalSection title="Request review">
          <p>Send campaign inquiries through the <Link to="/contact">contact form</Link> or to <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>. No campaign is accepted and no inventory is guaranteed until written approval and a signed agreement are complete.</p>
        </LegalSection>
      </section>
    </Shell>
  );
}

function AccessibilityPage() {
  usePageTitle("Accessibility Statement");

  return (
    <Shell>
      <section className="page-hero legal-page">
        <p className="eyebrow">Accessibility</p>
        <h1>Accessibility at {siteName}.</h1>
        <p>Effective {legalEffectiveDate}. {siteOperator} intends {siteName} to be usable by everyone, including readers who use screen readers, keyboard navigation, magnification, or reduced motion.</p>
      </section>
      <section className="legal-document">
        <LegalSection title="1. Standard we aim for">
          <p>We work toward the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. That is our target, not a claim of complete conformance: the site is new, parts of it change often, and some content comes from third parties we do not control.</p>
        </LegalSection>
        <LegalSection title="2. What we do">
          <ul>
            <li>Automated accessibility checks run against the main templates in our end-to-end test suite, and a build that introduces a detected violation is treated as a defect.</li>
            <li>Pages use semantic headings and landmarks, visible focus, text alternatives for meaningful images, and labeled form controls.</li>
            <li>Advertising creative is reviewed for contrast, keyboard access, and an accessible name before a placement goes live.</li>
            <li>The market and crypto ticker widgets are supplied by third parties; the news feed, filters and sponsor labels do not depend on them and remain fully usable if those scripts are blocked.</li>
          </ul>
        </LegalSection>
        <LegalSection title="3. Known limitations">
          <p>Linked publisher articles, sponsor destination pages, and the LiveCoinWatch and TradingView ticker widgets are controlled by third parties, and their accessibility is governed by those parties. Automated testing finds only a portion of accessibility problems; reader reports are the most reliable signal we have.</p>
        </LegalSection>
        <LegalSection title="4. Tell us about a barrier">
          <p>If any part of this site is difficult or impossible for you to use, tell us through the <Link to="/contact">contact form</Link> or at <a href="mailto:admin@texasbusiness.news">admin@texasbusiness.news</a>. Please include the page address, what you were trying to do, and the assistive technology or browser you were using.</p>
          <p>We aim to acknowledge accessibility reports within five business days and to describe a fix or a workaround within thirty days. If we cannot make something accessible, we will offer another way to get the same information.</p>
        </LegalSection>
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
  const [filterError, setFilterError] = useState("");
  const selected = new Set(selectedSlugs);
  const selectedCounties = selectedSlugs.map(getCountyBySlug).filter(Boolean) as TexasCounty[];
  const activeFilterCount = selectedSlugs.length + selectedRegionSlugs.length + selectedTopicSlugs.length;

  function toggleCounty(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    const nextSlugs = [...next];
    if (!acceptFilterSelection(nextSlugs, selectedRegionSlugs, selectedTopicSlugs)) return false;
    onCountyChange(nextSlugs);
    return true;
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
    <section className="controls-card" id="feed-controls">
      <div className="controls-heading-row">
        <div className="controls-heading">
          <p className="eyebrow">Make it local</p>
          <h2>Your Texas. Your perspective.</h2>
          <p>Choose the places and industries you want to follow.</p>
        </div>
        <SponsorBadge />
      </div>
      <CountyCombobox selected={selectedSlugs}
        canAdd={!filterSelectionIssue(selectedSlugs.length + 1, selectedRegionSlugs.length, selectedTopicSlugs.length)}
        onSelect={(county) => toggleCounty(county.slug)} />

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

      <div className="filter-panel" id="feed-filter-panel">
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
      </div>
      <div className="filter-bottom-row">
        <p className="picker-count" id="feed-selection-status" role="status">{filterError || "Choose up to 4 counties, 4 regions, and 4 industries. Combine filters to focus your feed."}</p>
        {activeFilterCount ? <button className="reset-filters" type="button" onClick={resetFeed}>Clear all filters</button> : null}
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

function FeedSection({ title, items, visibleCount, emptyTitle, emptyBody, onLoadMore, onFetchMore, canFetchMore = false, loadingMore = false, loadMoreError }: { title: string; items: NewsItem[]; visibleCount: number; emptyTitle: string; emptyBody: string; onLoadMore: () => void; onFetchMore: () => void; canFetchMore?: boolean; loadingMore?: boolean; loadMoreError?: string | null }) {
  const visibleItems = items.slice(0, visibleCount);
  const hasHiddenItems = visibleCount < items.length;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (loadingMore || loadMoreError || (!hasHiddenItems && !canFetchMore)) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Also catches fast scrolls that jump past the sentinel on small screens.
        if (sentinel.current && sentinel.current.getBoundingClientRect().top < window.innerHeight + 600) {
          if (hasHiddenItems) onLoadMore(); else onFetchMore();
        }
      });
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [hasHiddenItems, canFetchMore, loadingMore, loadMoreError, onLoadMore, onFetchMore]);
  const buttonLabel = loadMoreError ? "Retry loading older stories" : loadingMore
    ? "Loading more articles..."
    : hasHiddenItems || canFetchMore
      ? "Load more articles"
      : "End of matching stories";

  return (
    <section className="feed-section">
      <div className="section-heading">
        <p className="eyebrow">{items.length} stories</p>
        <h2>{title}</h2>
      </div>
      {!visibleItems.length ? <StatusCard title={emptyTitle} body={emptyBody} /> : null}
      <p className="feed-source-note">Newest first. Keep scrolling for older stories matching your filters, up to two years back. Open a headline to read the original report.</p>
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
      <div ref={sentinel} className="feed-sentinel" aria-hidden="true" />
      {loadMoreError ? <p role="status" className="feed-source-note">{loadMoreError}</p> : null}
      {visibleItems.length || canFetchMore ? (
        <button className="button load-more" data-can-fetch-more={String(canFetchMore)} data-hidden-items={String(hasHiddenItems)} disabled={loadingMore || (!hasHiddenItems && !canFetchMore)} onClick={hasHiddenItems ? onLoadMore : onFetchMore} type="button">
          {buttonLabel}
        </button>
      ) : null}
    </section>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const matchedTopics = item.topics.filter(isTopicSlug);
  const publishedDate = formatPublishedDate(item.publishedAt);
  const publisherName = item.source || publisherHostname(item.sourceUrl || item.link) || item.feedLabel || "Original publisher";
  const topicCounty = item.coverageTier === "county"
    ? getCountyBySlug(item.countySlug)
    : undefined;
  const expandedCoverageLabel =
    item.coverageTier === "statewide" && item.coverageLabel?.startsWith("Texas statewide context")
      ? item.coverageLabel
      : item.coverageTier === "market"
      ? `Market coverage: ${item.coverageLabel || item.feedLabel || "nearby market"}`
      : item.coverageTier === "nearby"
        ? `Nearby coverage: ${item.coverageLabel || item.feedLabel || "nearby county"}`
        : "";

  return (
    <article className="news-card rights-safe-card">
      <div className="news-body">
        <div className="meta-row">
          <span className="publisher-name" title={publisherName}>{publisherName}</span>
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
        {matchedTopics.length ? (
          <div className="tag-row" aria-label="Matching industry tags">
            {matchedTopics.map((topic) => (
              <Link key={topic} to={topicPath(topic, topicCounty)}>{displayLabel(topicCatalog[topic])}</Link>
            ))}
          </div>
        ) : null}
        <a aria-label={`Read this story at ${publisherName} (opens in a new tab)`} className="read-source-link" href={item.link} referrerPolicy="strict-origin-when-cross-origin" rel="noopener noreferrer" target="_blank">
          Read at {shortPublisher(publisherName)} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

/**
 * The place label under a county name: its metro, or its region when one was
 * actually assigned. Counties default to "All of Texas", which says nothing a
 * reader of a Texas county directory does not already know, so it is omitted.
 */
function countyPlaceLabel(county: TexasCounty) {
  if (county.metro) return county.metro;
  return county.region === "All of Texas" ? "" : county.region;
}

/** Keeps the outbound link on one line; the full name is in the meta row. */
function shortPublisher(name: string) {
  return name.length > 26 ? `${name.slice(0, 25).trimEnd()}\u2026` : name;
}

function publisherHostname(value?: string) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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

function SiteHeader() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const floatingButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!navigationOpen) return;
    navigation.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const close = () => { setNavigationOpen(false); opener.current?.focus(); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (![navigation.current, menuButton.current, floatingButton.current].some((element) => element?.contains(target))) setNavigationOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const onResize = () => { if (desktop.matches) setNavigationOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [navigationOpen]);

  function toggle(button: HTMLButtonElement) {
    opener.current = button;
    setNavigationOpen((current) => !current);
  }
  function closeNavigation() {
    if (navigationOpen) opener.current?.focus();
    setNavigationOpen(false);
  }

  return <>
      <a className="skip-link" href="#main-content">Skip to news</a>
      <header className="site-header">
        <Link className="brand" to="/" onClick={closeNavigation}>
          <img className="brand-mark" src="/texas-mark.svg" width="48" height="48" alt="" />
          <span className="brand-wordmark"><strong>{siteName}</strong><small>Business. Growth. Opportunity.</small></span>
        </Link>
        <button aria-controls="site-navigation" aria-expanded={navigationOpen}
          className="nav-toggle" ref={menuButton}
          onClick={(event) => toggle(event.currentTarget)} type="button">
          {navigationOpen ? "Close menu" : "Menu"}
        </button>
        <nav aria-label="Main navigation" className={navigationOpen ? "open" : ""} id="site-navigation" ref={navigation}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next && !event.currentTarget.contains(next) && next !== menuButton.current && next !== floatingButton.current) setNavigationOpen(false);
          }}>
          <NavLink onClick={closeNavigation} to="/">Feed</NavLink>
          <NavLink onClick={closeNavigation} to="/counties">Counties</NavLink>
          <NavLink onClick={closeNavigation} to="/txse">TXSE <span className="nav-new">Exchange</span></NavLink>
          <NavLink className="nav-secondary" onClick={closeNavigation} to="/mission">Mission</NavLink>
          <NavLink onClick={closeNavigation} to="/advertise">Advertise</NavLink>
          <NavLink onClick={closeNavigation} to="/contact">Contact</NavLink>
        </nav>
      </header>
      <button className="mobile-menu-button" ref={floatingButton} type="button"
        aria-label={navigationOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={navigationOpen} aria-controls="site-navigation"
        onClick={(event) => toggle(event.currentTarget)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d={navigationOpen ? "m6 6 12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
        <span>{navigationOpen ? "Close" : "Menu"}</span>
      </button>
    </>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="brand" to="/"><img className="brand-mark" src="/texas-mark.svg" width="48" height="48" alt="" /><strong>{siteName}</strong></Link>
            <p>Good news. Great Texas possibilities.</p>
            <p className="footer-small">Independent news discovery, connecting you to original publishers across the Lone Star State.</p>
          </div>
          <AdSlot slot="footer" limit={1} />
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Statement</Link>
          <Link to="/methodology">Editorial Methodology</Link>
          <Link to="/advertising-standards">Advertising Standards</Link>
          <Link to="/accessibility">Accessibility</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <p className="footer-note">Texas Business News, LLC <span aria-hidden="true">·</span> 254 counties. One connected Texas. <span className="footer-rights">Headlines and factual metadata. Read the full story at its original source.</span></p>
      </footer>
    </>;
}

function TexasExchangePage() {
  usePageTitle("Texas Stock Exchange");
  const news = usePageNews({ counties: [], regions: [], topics: ["tx-stock-exchange"], limit: pageApiLimit });
  const [visible, setVisible] = useState(initialVisibleStories);
  const listings = [
    { symbol: "TXS", name: "Texas Capital Texas Equity Index ETF", kind: "ETF" },
    { symbol: "OILT", name: "Texas Capital Texas Oil Index ETF", kind: "ETF" },
    { symbol: "DDS", name: "Dillard’s", kind: "Company" },
    { symbol: "TCBI", name: "Texas Capital Bancshares", kind: "Company" },
    { symbol: "OBK", name: "Origin Bancorp", kind: "Company" },
    { symbol: "ET", name: "Energy Transfer", kind: "Company" },
  ];
  return <Shell>
    <section className="page-hero exchange-hero">
      <div><p className="eyebrow">Texas capital markets</p><h1>Texas Stock Exchange</h1>
        <p>Follow the companies, listings, and investment stories shaping Texas’s newest national securities exchange.</p>
        <div className="hero-actions">
          <a className="button primary" href="https://live.txse.com/outputs/live-banner-6/index.html" target="_blank" rel="noopener noreferrer">Open TXSE market display <span aria-hidden="true">↗</span></a>
          <a className="hero-text-link" href="#exchange-news">Read exchange news ↓</a>
        </div>
      </div>
      <aside className="exchange-brief" aria-label="About the TXSE market display">
        <span className="exchange-monogram">TXSE</span><h2>The exchange’s own view</h2>
        <p>TXSE’s official display includes its Total Market Index and broader market indicators. Check the display for market status, timestamps, and data delays.</p>
        <a href="https://www.txse.com/trading" target="_blank" rel="noopener noreferrer">Trading information ↗</a>
      </aside>
    </section>
    <div className="exchange-content">
      <section aria-labelledby="exchange-listings-title">
        <div className="section-heading"><a className="hero-text-link" href="https://www.txse.com/all-listings" target="_blank" rel="noopener noreferrer">All official listings ↗</a><h2 id="exchange-listings-title">A few names on TXSE</h2></div>
        <p className="exchange-note">Selected primary listings verified October 26, 2026. Open the official directory for its latest listings and published prices.</p>
        <div className="exchange-listings">{listings.map((listing) => <a key={listing.symbol} href="https://www.txse.com/all-listings" target="_blank" rel="noopener noreferrer" className="exchange-listing">
          <span className="exchange-symbol">{listing.symbol}</span><span className="exchange-kind">{listing.kind}</span><strong>{listing.name}</strong><span className="exchange-listing-link">View at TXSE ↗</span>
        </a>)}</div>
      </section>
      <nav className="exchange-resources" aria-label="Official TXSE resources">
        <a href="https://www.txse.com/symbols" target="_blank" rel="noopener noreferrer"><strong>Daily symbol directory ↗</strong><span>Symbols available for trading on the exchange.</span></a>
        <a href="https://www.txse.com/alerts-notices" target="_blank" rel="noopener noreferrer"><strong>Exchange notices ↗</strong><span>Listing announcements and operational updates.</span></a>
        <a href="https://www.txse.com/media-center" target="_blank" rel="noopener noreferrer"><strong>TXSE media center ↗</strong><span>Official announcements and exchange coverage.</span></a>
      </nav>
      <section id="exchange-news" className="exchange-news" aria-label="Texas Stock Exchange news">
        {news.loading ? <StatusCard loading title="Finding exchange news" body="Checking the latest Texas capital markets stories." /> : null}
        {news.error ? <StatusCard title="Exchange news is temporarily unavailable" body={news.error} /> : null}
        <FeedSection title="Texas Stock Exchange news" items={news.data?.statewide.items ?? noNewsItems} visibleCount={visible}
          emptyTitle="No matching exchange stories yet" emptyBody="The official TXSE resources above are available while this feed updates."
          onLoadMore={() => setVisible((count) => count + pageSize)} onFetchMore={news.loadMore} canFetchMore={news.hasMore} loadingMore={news.loadingMore} loadMoreError={news.loadMoreError} />
      </section>
    </div>
  </Shell>;
}

function TickerStack() {
  const [market, setMarket] = useState<"stocks" | "crypto">("stocks");
  return <div className="ticker-stack" aria-label="Market tickers">
    <div className="market-switch" aria-label="Choose market ticker">
      <span className="market-label">Markets</span>
      <Link className="market-exchange-link" to="/txse">TXSE <span aria-hidden="true">↗</span></Link>
      <button type="button" aria-pressed={market === "stocks"} onClick={() => setMarket("stocks")}>Stocks</button>
      <button type="button" aria-pressed={market === "crypto"} onClick={() => setMarket("crypto")}>Crypto</button>
    </div>
    <div className="ticker-view" hidden={market !== "stocks"}><MarketTicker /></div>
    <div className="ticker-view" hidden={market !== "crypto"}><CryptoTicker /></div>
  </div>;
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
          // These are vendor-supported company/commodity quotes. TXSE's own
          // market display and primary listings are linked from /txse.
          { proName: "NASDAQ:TXN", title: "Texas Instruments" },
          { proName: "NYSE:XOM", title: "Exxon Mobil" },
          { proName: "NYSE:CVX", title: "Chevron" },
          { proName: "NYSE:T", title: "AT&T" },
          { proName: "NASDAQ:TSLA", title: "Tesla" },
          { proName: "NYSE:COP", title: "ConocoPhillips" },
          { proName: "NASDAQ:FANG", title: "Diamondback" },
          { proName: "NYSE:SCHW", title: "Charles Schwab" },
          { proName: "NYSE:LUV", title: "Southwest" },
          { proName: "NYSE:DHI", title: "D.R. Horton" },
          { proName: "NYMEX:CL1!", title: "Crude Oil" },
          { proName: "NYMEX:NG1!", title: "Natural Gas" },
          { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
          { proName: "TVC:DJI", title: "Dow" },
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

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="legal-section">
      <h2>{title}</h2>
      {children}
    </article>
  );
}

/** Keeps independent county/statewide cursors so sparse sections can search older
 * periods without skipping stories in the other section. Legacy APIs still use offsets. */
function usePageNews({ counties, regions, topics, limit }: HomePageQuery) {
  const [pages, setPages] = useState<HomePageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const activeRequest = useRef(0);
  const previousRefresh = useRef(0);
  const [resolvedSelection, setResolvedSelection] = useState("");
  const pendingMore = useRef(false);

  // Depend on the selection's value, not the array's identity. The caller
  // rebuilds these arrays on render, which otherwise fired the same request
  // three times on every page load.
  const countiesKey = counties.join(",");
  const regionsKey = regions.join(",");
  const topicsKey = topics.join(",");
  const selectionKey = `${countiesKey}|${regionsKey}|${topicsKey}`;
  const selection = useMemo(
    () => ({
      counties: countiesKey ? countiesKey.split(",") : [],
      regions: regionsKey ? regionsKey.split(",") : [],
      topics: topicsKey ? topicsKey.split(",") : [],
    }),
    [countiesKey, regionsKey, topicsKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    const requestId = activeRequest.current + 1;
    activeRequest.current = requestId;
    pendingMore.current = false;
    setLoadingMore(false);
    setLoadMoreError(null);
    setLoading(true);
    setError(null);

    const forceRefresh = previousRefresh.current !== refreshVersion;
    previousRefresh.current = refreshVersion;
    fetchHomePage({ ...selection, limit }, { signal: controller.signal, forceRefresh })
      .then((response) => {
        if (activeRequest.current === requestId) {
          setPages([response]); setResolvedSelection(selectionKey);
          if (response.county?.meta.retryable || response.statewide.meta.retryable) setLoadMoreError("Some stories are temporarily unavailable. Retry below.");
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || activeRequest.current !== requestId) return;
        setError(requestError instanceof Error ? requestError.message : "News API request failed.");
      })
      .finally(() => {
        if (!controller.signal.aborted && activeRequest.current === requestId) setLoading(false);
      });

    return () => controller.abort();
  }, [limit, refreshVersion, selection, selectionKey]);

  const data = useMemo(() => resolvedSelection === selectionKey ? mergeNewsPages(pages) : null, [pages, resolvedSelection, selectionKey]);
  const hasMore = Boolean(
    pages.at(-1)?.county?.meta.hasMore || pages.at(-1)?.statewide.meta.hasMore,
  );

  const loadMore = useCallback(() => {
    if (loading || pendingMore.current || !pages.length || resolvedSelection !== selectionKey) return;
    const latest = pages.at(-1);
    if (!latest?.county?.meta.hasMore && !latest?.statewide.meta.hasMore) return;

    pendingMore.current = true;
    const requestId = activeRequest.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    const usesCursors = Boolean(latest.county?.meta.nextCursor || latest.statewide.meta.nextCursor);
    fetchHomePage({ ...selection, limit, ...(usesCursors ? {
      countyCursor: latest.county?.meta.nextCursor ?? "end",
      statewideCursor: latest.statewide.meta.nextCursor ?? "end",
    } : { offset: pages.length * limit }) })
      .then((response) => {
        if (activeRequest.current !== requestId) return;
        setPages((current) => [...current, response]);
        if (response.county?.meta.retryable || response.statewide.meta.retryable) {
          setLoadMoreError("Older stories are temporarily unavailable. Your loaded stories are saved; retry below.");
        }
      })
      .catch(() => {
        if (activeRequest.current === requestId) setLoadMoreError("Could not load older stories. Retry below to continue from the same place.");
      })
      .finally(() => {
        if (activeRequest.current === requestId) { pendingMore.current = false; setLoadingMore(false); }
      });
  }, [limit, pages, selection, loading, resolvedSelection, selectionKey]);

  const refresh = useCallback(() => setRefreshVersion((current) => current + 1), []);
  return { data, loading, loadingMore, loadMoreError, hasMore, error, refresh, loadMore };
}

/** Concatenates fetched pages into one response, dropping repeated stories. */
function mergeNewsPages(pages: readonly HomePageResponse[]): HomePageResponse | null {
  const first = pages[0];
  if (!first) return null;
  if (pages.length === 1) return first;

  const latest = pages[pages.length - 1] ?? first;
  const countySections = pages.map((page) => page.county).filter(Boolean) as FeedResponse[];

  return {
    county: countySections.length
      ? {
          ...(latest.county ?? countySections[0]),
          items: dedupeById(countySections.flatMap((section) => section.items)),
        }
      : null,
    statewide: {
      ...latest.statewide,
      items: dedupeById(pages.flatMap((page) => page.statewide.items)),
    },
    meta: latest.meta,
  };
}

function dedupeById(items: readonly NewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
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

/** Keeps a single <link rel="canonical"> in sync with the active route. */
function useCanonicalUrl() {
  const { pathname } = useLocation();

  useEffect(() => {
    const href = new URL(pathname, canonicalOrigin).toString().replace(/\/$/, "") || canonicalOrigin;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = pathname === "/" ? `${canonicalOrigin}/` : href;
  }, [pathname]);
}

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | ${siteName}`;
  }, [title]);
}

export default App;
