import emailjs from "@emailjs/browser";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  adAssetSpecs,
  advertiserPlacements,
  advertiserTiers,
  calculateAdvertiserPrice,
  formatAdPrice,
  placementByKey,
  type AdvertiserPlacementKey,
  type BillingCadence,
} from "../data/ad-pricing";
import { countySearchText, texasCounties } from "../data/counties";
import { AdPreviewPlaceholder, PresentedByPreview } from "./AdPreviewPlaceholder";

const maximumCreativeBytes = 10 * 1024 * 1024;

export function AdvertiserPreviewContent() {
  return (
    <>
      <section className="page-hero advertiser-hero">
        <p className="eyebrow">Advertiser preview</p>
        <h1>Reach Texans following where business is growing.</h1>
        <p>
          Preview clearly labeled placements across TexasBusiness.News, compare fixed package rates, and build a
          campaign request for counties, industries, or statewide visibility.
        </p>
        <div className="hero-actions">
          <Link className="button" to="/payments">Build a campaign request</Link>
          <a className="button ghost" href="#pricing">View pricing</a>
        </div>
      </section>

      <section className="advertiser-preview-grid" aria-labelledby="placement-preview-title">
        <div className="advertiser-section-heading">
          <p className="eyebrow">Placement preview</p>
          <h2 id="placement-preview-title">Image-forward formats that preserve the news flow.</h2>
          <p>Every paid placement is visibly separated from editorial cards and labeled as advertising or sponsorship.</p>
        </div>
        <div className="advertiser-preview-card">
          <AdPreviewPlaceholder pricingKey="advertiser-directory" />
          <div>
            <h3>Local color card</h3>
            <p>A square creative for county, region, or industry targeting.</p>
          </div>
        </div>
        <div className="advertiser-preview-card advertiser-preview-wide">
          <PresentedByPreview />
          <div>
            <h3>Exclusive section sponsorship</h3>
            <p>A compact Presented by treatment plus one local color card.</p>
          </div>
        </div>
        <div className="advertiser-preview-card advertiser-preview-wide">
          <AdPreviewPlaceholder format="banner" pricingKey="footer-banner" />
          <div>
            <h3>Texas statewide network</h3>
            <p>A responsive banner that scales within the feed without interrupting article readability.</p>
          </div>
        </div>
      </section>

      <section className="advertiser-pricing-section" id="pricing" aria-labelledby="pricing-title">
        <div className="advertiser-section-heading">
          <p className="eyebrow">Transparent pricing</p>
          <h2 id="pricing-title">Fixed packages. No population tiers.</h2>
          <p>
            Choose the placement that fits the campaign. Annual prepay provides 12 months for the price of 10, and
            eligible additional counties are available at 50% of the base package price.
          </p>
        </div>
        <div className="advertiser-tier-grid">
          {advertiserTiers.map((tier) => (
            <article className="advertiser-tier-card" key={tier.key}>
              <span>{tier.label}</span>
              <strong>{tier.monthly ? formatAdPrice(tier.monthly) : "Custom quote"}<small>{tier.monthly ? "/month" : "statewide"}</small></strong>
              <strong>{tier.annual ? formatAdPrice(tier.annual) : "Contact us"}<small>{tier.annual ? "/year" : "for pricing"}</small></strong>
              <p>{tier.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="advertiser-placement-grid" aria-label="Advertiser placement pricing">
        {advertiserPlacements.map((placement) => (
          <article className="advertiser-placement-card" key={placement.key}>
            <span className="ad-preview-availability">Placement</span>
            <h2>{placement.label}</h2>
            <strong>{placement.priceLabel}</strong>
            <p>{placement.description}</p>
          </article>
        ))}
      </section>

      <section className="advertiser-specs" aria-labelledby="creative-specs-title">
        <div>
          <p className="eyebrow">Creative delivery</p>
          <h2 id="creative-specs-title">Simple production-ready formats.</h2>
          <p>Final files are reviewed for legibility, disclosure, destination safety, and fit before activation.</p>
        </div>
        <div className="advertiser-spec-list">
          {adAssetSpecs.map((spec) => (
            <article key={spec.format}>
              <strong>{spec.format}</strong>
              <span>{spec.dimensions}</span>
              <span>{spec.fileTypes}</span>
              <small>{spec.maximumFileSize}</small>
            </article>
          ))}
        </div>
        <Link className="button" to="/payments">Start a reservation</Link>
      </section>
    </>
  );
}

export function AdvertiserOrderContent() {
  const [placement, setPlacement] = useState<AdvertiserPlacementKey>("feed-articles");
  const [billing, setBilling] = useState<BillingCadence>("monthly");
  const [countyQuery, setCountyQuery] = useState("");
  const [selectedCounties, setSelectedCounties] = useState<string[]>([]);
  const [creativeName, setCreativeName] = useState("");
  const [creativeError, setCreativeError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const matchingCounties = useMemo(() => {
    const query = countyQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return texasCounties
      .filter((county) => countySearchText(county).toLowerCase().includes(query))
      .filter((county) => !selectedCounties.includes(county.slug))
      .slice(0, 8);
  }, [countyQuery, selectedCounties]);

  const pricing = useMemo(
    () => calculateAdvertiserPrice(placement, billing, selectedCounties.length),
    [billing, placement, selectedCounties],
  );

  const selectedCountyDetails = selectedCounties
    .map((countySlug) => texasCounties.find((county) => county.slug === countySlug))
    .filter(Boolean);
  const selectedPlacement = placementByKey(placement);
  const requiresCounties = selectedPlacement.countyTargeted;
  const canSubmit = !requiresCounties || selectedCounties.length > 0;

  function addCounty(countySlug: string) {
    setSelectedCounties((current) => [...current, countySlug]);
    setCountyQuery("");
  }

  function removeCounty(countySlug: string) {
    setSelectedCounties((current) => current.filter((slug) => slug !== countySlug));
  }

  function handleCreativeChange(file?: File) {
    setCreativeError("");
    setCreativeName("");
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setCreativeError("Creative must be a JPG or PNG file.");
      return;
    }
    if (file.size > maximumCreativeBytes) {
      setCreativeError("Creative must be 10 MB or smaller.");
      return;
    }
    setCreativeName(file.name);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || creativeError) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const businessName = String(data.get("businessName") || "").trim();
    const contactName = String(data.get("contactName") || "").trim();
    const email = String(data.get("email") || "").trim();
    const website = String(data.get("website") || "").trim();
    const notes = String(data.get("notes") || "").trim();
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setStatus("error");
      setStatusMessage("Campaign requests are not configured yet. Please email admin@texasbusiness.news.");
      return;
    }

    const placementLabel = selectedPlacement.label;
    const countySummary =
      selectedCountyDetails.length
        ? selectedCountyDetails.map((county) => county?.displayName || "Unknown county").join(", ")
        : "No county targeting requested";
    const estimatedTotal = pricing.isQuoteOnly ? "Custom quote required" : formatAdPrice(pricing.due);
    const message = [
      `Advertiser campaign request for ${businessName}`,
      `Placement: ${placementLabel}`,
      `Billing: ${billing}`,
      `Targeting: ${countySummary}`,
      `Base package rate: ${pricing.isQuoteOnly ? "Custom quote" : formatAdPrice(pricing.base)}`,
      `Estimated amount due: ${estimatedTotal}`,
      `Website: ${website || "Not provided"}`,
      `Creative selected locally: ${creativeName || "Not provided; follow-up required"}`,
      `Campaign notes: ${notes || "None"}`,
      "Stripe checkout is not connected. No payment was collected.",
    ].join("\n");

    setStatus("submitting");
    setStatusMessage("");

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: "admin@texasbusiness.news",
          from_name: `${contactName} — ${businessName}`,
          reply_to: email,
          message,
          submission_type: "advertiser_campaign_request",
          business_name: businessName,
          placement: placementLabel,
          billing,
          targeting: countySummary,
          estimated_total: estimatedTotal,
          creative_name: creativeName,
        },
        { publicKey },
      );
      setStatus("success");
      setStatusMessage("Campaign request sent for review. No payment has been collected.");
    } catch {
      setStatus("error");
      setStatusMessage("Campaign request failed to send. Please email admin@texasbusiness.news.");
    }
  }

  return (
    <>
      <section className="page-hero advertiser-hero">
        <p className="eyebrow">Rates and reservation</p>
        <h1>Build a Texas advertising request.</h1>
        <p>
          Configure a preview quote and submit it for review. Stripe checkout is intentionally not connected on this
          branch, so no card details are requested and no payment will be taken.
        </p>
        <div className="hero-actions">
          <Link className="button ghost" to="/advertise">View placement previews</Link>
        </div>
      </section>

      <section className="advertiser-order-layout">
        <form className="advertiser-order-form" onSubmit={handleSubmit}>
          <div className="advertiser-form-section">
            <span className="form-step">1</span>
            <div>
              <h2>Choose placement and billing</h2>
              <p>Annual campaigns receive 12 months for the price of 10.</p>
            </div>
          </div>
          <div className="checkout-options">
            <label>
              <span>Placement</span>
              <select value={placement} onChange={(event) => setPlacement(event.target.value as AdvertiserPlacementKey)}>
                {advertiserPlacements.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Billing</span>
              <select value={billing} onChange={(event) => setBilling(event.target.value as BillingCadence)}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual — 12 months for the price of 10</option>
              </select>
            </label>
          </div>

          {requiresCounties ? (
            <>
              <div className="advertiser-form-section">
                <span className="form-step">2</span>
                <div>
                  <h2>Select Texas counties</h2>
                  <p>The first county uses the fixed package rate. Eligible additional counties are quoted at 50% of that rate.</p>
                </div>
              </div>
              <label>
                <span>Find a county</span>
                <input
                  autoComplete="off"
                  onChange={(event) => setCountyQuery(event.target.value)}
                  placeholder="Search Texas counties, cities, metros, or regions"
                  type="search"
                  value={countyQuery}
                />
              </label>
              {matchingCounties.length ? (
                <div className="county-search-results" aria-label="Matching counties">
                  {matchingCounties.map((county) => (
                    <button key={county.slug} onClick={() => addCounty(county.slug)} type="button">
                      <strong>{county.displayName}</strong>
                      <span>{county.metro || county.region}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="checkout-counties">
                {selectedCountyDetails.map((county) => (
                  <article key={county?.slug}>
                    <div>
                      <strong>{county?.displayName}</strong>
                      <span>{county?.metro || county?.region}</span>
                    </div>
                    <button aria-label={`Remove ${county?.displayName}`} onClick={() => removeCounty(county?.slug || "")} type="button">Remove</button>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          <div className="advertiser-form-section">
            <span className="form-step">{requiresCounties ? "3" : "2"}</span>
            <div>
              <h2>Advertiser details</h2>
              <p>Creative files are validated locally for preview only and are not uploaded until secure checkout is implemented.</p>
            </div>
          </div>
          <div className="checkout-options">
            <label>
              <span>Business name</span>
              <input maxLength={120} name="businessName" required type="text" />
            </label>
            <label>
              <span>Contact name</span>
              <input maxLength={120} name="contactName" required type="text" />
            </label>
            <label>
              <span>Contact email</span>
              <input name="email" required type="email" />
            </label>
            <label>
              <span>Destination website</span>
              <input name="website" placeholder="https://" type="url" />
            </label>
          </div>
          <label>
            <span>Creative file — optional for initial request</span>
            <input
              accept="image/jpeg,image/png"
              aria-describedby="creative-help"
              onChange={(event) => handleCreativeChange(event.target.files?.[0])}
              type="file"
            />
          </label>
          <small id="creative-help">JPG or PNG, up to 10 MB. Recommended delivery sizes: 250×250 or 980×300.</small>
          {creativeName ? <p className="form-status success">Ready for preview: {creativeName}</p> : null}
          {creativeError ? <p className="form-status error">{creativeError}</p> : null}
          <label>
            <span>Campaign notes</span>
            <textarea name="notes" placeholder="Timing, regions, industries, or other campaign goals" rows={5} />
          </label>
          <button className="button" disabled={!canSubmit || status === "submitting" || Boolean(creativeError)} type="submit">
            {status === "submitting" ? "Sending request..." : "Submit campaign request"}
          </button>
          {statusMessage ? <p className={`form-status ${status}`}>{statusMessage}</p> : null}
        </form>

        <aside className="checkout-summary" aria-label="Campaign estimate">
          <p className="eyebrow">Preview estimate</p>
          <h2>{pricing.isQuoteOnly ? "Custom" : formatAdPrice(pricing.due)}</h2>
          <p>{pricing.isQuoteOnly ? "Statewide quote required" : billing === "annual" ? "Estimated annual total" : "Estimated first monthly payment"}</p>
          <dl>
            <div><dt>Base package</dt><dd>{pricing.isQuoteOnly ? "Quote" : formatAdPrice(pricing.base)}</dd></div>
            <div><dt>Billing</dt><dd>{billing === "annual" ? "12 months for 10" : "Monthly"}</dd></div>
            <div><dt>Counties</dt><dd>{requiresCounties ? selectedCounties.length : "Not required"}</dd></div>
          </dl>
          <p className="checkout-note">
            Eligible additional counties are priced at 50% of the fixed base package. Final targeting and adjacency are confirmed during review.
          </p>
          <button className="button checkout-disabled" disabled type="button">Stripe checkout coming soon</button>
          <small>No payment information is collected on this preview branch.</small>
        </aside>
      </section>
    </>
  );
}
