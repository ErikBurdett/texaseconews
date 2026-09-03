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

export const siteOperatorName = "Texas Business News, LLC";

export type AdDisclosureCopy = {
  /** Visible advertiser identification beneath the standing "Advertisement" label. */
  label: string;
  /** Accessible name for the whole placement. */
  accessibleName: string;
};

/**
 * Builds the disclosure copy for a placement.
 *
 * An ordinary advertisement says so and names the advertiser; nothing more is
 * claimed about the arrangement, because the form of the consideration is not
 * something a reader needs and stating it wrongly is how the old "Paid sponsor"
 * label went wrong. A house placement is the exception: common ownership is a
 * material connection and has to appear in the label itself.
 */
export function adDisclosureCopy(ad: AdCreative, isExternal: boolean): AdDisclosureCopy {
  const opensInNewTab = isExternal ? " (opens in a new tab)" : "";

  if (ad.disclosure === "house") {
    const destination = destinationLabel(ad.href);
    const identity = destination && destination !== ad.sponsor
      ? `${ad.sponsor} (${destination})`
      : ad.sponsor;
    return {
      label: `House ad: ${identity} — owned by the operator of ${siteName}`,
      accessibleName:
        `House advertisement for ${identity}, a business owned by ${siteOperatorName}, ` +
        `the operator of ${siteName}${opensInNewTab}`,
    };
  }

  return {
    label: ad.sponsor,
    accessibleName: `Advertisement for ${ad.sponsor}${opensInNewTab}`,
  };
}

const siteName = "TexasBusiness.News";

function destinationLabel(href: string) {
  try {
    return new URL(href, "https://texasbusiness.news").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function trackAdEvent(eventName: "ad_impression" | "ad_click", ad: AdCreative, slot: AdSlotId) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ad_id: ad.id,
    campaign_id: ad.campaignId,
    sponsor: ad.sponsor,
    slot,
    measurement: "page-memory-only",
  });
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}
