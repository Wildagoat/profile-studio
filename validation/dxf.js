// DXF export check: runs the app's own fitting + dxfGeometry + dxfText code (extracted from index.html) on the
// example bodies, writes validation/out/dxf_<case>_<mode>.dxf and a JSON of each profile's dense polyline.
// Then `python validation/dxf_check.py` audits the files with ezdxf and measures spline-vs-app deviation.
//   node validation/dxf.js && python validation/dxf_check.py
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function grabFn(name) {
  const i = SRC.search(new RegExp('function ' + name + '\\s*\\('));
  if (i < 0) throw new Error('missing ' + name);
  let d = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) {
    if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) return SRC.slice(i, k + 1); }
  }
}
const grabLine = start => { const i = SRC.indexOf(start); if (i < 0) throw new Error('missing ' + start); return SRC.slice(i, SRC.indexOf('\n', i)); };
const consts = ['const clamp =', 'const add =', 'const sub =', 'const mul =', 'const dot =', 'const len =', 'const dist =', 'const norm =', 'const lerp =', 'const binom =', 'const fmt =', 'const DEF_OPTS =', 'const IDEAL_A ='];
const fns = ['segProj', 'polyDist', 'bbox', 'solve', 'leastSquares', 'bez', 'derivPts', 'newtonProject', 'chordParam', 'dedupe', 'resample', 'smooth',
  'fitBezier', 'fitCubic', 'genBezier', 'maxErr', 'fitBernstein', 'solveBern', 'fitCST', 'cstPoint', 'evalFit', 'fitEndTan', 'curveTol', 'endTangents', 'applyTan',
  'curveEnd', 'neighborTan', 'processCurve', 'refit', 'measureErr', 'chainCurves', 'upperPolyline', 'pieces', 'rectCorners', 'dxfGeometry', 'dxfText'];
const code = consts.map(grabLine).join('\n') + '\n' + fns.map(grabFn).join('\n') +
  '\nreturn { get S() { return S; }, set S(v) { S = v; }, DEF_OPTS, IDEAL_A, processCurve, cstPoint, upperPolyline, dxfGeometry, dxfText };';
const app = new Function('S', code)({ guides: [], curves: [], mirror: true, units: 'mm' });

const L = 160, cos = n => Array.from({ length: n + 1 }, (_, i) => (1 - Math.cos(Math.PI * i / n)) / 2);
const curve = (name, raw, opts) => ({ id: name.length, name, raw, opts: { ...app.DEF_OPTS, ...opts }, snapStart: null, snapEnd: null, manual: false });
const rect = (id, name, p1, p2) => ({ id, type: 'rect', name, p1, p2 });
const parts = [rect(90, 'Battery', [38, -15], [98, 15]), rect(91, 'Motor', [104, -9], [128, 9]), { id: 92, type: 'line', p1: [0, 26], p2: [1, 26], inf: true }, { id: 93, type: 'circle', c: [60, 0], r: 5 }];
const hull = cos(150).map(q => { const x = q * L; return [x, 66 * Math.sqrt(q) * Math.pow(1 - q, 1.05) * (1 + 0.35 * q)]; });
const idealCst = { mode: 'cst', x0: 0, y0: 0, L, N1: 0.5, N2: 1, A: app.IDEAL_A, zte: 0, rev: false };
const CASES = {
  ideal: () => [curve('Ideal hull', cos(180).map(p => app.cstPoint(idealCst, p)), { mode: 'cst', N1: 0.5, N2: 1, cstOrder: 5, n: 96, smooth: 0, startTan: 'vertical' })],
  packaging: () => [curve('Hull', hull, { startTan: 'vertical' })],
  poly: () => [curve('Hull poly', hull, { mode: 'poly', degree: 8, startTan: 'vertical' })],
  bad: () => [[[0, 0], [0, 18]], [[0, 18], [L, 18]], [[L, 18], [L, 0]]].map(([a, b], i) =>
    curve('seg' + 'x'.repeat(i), Array.from({ length: 21 }, (_, k) => [a[0] + (b[0] - a[0]) * k / 20, a[1] + (b[1] - a[1]) * k / 20]), { mode: 'line', smooth: 0 })),
  reversed: () => [curve('Tail-first stroke', hull.slice().reverse(), { startTan: 'vertical' })], // drawn tail → nose: chain must flip it
};
const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
const summary = {};
for (const [name, mk] of Object.entries(CASES)) {
  app.S = { guides: parts, curves: mk(), mirror: true, units: 'mm' };
  app.S.curves.forEach(c => app.processCurve(c));
  const U = app.upperPolyline();
  summary[name] = { upper: U };
  for (const [mode, guides] of [['full', false], ['half', false], ['guides', true]]) {
    const ents = app.dxfGeometry(mode === 'half' ? 'half' : 'full', guides);
    fs.writeFileSync(path.join(out, `dxf_${name}_${mode}.dxf`), app.dxfText(ents));
    summary[name][mode] = ents.map(e => e.type + (e.degree ? e.degree : '') + ':' + e.layer).join(' ');
  }
}
fs.writeFileSync(path.join(out, 'dxf_upper.json'), JSON.stringify(summary));
for (const [k, v] of Object.entries(summary)) console.log(k.padEnd(10), 'full:', v.full, ' | half:', v.half);
