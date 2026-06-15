import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import type { AdSlotId } from "../data/ads";
import type { TexasCounty } from "../data/counties";
import { resolveAds, trackAdEvent } from "../lib/ads";

export function AdSlot({ slot, county, topics, limit = 1 }: { slot: AdSlotId; county?: TexasCounty; topics?: string[]; limit?: number }) {
  const ads = useMemo(() => resolveAds({ slot, county, topics, limit }), [county, limit, slot, topics]);

  if (!ads.length) return null;

  return (
    <aside className={`ad-slot ad-slot-${slot}`} aria-label="Sponsored economic opportunity">
      {ads.map((ad) => (
        <AdCard ad={ad} county={county} key={ad.id} slot={slot} />
      ))}
    </aside>
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
          trackAdEvent("ad_impression", ad, slot, county);
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
      {ad.imageUrl ? <img className="ad-image" src={ad.imageUrl} alt="" loading="lazy" /> : null}
      <span className="ad-label">Sponsored by {ad.sponsor}</span>
      <strong>{ad.title}</strong>
      <span>{ad.body}</span>
      <em>{ad.cta}</em>
    </>
  );

  if (isExternal) {
    return (
      <a className={`ad-card ad-card-${ad.placement}`} href={ad.href} onClick={() => trackAdEvent("ad_click", ad, slot, county)} ref={ref} rel="noopener noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link className={`ad-card ad-card-${ad.placement}`} onClick={() => trackAdEvent("ad_click", ad, slot, county)} ref={ref} to={ad.href}>
      {content}
    </Link>
  );
}
