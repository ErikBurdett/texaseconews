# Texas network illustration

`texas-boundary.json` contains only Texas's boundary rings extracted from
[us-atlas 3.0.1 states-10m.json](https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json).
US Atlas redistributes the U.S. Census Bureau's 2017 cartographic boundaries;
its ISC license is included as `us-atlas-LICENSE`.

Run `python3 scripts/generate-texas-network.py` from the repository to regenerate
`src/assets/texas-network.svg`. The generator uses Python's standard library,
a fixed random seed, a local equirectangular projection, and a Delaunay mesh.
It clips points to Texas and rejects links that cross outside the boundary.
The SVG also clips the mesh and moving highlights to the state border.

The metropolitan density is a decorative illustration, not population counts,
source availability, or live news traffic. It ships as a cacheable SVG image, with no map library or mesh calculation in
the browser. Its own reduced-motion media query disables the moving highlights.
