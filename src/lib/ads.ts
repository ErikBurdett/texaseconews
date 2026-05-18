import { ads, type AdCreative, type AdSlotId } from "../data/ads";
import type { TexasCounty } from "../data/counties";

export type AdContext = {
  slot: AdSlotId;
  county?: TexasCounty;
  topics?: string[];
  limit?: number;
  catalog?: AdCreative[];
};

export function resolveAds({ slot, county, topics = [], limit = 1, catalog = ads }: AdContext) {
  return catalog
    .filter((ad) => {
      if (!ad.active || !ad.targeting.slots.includes(slot)) return false;
      if (ad.targeting.countySlugs?.length && (!county || !ad.targeting.countySlugs.includes(county.slug))) return false;
      if (ad.targeting.regions?.length && (!county || !ad.targeting.regions.includes(county.region))) return false;
      if (ad.targeting.topics?.length && !ad.targeting.topics.some((topic) => topics.includes(topic))) return false;
      return true;
    })
    .sort((first, second) => second.priority - first.priority || first.id.localeCompare(second.id))
    .slice(0, limit);
}

export function trackAdEvent(eventName: "ad_impression" | "ad_click", ad: AdCreative, slot: AdSlotId, county?: TexasCounty) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ad_id: ad.id,
    campaign_id: ad.campaignId,
    sponsor: ad.sponsor,
    slot,
    county: county?.slug,
    region: county?.region,
  });
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}
