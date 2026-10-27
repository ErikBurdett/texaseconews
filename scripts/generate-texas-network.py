"""Generate a decorative, clipped Texas network; no runtime GIS dependency.

Boundary: us-atlas 3.0.1, Census Bureau 2017 cartographic boundaries.
Source and ISC license are preserved in map-data/. Run with Python 3 stdlib.
Population-center density is illustrative, not a live coverage/traffic metric.
"""
from pathlib import Path
import heapq
import json
import math
import random

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT / 'scripts/map-data/texas-boundary.json').read_text())
# Local equirectangular projection keeps the Panhandle upright and preserves
# Texas's aspect ratio at its central latitude; all geometry shares this frame.
cos_lat = math.cos(math.radians(31))
raw = [[(lon * cos_lat, -lat) for lon, lat in ring] for ring in source['rings']]
xs, ys = zip(*(p for ring in raw for p in ring))
scale = min(544 / (max(xs) - min(xs)), 544 / (max(ys) - min(ys)))
ox = (600 - (max(xs) - min(xs)) * scale) / 2
oy = (600 - (max(ys) - min(ys)) * scale) / 2

def project(lon, lat):
    return ((lon * cos_lat - min(xs)) * scale + ox, (-lat - min(ys)) * scale + oy)

rings = [[project(lon, lat) for lon, lat in ring] for ring in source['rings']]
ring = max(rings, key=len)

def inside(p):
    x, y = p
    result = False
    for (ax, ay), (bx, by) in zip(ring, ring[1:] + ring[:1]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            result = not result
    return result

def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])

rng = random.Random(481826)
points = []
# Border points follow the actual outline, at even arc-length intervals.
remaining = 0
for a, b in zip(ring, ring[1:] + ring[:1]):
    length = distance(a, b)
    if length < 1e-8:
        continue
    while remaining <= length:
        t = remaining / length
        p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        if all(distance(p, q) > 5.5 for q in points):
            points.append(p)
        remaining += 11
    remaining -= length
border_count = len(points)

# Broad statewide mesh with denser, smoothly blended metropolitan neighborhoods.
centers = [
    (-101.83, 35.22, 18, 24), (-101.85, 33.58, 18, 22),
    (-106.48, 31.76, 22, 17), (-102.08, 31.99, 18, 24),
    (-96.8, 32.78, 80, 43), (-97.33, 32.75, 44, 30),
    (-97.15, 31.55, 18, 23), (-97.74, 30.27, 50, 34),
    (-95.37, 29.76, 75, 42), (-98.49, 29.42, 50, 34),
    (-97.4, 27.8, 22, 20), (-99.51, 27.5, 18, 16),
    (-98.23, 26.2, 28, 25), (-95.3, 32.35, 18, 23),
    (-94.13, 30.08, 18, 20), (-99.73, 32.45, 14, 20),
]
metro = [(project(lon, lat), weight, radius) for lon, lat, weight, radius in centers]

def add(p, spacing):
    if inside(p) and all(distance(p, q) >= spacing for q in points):
        points.append(p)
        return True
    return False

for _ in range(20000):
    if len(points) >= border_count + 335:
        break
    add((rng.uniform(28, 572), rng.uniform(28, 572)), 11)
for _ in range(20000):
    if len(points) >= 760:
        break
    (cx, cy), _, radius = rng.choices(metro, weights=[m[1] for m in metro])[0]
    add((rng.gauss(cx, radius * .65), rng.gauss(cy, radius * .65)), 5.8)

# Bowyer-Watson Delaunay triangulation, calculated once during generation.
# Sharing edges produces a continuous fine mesh instead of overlapping hub spokes.
def circumcircle(tri):
    (ax, ay), (bx, by), (cx, cy) = (vertices[i] for i in tri)
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-9:
        return None
    a, b, c = ax * ax + ay * ay, bx * bx + by * by, cx * cx + cy * cy
    x = (a * (by - cy) + b * (cy - ay) + c * (ay - by)) / d
    y = (a * (cx - bx) + b * (ax - cx) + c * (bx - ax)) / d
    return x, y, (x - ax) ** 2 + (y - ay) ** 2

n = len(points)
vertices = points + [(-2000, -1000), (2600, -1000), (300, 2600)]
initial = (n, n + 1, n + 2)
triangles = {initial: circumcircle(initial)}
for i, (x, y) in enumerate(points):
    bad = [t for t, (cx, cy, r) in triangles.items() if (x - cx) ** 2 + (y - cy) ** 2 < r + 1e-7]
    boundary = {}
    for tri in bad:
        for a, b in zip(tri, tri[1:] + tri[:1]):
            edge = tuple(sorted((a, b)))
            boundary[edge] = boundary.get(edge, 0) + 1
        del triangles[tri]
    for (a, b), count in boundary.items():
        if count == 1:
            tri = (a, b, i)
            circle = circumcircle(tri)
            if circle:
                triangles[tri] = circle
edges = set()
for tri in triangles:
    if max(tri) >= n:
        continue
    for a, b in zip(tri, tri[1:] + tri[:1]):
        p, q = points[a], points[b]
        if distance(p, q) < 62 and all(inside((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)) for t in [.25, .5, .75]):
            edges.add(tuple(sorted((a, b))))

# A handful of pulses travel along existing mesh edges, without adding spokes.
adjacency = [[] for _ in points]
for a, b in sorted(edges):
    adjacency[a].append((b, distance(points[a], points[b])))
    adjacency[b].append((a, distance(points[a], points[b])))

def nearest(p):
    return min(range(n), key=lambda i: distance(points[i], p))

def route(start, end):
    start, end = nearest(metro[start][0]), nearest(metro[end][0])
    queue, seen = [(0, start, [start])], set()
    while queue:
        cost, node, path = heapq.heappop(queue)
        if node == end:
            return path
        if node in seen:
            continue
        seen.add(node)
        for other, length in adjacency[node]:
            if other not in seen:
                heapq.heappush(queue, (cost + length, other, path + [other]))
    raise ValueError('Disconnected metropolitan route')

def svg_path(coords, close=False):
    return ''.join(f'{"M" if i == 0 else "L"}{x:.1f},{y:.1f}' for i, (x, y) in enumerate(coords)) + ('Z' if close else '')

mesh = ['', '', '']
for i, (a, b) in enumerate(sorted(edges)):
    group = 2 if i % 13 == 0 else 1 if i % 4 == 0 else 0
    mesh[group] += svg_path([points[a], points[b]])
pulses = [svg_path([points[i] for i in route(a, b)]) for a, b in [(0, 1), (2, 3), (3, 5), (4, 8), (4, 7), (7, 9), (8, 14), (9, 10), (10, 12), (11, 12), (5, 13), (1, 15)]]
assert len(points) == 760
assert all(inside(p) for p in points[border_count:])
assert len(edges) > 1800
outline = ''.join(svg_path(r, True) for r in rings)
styles = """
.border-fill { fill: #102851; fill-opacity: .18; }
.border { stroke: #a5bde7; stroke-width: .7; stroke-opacity: .6; stroke-linejoin: round; }
.mesh { stroke-linejoin: round; stroke-linecap: round; stroke-width: .65; }
.mesh-0 { stroke: #97b8ef; stroke-opacity: .36; }
.mesh-1 { stroke: #e0eaff; stroke-opacity: .58; }
.mesh-2 { stroke: #df3153; stroke-opacity: .8; stroke-width: .8; }
.node { fill: #9dbcef; }
.node-white { fill: #ffffff; }
.node-red { fill: #f04464; }
.network-beam { stroke: #ffffff; stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 3 97; animation: flow 9s linear infinite; }
.beam-red { stroke: #ff486c; }
@keyframes flow { from { stroke-dashoffset: 100; } to { stroke-dashoffset: -100; } }
@media (prefers-reduced-motion: reduce) { .network-beam { animation: none; } }
"""
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" fill="none">',
       '<!-- Generated by scripts/generate-texas-network.py. Census / us-atlas 3.0.1 boundary; ISC license in scripts/map-data. Decorative network, not live traffic. -->',
       f'<style>{styles}</style><defs><clipPath id="texas"><path d="{outline}"/></clipPath></defs>',
       f'<path d="{outline}" class="border-fill"/><g clip-path="url(#texas)">']
for i, d in enumerate(mesh):
    svg.append(f'<path d="{d}" class="mesh mesh-{i}"/>')
for i, d in enumerate(pulses):
    cls = 'network-beam beam-red' if i % 3 == 0 else 'network-beam'
    svg.append(f'<path d="{d}" pathLength="100" class="{cls}" style="animation-delay:{-i * 1.7:.1f}s;animation-duration:{7 + i % 5}s"/>')
svg.append(f'</g><path d="{outline}" class="border"/>')
for i, (x, y) in enumerate(points):
    radius = 1.7 if i % 11 == 0 else 1.25 if i % 3 == 0 else .95
    cls = 'node node-red' if i % 7 == 0 else 'node node-white' if i % 3 == 0 else 'node'
    svg.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius}" class="{cls}"/>')
svg.append('</svg>')
(ROOT / 'src/assets/texas-network.svg').write_text(''.join(svg) + '\n')
print(f'Generated {len(points)} nodes, {len(edges)} edges, {len(pulses)} routed pulses; {len(ring)} boundary vertices.')
