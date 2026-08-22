import { Link } from "react-router-dom";
import { advertiserPlacements, type AdvertiserPlacementKey } from "../data/ad-pricing";

export function AdPreviewPlaceholder({
  pricingKey,
  format = "card",
  label,
}: {
  pricingKey: AdvertiserPlacementKey;
  format?: "card" | "banner" | "feed" | "presented-by";
  label?: string;
}) {
  const placement = advertiserPlacements.find((candidate) => candidate.key === pricingKey);
  if (!placement) return null;

  return (
    <Link
      aria-label={`Advertise in this ${label || placement.label} placement`}
      className={`ad-preview-placeholder ad-preview-${format}`}
      to="/advertise"
    >
      <span className="ad-preview-availability">Advertising space available</span>
      <strong>{label || placement.label}</strong>
      <span>{format === "banner" ? "Responsive 980×300 creative" : format === "feed" ? "Responsive slot · 250×250 creative" : "250×250 creative"}</span>
      <em>{placement.priceLabel}</em>
      <span className="ad-preview-action">Preview rates and reserve →</span>
    </Link>
  );
}

export function PresentedByPreview({ label = "Section sponsorship preview" }: { label?: string }) {
  return (
    <div className="presented-by-preview">
      <span>Presented by</span>
      <AdPreviewPlaceholder format="presented-by" label={label} pricingKey="county-hero-sponsor" />
    </div>
  );
}
