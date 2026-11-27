// Run with: node --test   (Node 18+; no dependencies)
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { compute } = require("../src/model.js");
const { PRESETS, scenario } = require("../src/presets.js");

const close = (a, b, tol = 1e-9, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} expected ${b}, got ${a}`);

// Paper, scenario table (tab:scenarios). If these change, the manuscript changes too.
const TABLE4 = [
  { id: "fallow", code: "A·protected", F: 20, Fwet: 9, Fdry: 11, dD: -9, phi: 0.45, late: 36 },
  { id: "mod-trust", code: "C·protected", F: 50, Fwet: 3, Fdry: 47, dD: -3, phi: 0.06, late: 6 },
  { id: "mod-reuse", code: "C·local reuse", F: 50, Fwet: 3, Fdry: 47, dD: 39, phi: -0.78, late: 12 },
];

for (const row of TABLE4) {
  test(`scenario table: ${row.id}`, () => {
    const r = compute(scenario(row.id));
    close(r.F, row.F, 1e-9, "F"); close(r.Fwet, row.Fwet, 1e-9, "F_wet"); close(r.Fdry, row.Fdry, 1e-9, "F_dry");
    close(r.dD, row.dD, 1e-9, "Delta D"); close(r.phi, row.phi, 1e-9, "phi"); close(r.lateReturn, row.late, 1e-9, "late return");
    assert.equal(r.code, row.code);
  });
}

test("local-reuse case: d_u = 42/50 and the basin ledger is 4 early / 12 late / 84 depleted", () => {
  const r = compute(scenario("mod-reuse"));
  close(r.du, 42 / 50);
  close(r.fin.left + (r.qSink ? 0 : r.fin.q), 4); close(r.lateReturn, 12); close(r.D1, 84);
});

test("same hardware, different setting: lining is Type C over alluvium and Type B over a saline aquifer", () => {
  assert.equal(compute(scenario("line-aq")).type, "C");
  const saline = compute(scenario("line-saline"));
  assert.equal(saline.type, "B"); close(saline.phi, 1);
});

for (const p of PRESETS) {
  test(`identities hold: ${p.id}`, () => {
    const s = scenario(p.id);
    const r = compute(s);
    // Equation (3): F = F_wet + F_dry
    close(r.F, r.Fwet + r.Fdry, 1e-9, "F = Fwet + Fdry");
    // Equation (4): Delta D = -F_wet + F * sum(lambda_i d_i)
    close(r.dD, -r.Fwet + Math.max(r.F, 0) * r.sumLd, 1e-9, "fate equation");
    // Shared diversion: Delta W = -lambda_s F
    close(r.dW, -s.lam.s * r.F, 1e-9, "Delta W = -lambda_s F");
    // Water balance closes in state 1, and the ledger total equals baseline withdrawal
    close(r.W1, r.D1 + r.R1, 1e-9, "W = D + R in state 1");
    close(r.W1 + r.fin.left, r.P0.W, 1e-9, "ledger total");
    // Equation (5): node B sums to -Delta D over a year
    close(r.nodeB.reduce((a, b) => a + b, 0), -r.dD, 1e-9, "node B annual sum");
    close(r.nodeA.reduce((a, b) => a + b, 0), -r.dW, 1e-9, "node A annual sum");
  });
}

test("lambda shares of each preset sum to one", () => {
  for (const p of PRESETS) close(Object.values(p.lam).reduce((a, b) => a + b, 0), 1);
});
