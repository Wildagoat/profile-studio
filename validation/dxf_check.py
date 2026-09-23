"""Audit the DXFs written by validation/dxf.js with ezdxf and measure how closely the exported splines match
the app's own curves. Checks: file loads + audit has no errors, the profile layer forms a closed loop
(endpoints chain up), and the max distance from dense spline samples to the app's polyline (and back)."""
import json, math, glob, os
import ezdxf
from ezdxf.math import BSpline

OUT = os.path.join(os.path.dirname(__file__), 'out')
upper = json.load(open(os.path.join(OUT, 'dxf_upper.json')))


def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy)


def poly_dist(p, pts):
    return min(seg_dist(p, pts[i], pts[i + 1]) for i in range(len(pts) - 1))


for f in sorted(glob.glob(os.path.join(OUT, 'dxf_*.dxf'))):
    name = os.path.basename(f)[4:-4]
    case, mode = name.rsplit('_', 1)
    doc = ezdxf.readfile(f)
    aud = doc.audit()
    msp = doc.modelspace()
    U = upper[case]['upper']
    ref = U + [[x, -y] for x, y in reversed(U)]  # the app's closed silhouette
    samples, ends, counts = [], [], {}
    for e in msp:
        counts[e.dxftype() + ':' + e.dxf.layer] = counts.get(e.dxftype() + ':' + e.dxf.layer, 0) + 1
        if e.dxf.layer not in ('PROFILE', 'AXIS'):
            continue
        if e.dxftype() == 'SPLINE':
            sp = BSpline(e.control_points, order=e.dxf.degree + 1, knots=e.knots)
            pts = [(v.x, v.y) for v in sp.approximate(400)]
        else:
            pts = [(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)]
        ends += [pts[0], pts[-1]]
        if e.dxf.layer == 'PROFILE':
            samples += pts
    # closed loop: every endpoint must meet another endpoint
    L = max(abs(p[0]) for p in ref) or 1
    dangling = sum(1 for i, p in enumerate(ends) if not any(j != i and math.dist(p, q) < 1e-6 * L for j, q in enumerate(ends)))
    dev = max(poly_dist(p, ref) for p in samples)            # DXF curve → app curve
    back = max(poly_dist(p, samples) for p in ref[::5]) if mode == 'full' else 0  # app curve → DXF (coverage)
    print(f"{name:22s} audit errors={len(aud.errors):d} fixes={len(aud.fixes):d} | open ends={dangling} | "
          f"max dev {dev:.2e} mm, coverage gap {back:.2e} mm | {counts}")
