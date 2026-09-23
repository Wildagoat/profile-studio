# Profile Studio

Sketch a silhouette freehand around guide geometry, turn it into a parametric curve,
mirror it about the x-axis, and run it through a 2D wind tunnel. Single-file static app
(`index.html`), no build step, no dependencies.

## Run
Launch config **`profile-studio`** (port 4192), or:
```
python -m http.server 4192
```
then open http://localhost:4192 .

## Workflow
1. **Guides** (left toolbar): line `L` (type a length + Enter, Shift = 15° snap), distance `D`,
   circle `C` (type a radius), **known-part box** `R` (type `w,h`), point `P`, and quick horizontal
   or vertical construction lines in the panel. You can also load a **reference image** to trace, or
   import a **known profile** (CSV of x,y or another project JSON) as a locked overlay.
2. **Draw** `F`: sketch the upper half. The ends snap to guide points, intersections, lines, the axis,
   and other curve ends. A snapped end pulls the stroke onto it with a correction that fades along its length.
3. **Dots**: the stroke is resampled to N evenly spaced points (by arc length) and Gaussian-smoothed
   with the ends pinned.
4. **Fit**, one of four per curve:
   - **Bézier spline**: piecewise cubic (Schneider's algorithm), with the tolerance as a % of the curve's size.
   - **Single polynomial**: one Bernstein curve of degree n (least squares, Newton re-parameterisation).
   - **CST (Kulfan)**: `y = ψ^N1 (1-ψ)^N2 Σ A_i K_i(ψ)`, the standard aero body/airfoil form.
   - **Straight line**.

   End-tangent conditions: free, vertical (round nose/tail), horizontal, along the snapped guide,
   or **G1 match** to the joined curve. Bézier/polynomial control points can be hand-edited afterward
   (interior joints stay smooth; hold Alt to break them).
5. **Mirror** about the x-axis (on by default). The closed silhouette is part of the equation:
   `P(s) = U(s)` for `s ∈ [0,K]` and `(Uₓ(2K−s), −U_y(2K−s))` for `s ∈ [K,2K]`.
6. **Export**: equation text, Python (numpy `U(s)`, `P(s)`, `sample()`), Desmos expressions, SVG, CSV.

The panel also shows the length, max diameter, fineness, revolved volume, wetted area, tail slope and
the **fit check** (clearance or interference between the silhouette and each known part).

## Examples (header → Load example…)
- **Packaging**: a hand-drawn hull wrapped around a battery and motor box, with a clearance check. Its 25°
  tail separates, so the 2D tunnel shows vortex shedding in the wake (lift RMS ≈ 0.27 at Re 1,000).
  That shows what a packaging constraint costs.
- **Ideal**: a low-drag Kulfan CST body of revolution, `y = L·ψ^0.5·(1−ψ)·Σ A_i·B_i,5(ψ)` with
  `A = [0.27, 0.30, 0.28, 0.20, 0.13, 0.08]`. It has L/D 4.8, max diameter at 27% of the length, an 11°
  max aft slope and a sharp tail. It came out of a sweep in `validation/design.js`: at the default
  Re 1,000 its wake is steady (lift RMS ≈ 1e-4), and it has the lowest Hoerner C_D per volume^(2/3) of the
  candidates (0.063 vs 0.074 for the packaging hull). At Re ≳ 3,000 even this shape sheds in the 2D
  tunnel, a 2D laminar-wake effect that a real 3D turbulent body doesn't share to the same degree.
- **Bad**: planned.

## Aero sim
- **D2Q9 lattice-Boltzmann** (BGK + Smagorinsky), uniform inlet, zero-gradient outlet, free-slip walls,
  half-way bounce-back on the body, drag/lift by momentum exchange.
- **Air particles** are fired from an inlet rake and advected through the live velocity field (RK2).
  Fields: speed, vorticity, pressure Cp. Controls: angle of attack, Re, body size, resolution.
- **Re is based on the body's longest side**: the length for slender shapes, the frontal height for bluff
  or plate-like ones. A plate facing the flow would otherwise get its Re from its thickness, and the default
  grid would go unstable. The note under the forces shows both Re_L (length) and Re_h (frontal height).
- C_D is referenced to the frontal height and C_L to the length (2D, per unit span).
- **C_D blockage-corrected** = C_D / (1 + 0.9·C_D·h/H), where h/H is the fraction of the tunnel height the
  body fills. This is a Maskell-type wall correction. θ = 0.9 was fitted to this tunnel (free-slip walls,
  uniform inlet) against the published cylinder, square and plate values below.
- **Revolved-body estimate**: the Hoerner form-factor correlation (plus base / flat-nose terms) at your
  real speed, fluid and Reynolds number. Flat end faces count the same whether the curve stops at the rim
  or is closed down to the axis with a vertical line (any straight run within 2° of vertical at an end). A
  flat base counts as a 90° tail slope. Below fineness L/D = 2 the card warns that the correlation is
  invalid and lists measured bluff-body values instead.

## Caveats
- The lattice sim is **2D planar** (it treats the shape as an extruded profile, not the revolved body) and runs
  at Re ~10²–10⁴, far below real scale. Use it for flow patterns and **relative** comparisons.
  The revolved estimate card gives the real-scale number.
- Blockage is capped at about 22% of the tunnel height, which raises the raw C_D 25–50% above free air.
  Read the blockage-corrected line for a free-air estimate. It was calibrated at Re 20–100 on bluff bodies.
  On slender bodies the leftover error is grid resolution (+10–16% on a NACA 0012).
- At the app's low Re, skin friction dominates slender shapes. The tunnel separates slender from bluff
  cleanly, but it barely separates a good slender shape from a mediocre one. A NACA 0012 flown backwards
  reads only about 4% worse.
- The Hoerner card is good for streamlined bodies (L/D ≳ 3) and rough for blunt ones. The base-drag term
  under-predicts a bullet by about 34%.
- Autosaves to localStorage; **Save project** writes JSON.

## Validation (2026-09-22)
The app's own `simBuild` / `lbmStep` / `coeffs` / `profileMetrics` / `renderEstimate` code was run headless
on analytic shapes and compared with published drag data. Full report with charts:
https://claude.ai/artifact/LJjBuanp65XmA7bsQ24hko (it shows results from before the fixes above).

**2D tunnel** (C_D on frontal height, Re ≈ 100 on height, 6 flow-throughs, last half averaged)

| Shape | Published | Raw, app defaults (22%) | Corrected (22%) | Raw, 300 rows (10%) | Corrected (10%) |
|---|---|---|---|---|---|
| NACA 0012, α 0°, Re_c 1000 | 1.00 (0.12 on chord) | 1.25 | 1.16 | 1.16 | 1.10 |
| Circular cylinder, Re 100 | 1.33 | 1.87 | 1.36 | 1.50 | 1.32 |
| Square cylinder, Re 100 | 1.48 | 2.16 | 1.50 | 1.61 | 1.41 |
| Normal flat plate, Re_h 100 | 2.0–2.6 | 3.47 | 2.04 | 2.80 | 2.24 |
| Circular cylinder, Re 40 | 1.52 | 2.33 | 1.58 | | |
| Circular cylinder, Re 20 | 2.05 | 3.11 | 1.91 | | |

The ranking (airfoil < cylinder < square < plate) matches the literature at every setting.

**Revolved-body card** (100 mm diameter, 20 m/s air, turbulent BL). Run `node validation/est3d.js`.

| Body | Published | Card |
|---|---|---|
| Streamlined, revolved NACA 0025, L/D 4 | ≈ 0.04 (high Re) | 0.079 at Re 5×10⁵, 0.043 at Re 10⁷ |
| Bullet, ogive + flat base, L/D 3.5 | 0.295 | 0.19 |
| Axial cylinder, L/D 4 | 0.82 | 1.01 |
| Axial cylinder, L/D 1 | 1.15 | 1.28 |
| Cone, 60° apex, point forward | 0.50 | 0.38 (L/D < 2 warning) |
| Sphere | 0.47 | 0.29 (L/D < 2 warning) |
| Hemisphere, round side forward | 0.42 | 1.75 (L/D < 2 warning) |

To reproduce: `validation/harness.js` extracts the functions from `index.html` and runs them in Node, so it
always tests the current code. `validation/shapes.js` holds the analytic test shapes. Example 2D case
(about 3 minutes):
```
node validation/harness.js "{\"shape\":\"circle\",\"NY\":170,\"Re\":100,\"ft\":6}"
```
Options: `NY` rows, `Re`, `ft` flow-throughs, `size` body fraction, `aoa`, `block` (override the 0.22 cap).

## Sources
Benchmark drag data used for the validation and for the bluff-body reference values in the app:
- Kurtulus, D. F. (2015). On the unsteady behavior of the flow around NACA 0012 airfoil with steady external
  conditions at Re = 1000. *Int. J. Micro Air Vehicles* 7(3). C_D ≈ 0.12 at α = 0.
  https://www.researchgate.net/publication/282703380_On_the_Unsteady_Behavior_of_the_Flow_Around_NACA_0012_Airfoil_with_Steady_External_Conditions_at_Re1000
- Circular and square cylinder at Re = 100 (comparison table): C_D 1.33 / ≈ 1.48.
  https://www.researchgate.net/figure/The-drag-and-lift-coefficient-of-flow-with-Re-100-for-both-circular-and-square-cylinder_tbl2_272416018
  Original sources: Park, Kwon & Choi (1998); Williamson (1996); Sohankar, Norberg & Davidson (1998);
  Sharma & Eswaran (2004); Dennis & Chang (1970) for Re 20 / 40 (2.05 / 1.52).
- Nominally 2-dimensional flow about a normal flat plate (DTIC ADA274472). 2D laminar C_D ≈ 2.6.
  https://apps.dtic.mil/sti/tr/pdf/ADA274472.pdf
- Drag coefficient (Wikipedia). Long flat plate normal to flow, 2D: 1.98–2.05; spheres vs Re.
  https://en.wikipedia.org/wiki/Drag_coefficient
- NASA Glenn Research Center, Shape effects on drag. Flat plate 1.28, bullet 0.295, airfoil 0.045,
  sphere 0.07–0.5.
  https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/shape-effects-on-drag/
- Hoerner, S. F. (1965). *Fluid-Dynamic Drag*. Sphere, hemisphere, cone, axial cylinders, streamlined
  bodies, base drag; form factor FF = 1 + 1.5·(D/L)^1.5 + 7·(D/L)^3.
  https://books.google.com/books/about/Fluid_dynamic_Drag.html?id=abU8AAAAIAAJ
- Form drag overview (ScienceDirect Topics). Summary of the Hoerner body-of-revolution form factor.
  https://www.sciencedirect.com/topics/engineering/form-drag
- Maskell, E. C. (1963). A theory of the blockage effects on bluff bodies and stalled wings in a closed
  wind tunnel. ARC R&M 3400. This is the form of the blockage correction; θ here was fitted to this tunnel.
