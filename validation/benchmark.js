// Runs a full "standard test" headless (the app's own simBuild / lbmStep / sampleFlow / testStats) and prints
// the settled test statistics. The ideal body's result is the benchmark embedded in index.html (BENCHMARK).
//   node validation/benchmark.js ideal            (also: packaging, bad, or any shape in shapes.js / design.js)
//   node validation/benchmark.js ideal '{"Re":1000,"NY":170,"size":0.24,"ft":6}'
const { makeEnv } = require('./harness');
const design = require('./design'), shapes = require('./shapes');
const ALIAS = { ideal: 'cstE', packaging: 'example', bad: 'can' };
const name = process.argv[2] || 'ideal';
const o = { Re: 1000, NY: 170, size: 0.24, aoa: 0, ft: 6, ...JSON.parse(process.argv[3] || '{}') };
const key = ALIAS[name] || name;
o.upper = (design[key] || shapes[key])();
const { api } = makeEnv(o);
api.simBuild();
const S = api.Sim, steps = Math.round(o.ft * S.NX / S.u0), t0 = Date.now();
for (let s = 0; s < steps; s++) api.lbmStep();
const st = api.testStats();
const r = v => (typeof v === 'number' ? Number(v.toPrecision(4)) : v);
console.log(JSON.stringify({ shape: name, ...Object.fromEntries(Object.entries(st).map(([k, v]) => [k, r(v)])), sec: (Date.now() - t0) / 1000 }));
