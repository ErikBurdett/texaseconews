import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import type { AdSlotId } from "../data/ads";
import type { TexasCounty } from "../data/counties";
import { resolveAds, trackAdEvent } from "../lib/ads";

export function AdSlot({ slot, county, topics, limit = 1 }: { slot: AdSlotId; county?: TexasCounty; topics?: string[]; limit?: number }) {
  const ads = useMemo(() => resolveAds({ slot, county, topics, limit }), [county, limit, slot, topics]);

  if (!ads.length) return null;

  return (
    <aside className={`ad-slot ad-slot-${slot}`} aria-label="Advertisement" data-ad-placement={slot}>
      {ads.map((ad) => (
        <AdCard ad={ad} county={county} key={ad.id} slot={slot} />
      ))}
    </aside>
  );
}

export function SponsorBadge() {
  const ad = useMemo(() => resolveAds({ slot: "sidebar", limit: 1 })[0], []);
  const ref = useRef<HTMLAnchorElement | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!ad || !element || tracked.current || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          tracked.current = true;
          trackAdEvent("ad_impression", ad, "sidebar");
          observer.disconnect();
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ad]);

  if (!ad) return null;

  const content = (
    <>
      {ad.imageUrl ? <img alt="" className="sponsor-badge-logo" decoding="async" height="1024" src={ad.imageUrl} width="1024" /> : null}
      <span className="ad-disclosure">Advertisement</span>
      <span>Paid sponsor: <strong>{ad.sponsor}</strong></span>
    </>
  );
  const className = "sponsor-badge";
  const onClick = () => trackAdEvent("ad_click", ad, "sidebar");

  if (/^https?:\/\//i.test(ad.href)) {
    return (
      <a aria-label={`Advertisement paid for by ${ad.sponsor} (opens in a new tab)`} className={className} href={ad.href} onClick={onClick} ref={ref} referrerPolicy="strict-origin-when-cross-origin" rel="sponsored nofollow noopener noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link aria-label={`Advertisement paid for by ${ad.sponsor}`} className={className} onClick={onClick} ref={ref} to={ad.href}>
      {content}
    </Link>
  );
}

function AdCard({ ad, slot, county }: { ad: ReturnType<typeof resolveAds>[number]; slot: AdSlotId; county?: TexasCounty }) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const tracked = useRef(false);
  const isExternal = /^https?:\/\//i.test(ad.href);

  useEffect(() => {
    const element = ref.current;
    if (!element || tracked.current || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          tracked.current = true;
          trackAdEvent("ad_impression", ad, slot);
          observer.disconnect();
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ad, county, slot]);

  const content = (
    <>
      {ad.imageUrl ? <img className="ad-image" src={ad.imageUrl} alt="" decoding="async" fetchPriority="low" height="1024" loading="lazy" width="1024" /> : null}
      <span className="ad-disclosure">Advertisement</span>
      <span className="ad-label">Paid sponsor: {ad.sponsor}</span>
      <strong>{ad.title}</strong>
      <span>{ad.body}</span>
      <em>{ad.cta}</em>
    </>
  );

  if (isExternal) {
    return (
      <a aria-label={`Advertisement paid for by ${ad.sponsor}: ${ad.title} (opens in a new tab)`} className={`ad-card ad-card-${ad.placement}`} href={ad.href} onClick={() => trackAdEvent("ad_click", ad, slot)} ref={ref} referrerPolicy="strict-origin-when-cross-origin" rel="sponsored nofollow noopener noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link className={`ad-card ad-card-${ad.placement}`} onClick={() => trackAdEvent("ad_click", ad, slot)} ref={ref} to={ad.href}>
      {content}
    </Link>
  );
}
