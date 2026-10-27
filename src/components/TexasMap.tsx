import { texasCountyCentroidsByFips } from "../data/texas-county-centroids";

const project = (lat: number, lon: number) => [(lon + 107) * 29 + 24, (37 - lat) * 34 + 10];
// A decorative geographic network, not a representation of live traffic or coverage.
// Density follows the major population centers; county dots retain the state silhouette.
const centers = [
  { lat: 35.22, lon: -101.83, nodes: 12, radius: 10 }, // Amarillo
  { lat: 33.58, lon: -101.85, nodes: 15, radius: 12 }, // Lubbock
  { lat: 31.76, lon: -106.48, nodes: 21, radius: 9 }, // El Paso
  { lat: 31.99, lon: -102.08, nodes: 15, radius: 12 }, // Midland–Odessa
  { lat: 32.78, lon: -96.8, nodes: 58, radius: 25 }, // Dallas–Fort Worth
  { lat: 31.55, lon: -97.15, nodes: 12, radius: 10 }, // Waco
  { lat: 30.27, lon: -97.74, nodes: 36, radius: 18 }, // Austin
  { lat: 29.76, lon: -95.37, nodes: 54, radius: 24 }, // Houston
  { lat: 29.42, lon: -98.49, nodes: 33, radius: 18 }, // San Antonio
  { lat: 27.8, lon: -97.4, nodes: 15, radius: 9 }, // Corpus Christi
  { lat: 27.5, lon: -99.51, nodes: 12, radius: 7 }, // Laredo
  { lat: 26.2, lon: -98.23, nodes: 24, radius: 10 }, // Rio Grande Valley
  { lat: 32.35, lon: -95.3, nodes: 12, radius: 10 }, // Tyler
  { lat: 30.08, lon: -94.13, nodes: 12, radius: 9 }, // Beaumont
  { lat: 32.45, lon: -99.73, nodes: 10, radius: 9 }, // Abilene
  { lat: 33.91, lon: -98.49, nodes: 10, radius: 8 }, // Wichita Falls
].map((center) => ({ ...center, point: project(center.lat, center.lon) }));
const links = [
  [0, 1], [0, 15], [1, 3], [1, 14], [2, 3], [2, 8], [3, 14], [3, 8],
  [14, 4], [15, 4], [4, 5], [4, 6], [4, 7], [4, 12], [5, 6], [6, 7],
  [6, 8], [7, 8], [7, 9], [7, 13], [12, 13], [8, 9], [8, 10], [9, 11], [10, 11],
];
const satellites = centers.flatMap(({ point: [x, y], nodes, radius }, center) =>
  Array.from({ length: nodes }, (_, index) => {
    // Golden-angle spacing produces stable, evenly distributed clusters without randomness.
    const angle = index * 2.399963 + center;
    const distance = radius * Math.sqrt((index + 1) / nodes);
    return { x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance * .8, center, index };
  }),
);

export function TexasMap() {
  return <div className="texas-map" aria-hidden="true">
    <svg viewBox="0 0 440 440" fill="none">
      <defs>
        <radialGradient id="map-light"><stop stopColor="#448aff" stopOpacity=".2" /><stop offset="1" stopColor="#448aff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="245" cy="225" r="200" fill="url(#map-light)" />
      <circle cx="230" cy="205" r="175" className="map-orbit" />
      <circle cx="230" cy="205" r="125" className="map-orbit" />
      <path d="M20 205H430M230 15V420" className="map-guide" />
      {Object.entries(texasCountyCentroidsByFips).map(([fips, [lat, lon]]) => {
        const [cx, cy] = project(lat, lon);
        return <circle key={fips} cx={cx} cy={cy} r="1.8" className="county-dot" />;
      })}
      {links.map(([from, to], index) => {
        const [x1, y1] = centers[from].point;
        const [x2, y2] = centers[to].point;
        const d = `M${x1} ${y1} Q${(x1 + x2) / 2 + (y2 - y1) * .13} ${(y1 + y2) / 2 - (x2 - x1) * .13} ${x2} ${y2}`;
        return <g key={`${from}-${to}`} className={index % 3 === 0 ? "network-link network-link-red" : "network-link"}>
          <path d={d} className="network-track" />
          <path d={d} pathLength="100" className="network-beam" style={{ animationDelay: `${-index * .73}s`, animationDuration: `${5 + index % 4}s` }} />
        </g>;
      })}
      {satellites.map(({ x, y, center, index }) => <circle key={`${center}-${index}`} cx={x} cy={y} r={index % 5 === 0 ? 1.5 : 1} className="population-dot" />)}
      {centers.map(({ point: [cx, cy] }, index) => <g key={index}>
        <circle cx={cx} cy={cy} r="9" className="city-halo" style={{ animationDelay: `${-index * .4}s` }} />
        <circle cx={cx} cy={cy} r="2.5" className="city-dot" />
      </g>)}
      <path d="m172 190 2 5.8h6.1l-4.9 3.6 1.9 5.8-5.1-3.6-5 3.6 1.9-5.8-5-3.6h6.2Z" className="map-star" />
    </svg>
  </div>;
}
