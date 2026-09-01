/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEWS_API_URL?: string;
  readonly VITE_ENABLE_RSS_FALLBACK?: string;
  readonly VITE_RSS_PROVIDER_URL?: string;
  readonly VITE_RSS_RAW_PROXY_URL?: string;
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  readonly VITE_EMAILJS_TEMPLATE_ID?: string;
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.PNG" {
  const src: string;
  export default src;
}

declare module "@nickgraffis/us-counties" {
  export type UsCountyRecord = {
    FIPS: string;
    name: string;
    state: string;
  };

  export function getCountyByState(state: string): UsCountyRecord[];
}
