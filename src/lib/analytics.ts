export const googleMeasurementId = "G-1B4J1YS4JK";

/** Same Google tag initialization as the install snippet, without inline JS. */
export function initializeAnalytics() {
  if (document.getElementById("google-analytics-tag")) return;
  window.dataLayer = window.dataLayer || [];
  // Google's command queue expects Arguments objects, not rest-parameter arrays.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = window.gtag || function () { window.dataLayer?.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", googleMeasurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.id = "google-analytics-tag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${googleMeasurementId}`;
  document.head.appendChild(script);
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
