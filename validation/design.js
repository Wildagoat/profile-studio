// candidate "ideal" bodies (length 160 mm, upper half), + the current example (noise-free)
const L = 160, lin = (n) => Array.from({ length: n }, (_, i) => i / (n - 1));
const cos = n => lin(n).map(t => (1 - Math.cos(Math.PI * t)) / 2);
const bern = (A, q) => { const n = A.length - 1; let s = 0, c = 1; for (let i = 0; i <= n; i++) { s += A[i] * c * q ** i * (1 - q) ** (n - i); c = c * (n - i) / (i + 1); } return s; };
const cst = (A, N1 = 0.5, N2 = 1) => cos(241).map(q => [q * L, L * q ** N1 * (1 - q) ** N2 * bern(A, q)]);
const S = {
  can: () => [[0, 0], [0, 18], [160, 18], [160, 0]],                       // flat-faced can around the packaging parts
  example: () => cos(241).map(q => [q * L, 66 * Math.sqrt(q) * Math.pow(1 - q, 1.05) * (1 + 0.35 * q)]),
  naca0025: () => cos(241).map(q => [q * L, 5 * 0.25 * L * (0.2969 * Math.sqrt(q) - 0.1260 * q - 0.3516 * q * q + 0.2843 * q ** 3 - 0.1036 * q ** 4)]),
  cstA: () => cst([0.33, 0.34, 0.26, 0.17]),
  cstB: () => cst([0.30, 0.33, 0.30, 0.20, 0.12]),
  cstC: () => cst([0.26, 0.28, 0.24, 0.16, 0.10]),
  cstD: () => cst([0.28, 0.30, 0.26, 0.17, 0.10]),
  cstE: () => cst([0.27, 0.30, 0.28, 0.20, 0.13, 0.08]),
};
module.exports = S;
if (require.main === module) {
  for (const [k, f] of Object.entries(S)) {
    const U = f(); let rmax = 0, xm = 0; for (const p of U) if (p[1] > rmax) { rmax = p[1]; xm = p[0]; }
    let ts = 0; for (let i = 1; i < U.length; i++) if (U[i][0] > xm) ts = Math.max(ts, Math.atan2(U[i - 1][1] - U[i][1], U[i][0] - U[i - 1][0]) * 180 / Math.PI);
    console.log(k.padEnd(9), 'fineness', (L / 2 / rmax).toFixed(2), 'xmax/L', (xm / L).toFixed(2), 'tailSlope', ts.toFixed(1));
  }
}
