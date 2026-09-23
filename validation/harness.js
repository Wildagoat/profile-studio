// Headless harness: extracts the REAL sim + estimate code from profile-studio/index.html and runs it.
const fs = require('fs');
const SRC = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');

function grabFn(name) {
  const i = SRC.search(new RegExp('function ' + name + '\\s*\\('));
  if (i < 0) throw new Error('missing ' + name);
  let d = 0, j = SRC.indexOf('{', i);
  for (let k = j; k < SRC.length; k++) {
    if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) return SRC.slice(i, k + 1); }
  }
}
function grabLine(start) { const i = SRC.indexOf(start); return SRC.slice(i, SRC.indexOf('\n', i)); }

function makeEnv(opts) {
  const dom = {
    simRes: { value: String(opts.NY) }, simAoa: { value: String(opts.aoa || 0) }, simSize: { value: String(opts.size || 0.24) },
    simRe: { value: String(Math.log10(opts.Re)) }, simMsg: {}, estU: { value: String(opts.U || 10) },
    estFluid: { value: opts.fluid || 'air' }, estBL: { value: opts.bl || 'turb' }, estOut: {},
  };
  const $ = s => dom[s.slice(1)] || {};
  let simBuild = grabFn('simBuild');
  if (opts.block) simBuild = simBuild.replace('0.22 * NY / b.h', `${opts.block} * NY / b.h`);
  const code = [
    grabLine('const clamp ='), grabLine('const dist ='), grabLine('const fmt ='), grabLine('const UNITS ='),
    grabFn('bbox'), grabFn('profilePolygon'), grabFn('profileMetrics'),
    grabLine('const EX ='), grabLine('const WT ='), grabLine('const OPP ='), grabLine('const Sim ='),
    grabLine('const reVal ='), simBuild, grabFn('lbmStep'), grabFn('sampleFlow'), grabFn('testStats'), grabFn('coeffs'), grabFn('hoerner'), grabFn('renderEstimate'),
    'return { Sim, simBuild, lbmStep, coeffs, testStats, hoerner, renderEstimate, profileMetrics };',
  ].join('\n');
  const noop = () => {};
  const off = { width: 0, height: 0 };
  const offCtx = { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  const pCtx = { setTransform: noop, clearRect: noop }, pCv = { width: 0, height: 0 };
  const S = { mirror: true, units: 'm' };
  const f = new Function('$', 'upperPolyline', 'S', 'off', 'offCtx', 'pCtx', 'pCv', 'simLayout', 'updateSimNote', 'simDraw', 'updateRunBtn', 'resetParticles', code);
  return { api: f($, () => opts.upper, S, off, offCtx, pCtx, pCv, noop, noop, noop, noop, noop), dom };
}

module.exports = { makeEnv };

// CLI: node harness.js <jsonOpts>  -> runs a 2D LBM case, prints JSON
if (require.main === module) {
  const o = JSON.parse(process.argv[2]);
  o.upper = (require('./shapes')[o.shape] || require('./design')[o.shape])();
  const { api } = makeEnv(o);
  api.simBuild();
  const S = api.Sim, steps = Math.round(o.ft * S.NX / S.u0), t0 = Date.now();
  for (let s = 0; s < steps; s++) api.lbmStep();
  const c = api.coeffs();
  // also chord(length)-referenced C_D and Strouhal from lift history
  const h = S.hist.slice(Math.floor(S.hist.length / 2)), q = 0.5 * S.u0 * S.u0;
  let zc = 0; const my = h.reduce((a, e) => a + e[2], 0) / h.length;
  for (let i = 1; i < h.length; i++) if ((h[i - 1][2] - my) < 0 && (h[i][2] - my) >= 0) zc++;
  const clRms = Math.sqrt(h.reduce((a, e) => a + (e[2] - my) ** 2, 0) / h.length) / (q * S.Lc);
  const St = zc ? zc / ((h[h.length - 1][0] - h[0][0])) * S.Hc / S.u0 : 0;
  console.log(JSON.stringify({ ...o, upper: undefined, NX: S.NX, NY: S.NY, Lc: S.Lc, Hc: S.Hc, tau: S.tau0, steps,
    cd_h: c.cd, cdc: c.cdc, beta: c.beta, cd_L: c.cd * S.Hc / S.Lc, cl: c.cl, clRms, St, finite: isFinite(c.cd), sec: (Date.now() - t0) / 1000 }));
}
