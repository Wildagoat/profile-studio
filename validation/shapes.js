// Upper-half silhouettes, nose at left, x increasing (the app mirrors about y = 0).
const lin = (n, a, b) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const naca = (t, c = 1, n = 240) => lin(n, 0, Math.PI).map(b => {
  const x = c * (1 - Math.cos(b)) / 2, u = x / c; // cosine spacing
  return [x, 5 * t * c * (0.2969 * Math.sqrt(u) - 0.1260 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4)];
});
const R = 0.05; // 3D bodies: 100 mm max diameter
module.exports = {
  // ---- 2D ----
  circle: () => lin(200, 0, Math.PI).map(t => [1 - Math.cos(t), Math.sin(t)]),
  square: () => [[0, 0], [0, 1], [2, 1], [2, 0]],
  plate: () => [[0, 0], [0, 1], [0.2, 1], [0.2, 0]],           // normal flat plate, t/h = 0.1
  naca0012: () => naca(0.12),
  naca0012_rev: () => naca(0.12).map(([x, y]) => [1 - x, y]).reverse(), // same foil, sharp edge first
  // ---- 3D (revolved, metres) ----
  sphere: () => lin(200, 0, Math.PI).map(t => [R - R * Math.cos(t), R * Math.sin(t)]),
  hemisphere: () => lin(100, 0, Math.PI / 2).map(t => [R - R * Math.cos(t), R * Math.sin(t)]).concat([[R, 0]]),
  cone60: () => [[0, 0], [R / Math.tan(Math.PI / 6), R], [R / Math.tan(Math.PI / 6), 0]],
  cyl_LD1: () => [[0, 0], [0, R], [2 * R, R], [2 * R, 0]],
  cyl_LD4: () => [[0, 0], [0, R], [8 * R, R], [8 * R, 0]],
  bullet: () => { // 1.5-cal tangent ogive + 2-cal cylinder, flat base (L/D 3.5)
    const Ln = 3 * R, rho = (R * R + Ln * Ln) / (2 * R);
    const nose = lin(80, 0, Ln).map(x => [x, Math.sqrt(rho * rho - (Ln - x) ** 2) + R - rho]);
    return nose.concat([[Ln + 4 * R, R], [Ln + 4 * R, 0]]);
  },
  streamlined: () => naca(0.25, 8 * R),                        // revolved NACA 0025, L/D = 4
};
