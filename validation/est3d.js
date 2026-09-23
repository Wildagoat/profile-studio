// Hoerner revolved-body card vs published C_D (100 mm diameter bodies, 20 m/s air). Usage: node est3d.js
const { makeEnv } = require('./harness'), shapes = require('./shapes');
const ref = { sphere: 0.47, hemisphere: 0.42, cone60: 0.50, cyl_LD1: 1.15, cyl_LD4: 0.82, bullet: 0.295, streamlined: 0.04 };
const rows = [];
for (const [k, cdRef] of Object.entries(ref)) {
  const { api, dom } = makeEnv({ NY: 170, Re: 1000, upper: shapes[k](), U: 20, fluid: 'air', bl: 'turb' });
  api.renderEstimate();
  const m = api.profileMetrics(), cd = +dom.estOut.innerHTML.match(/frontal<\/span><span class="big">([\d.]+)/)[1];
  rows.push({ shape: k, cdRef, cdModel: cd, err: ((cd / cdRef - 1) * 100).toFixed(0) + '%', fineness: +m.fineness.toFixed(2), ReL: +(20 * m.L / 1.51e-5).toExponential(2) });
}
console.table(rows);
