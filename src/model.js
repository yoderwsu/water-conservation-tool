/*
 * Conserved Water Ledger: model core.
 *
 * Pure functions that evaluate the equations of "The Fate of Conserved Water"
 * (Yoder, draft) for one use and one diversion. No DOM access, so the same file
 * runs in the browser (global `WaterModel`) and in Node (require).
 *
 * States: 0 = before the practice; tau = practice in place, freed water not yet
 * used (counterfactual); 1 = after the freed water reaches its destinations.
 *
 * Physical paths of a use (units of water per year):
 *   cb  beneficial consumption (crop or outdoor ET)
 *   cn  non-beneficial consumption (soil, canal, weed ET; other evaporation)
 *   q   quick path (tailwater, indoor effluent): returns in the same month
 *   s   slow path (seepage, percolation, leaks): returns through the aquifer
 * The setting decides whether each path is recoverable return R or
 * non-recoverable outflow N.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.WaterModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DISPOSITIONS = { s: "protected", u: "rebound", t: "transfer", b: "banked" };

  /** Equation (1): partition a state into W, C_b, C_n, N, R and D. */
  function partition(x, quickSink, slowSink) {
    const N = (quickSink ? x.q : 0) + (slowSink ? x.s : 0);
    const R = (quickSink ? 0 : x.q) + (slowSink ? 0 : x.s);
    return { W: x.cb + x.cn + x.q + x.s, cb: x.cb, cn: x.cn, N, R, D: x.cb + x.cn + N };
  }

  /** Steady-state monthly lag kernel: exponential with mean `lag` months, wrapped over 12 months. */
  function lagKernel(lag) {
    const tau = Math.max(lag, 0.25);
    const h = new Array(12).fill(0);
    for (let m = 0; m < 12; m++) for (let k = 0; k < 40; k++) h[m] += Math.exp(-(m + 12 * k) / tau);
    const sum = h.reduce((a, b) => a + b, 0);
    return h.map((v) => v / sum);
  }

  /** Practice code: type (A-D) and disposition. Type A if the practice cuts C_b, else B/C by wet vs dry. */
  function practiceCode(r, lam) {
    let type;
    if (Math.abs(r.F) < 0.5) type = "D";
    else if (-r.dtau.cb > 0.05 * r.F) type = "A";
    else type = r.Fwet >= r.Fdry ? "B" : "C";
    const top = Object.entries(lam).sort((a, b) => b[1] - a[1])[0];
    const disposition = top[1] >= 0.6 ? DISPOSITIONS[top[0]] : "mixed";
    return { type, disposition, code: type + "·" + disposition };
  }

  /**
   * Evaluate a scenario.
   * @param {object} p
   *   before, after: {cb, cn, q, s} for states 0 and tau
   *   quick, slow:   "river"|"sink", "aq"|"sink" (where each path ends up)
   *   lam:           {s, u, t, b} disposition shares, summing to one
   *   dt, db:        depletion fractions of the transferee and of banking
   *   lag:           mean lag of slow returns, months
   *   profile:       12 monthly diversion weights
   */
  function compute(p) {
    const qSink = p.quick === "sink", sSink = p.slow === "sink";
    const b = p.before, a = p.after, lam = p.lam;
    const P0 = partition(b, qSink, sSink), Pt = partition(a, qSink, sSink);

    // Equation (3): F and its parts are minus the changes from state 0 to state tau.
    const dtau = { W: Pt.W - P0.W, cb: Pt.cb - P0.cb, cn: Pt.cn - P0.cn, N: Pt.N - P0.N, R: Pt.R - P0.R, D: Pt.D - P0.D };
    const F = -dtau.W, Fwet = -dtau.D, Fdry = -dtau.R;
    const Fp = Math.max(F, 0); // a practice that raises withdrawal frees nothing to dispose of

    // Re-applied water uses the post-practice technology (fallback: baseline if W^tau = 0).
    const ref = Pt.W > 0 ? a : b;
    const rW = ref.cb + ref.cn + ref.q + ref.s || 1;
    const fr = { cb: ref.cb / rW, cn: ref.cn / rW, q: ref.q / rW, s: ref.s / rW };
    const du = fr.cb + fr.cn + (qSink ? fr.q : 0) + (sSink ? fr.s : 0);

    // Step tau -> 1: freed water goes to its destinations.
    const U = lam.u * Fp, T = lam.t * Fp, B = lam.b * Fp, S = lam.s * Fp;
    const fin = {
      left: S,
      cb: a.cb + U * fr.cb + T * p.dt,
      cn: a.cn + U * fr.cn + B * p.db,
      q: a.q + U * fr.q + T * (1 - p.dt),
      s: a.s + U * fr.s,
      bank: B * (1 - p.db), // banked recharge is recoverable even where the slow path is not
    };
    const W1 = Pt.W + U + T + B;
    const N1 = (qSink ? fin.q : 0) + (sSink ? fin.s : 0);
    const R1 = (qSink ? 0 : fin.q) + (sSink ? 0 : fin.s) + fin.bank;
    const D1 = fin.cb + fin.cn + N1;

    // Equation (4).
    const dD = D1 - P0.D;
    const phi = F > 1e-9 ? -dD / F : NaN;
    const sumLd = lam.u * du + lam.t * p.dt + lam.b * p.db;
    const dW = W1 - P0.W;

    // Equation (5), simplified to two nodes: A below the diversion and above all
    // returns; B below all returns. Node B sums to -dD over a year.
    const ps = p.profile.reduce((x, y) => x + y, 0);
    const pr = p.profile.map((v) => v / ps);
    const h = lagKernel(p.lag);
    const dQuick = (qSink ? 0 : fin.q) - (qSink ? 0 : b.q);
    const dSlow = (sSink ? 0 : fin.s) + fin.bank - (sSink ? 0 : b.s);
    const nodeA = [], nodeB = [];
    for (let t = 0; t < 12; t++) {
      let slow = 0;
      for (let s = 0; s < 12; s++) slow += pr[s] * dSlow * h[(t - s + 12) % 12];
      nodeA.push(-pr[t] * dW);
      nodeB.push(-pr[t] * dW + pr[t] * dQuick + slow);
    }

    const r = { qSink, sSink, P0, Pt, dtau, F, Fwet, Fdry, du, fin, W1, N1, R1, D1, dD, phi, sumLd, dW, nodeA, nodeB };
    // Late return (paper Table 4): slow-path flow that stays in the basin, plus banked recharge.
    r.lateReturn = (sSink ? 0 : fin.s) + fin.bank;
    Object.assign(r, practiceCode(r, lam));
    return r;
  }

  return { compute, partition, lagKernel, practiceCode, DISPOSITIONS };
});
