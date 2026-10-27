import texasNetwork from "../assets/texas-network.svg";

/** Decorative Census-boundary network; motion preferences are handled in the SVG. */
export function TexasMap() {
  return <div className="texas-map" aria-hidden="true">
    <img src={texasNetwork} width="600" height="600" alt="" decoding="async" />
  </div>;
}
