// Scores the recorded standard-test results (validation/out/bench_<shape>_1000.json) with the app's own
// RATING table, BENCHMARK and Hoerner estimate, so the star calibration can be checked without a browser.
//   node validation/benchmark.js packaging > validation/out/bench_packaging_1000.json   (etc.)
//   node validation/rating.js
const fs = require('fs'), path = require('path');
const { makeEnv } = require('./harness');
const design = require('./design'), shapes = require('./shapes');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = (start, end) => { const i = SRC.indexOf(start); return SRC.slice(i, SRC.indexOf(end, i) + end.length); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const RATING = new Function('clamp', block('const RATING = [', '\n];') + '\nreturn RATING;')(clamp);
const BENCHMARK = new Function(block('const BENCHMARK = {', '\n};') + '\nreturn BENCHMARK;')();
const ALIAS = { ideal: 'cstE', packaging: 'example', bad: 'can' };
const upper = n => (design[ALIAS[n] || n] || shapes[ALIAS[n] || n])();
const geo = n => { const { api } = makeEnv({ NY: 170, Re: 1000, upper: upper(n) }); const m = api.profileMetrics(); return { m, h: api.hoerner(m, 10, 'air', 'turb') }; };
const gi = geo('ideal'), bm = { ...BENCHMARK.byRe[1000], cdV: gi.h.cdV, tailSlope: gi.m.tailSlope };
const rows = [];
for (const f of fs.readdirSync(path.join(__dirname, 'out')).filter(f => /^bench_.*_1000\.json$/.test(f))) {
  const st = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', f), 'utf8'));
  const g = geo(st.shape), yours = { ...st, cdV: g.h.cdV, tailSlope: g.m.tailSlope };
  const items = RATING.map(r => ({ k: r.key, s: clamp(r.score(yours[r.key], bm[r.key]), 0, 1), w: r.w }));
  const total = items.reduce((a, i) => a + i.s * i.w, 0);
  rows.push({ shape: st.shape, stars: Math.round(total * 2) / 2, total: +total.toFixed(2), ...Object.fromEntries(items.map(i => [i.k, +(i.s * 100).toFixed(0)])) });
}
console.table(rows.sort((a, b) => b.total - a.total));
