/// <reference types="vite/client" />

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
