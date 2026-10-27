import { texasCountyCentroidsByFips } from "../data/texas-county-centroids";

const project = (lat: number, lon: number) => [(lon + 107) * 29 + 24, (37 - lat) * 34 + 10];
const cities = [
  { name: "Amarillo", lat: 35.22, lon: -101.83 },
  { name: "Dallas", lat: 32.78, lon: -96.8 },
  { name: "Austin", lat: 30.27, lon: -97.74 },
  { name: "Houston", lat: 29.76, lon: -95.37 },
  { name: "San Antonio", lat: 29.42, lon: -98.49 },
];

export function TexasMap() {
  return <div className="texas-map" aria-hidden="true">
    <svg viewBox="0 0 440 440" fill="none">
      <circle cx="230" cy="205" r="175" className="map-orbit" />
      <circle cx="230" cy="205" r="125" className="map-orbit" />
      <path d="M20 205H430M230 15V420" className="map-guide" />
      {Object.entries(texasCountyCentroidsByFips).map(([fips, [lat, lon]]) => {
        const [cx, cy] = project(lat, lon);
        return <circle key={fips} cx={cx} cy={cy} r="2.7" className="county-dot" />;
      })}
      {cities.map((city) => {
        const [cx, cy] = project(city.lat, city.lon);
        return <g key={city.name}>
          <circle cx={cx} cy={cy} r="10" className="city-halo" />
          <circle cx={cx} cy={cy} r="3.5" className="city-dot" />
          <text x={cx + 13} y={cy - 7}>{city.name}</text>
        </g>;
      })}
      <text x="30" y="409" className="map-caption">ONE STATE. A WORLD OF OPPORTUNITY.</text>
    </svg>
  </div>;
}
