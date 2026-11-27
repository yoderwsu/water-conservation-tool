/*
 * Sectors and example scenarios for the Conserved Water Ledger.
 * Numbers are illustrative, not estimates. The irrigation examples use the
 * 100-unit district of the paper's worked illustration (Section 7, scenario table tab:scenarios).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.WaterPresets = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SECTORS = {
    irr: {
      name: "Irrigation district",
      labels: { cb: ["Crop ET", "water the crop uses to grow"], cn: ["Other ET", "soil and canal evaporation, weeds"], q: ["Tailwater", "runs off fields, back within days"], s: ["Seepage + percolation", "soaks in, returns over months"] },
      quickQ: "Where does tailwater go?", quick: { river: "Back to the river", sink: "To a drain or sink" },
      slowQ: "Where do seepage and percolation go?", slow: { aq: "A connected aquifer that feeds the river", sink: "A saline or unusable aquifer" },
      profile: [0, 0, 0, 0.06, 0.14, 0.2, 0.24, 0.2, 0.13, 0.03, 0, 0],
      lag: 4,
    },
    muni: {
      name: "Municipal utility",
      labels: { cb: ["Outdoor ET", "water lawns and trees use"], cn: ["Other evaporation", "produces nothing"], q: ["Indoor effluent", "treated wastewater, back within days"], s: ["Outdoor percolation + leaks", "soaks in, returns over months"] },
      quickQ: "Where is effluent discharged?", quick: { river: "To the river (inland city)", sink: "To the ocean (coastal city)" },
      slowQ: "Where do percolation and leaks go?", slow: { aq: "A connected aquifer that feeds the river", sink: "An unusable aquifer or sink" },
      profile: [0.055, 0.055, 0.065, 0.08, 0.095, 0.11, 0.125, 0.12, 0.1, 0.08, 0.06, 0.055],
      lag: 3,
    },
  };

  const IRR = { cb: 40, cn: 5, q: 10, s: 45 };
  const MUNI = { cb: 30, cn: 3, q: 55, s: 12 };
  const MODERN = { cb: 40, cn: 2, q: 2, s: 6 };
  const lam = (s, u, t, b) => ({ s, u, t, b });

  const PRESETS = [
    { id: "fallow", name: "Fallow 20%, water into trust", sector: "irr", before: IRR, after: { cb: 32, cn: 4, q: 8, s: 36 }, quick: "river", slow: "aq", lam: lam(1, 0, 0, 0) },
    { id: "mod-trust", name: "Modernize, saving into trust", sector: "irr", before: IRR, after: MODERN, quick: "river", slow: "aq", lam: lam(1, 0, 0, 0) },
    { id: "mod-rebound", name: "Modernize, saving used again by the district", sector: "irr", before: IRR, after: MODERN, quick: "river", slow: "aq", lam: lam(0, 1, 0, 0) },
    { id: "mod-bank", name: "Modernize, saving banked in the aquifer", sector: "irr", before: IRR, after: MODERN, quick: "river", slow: "aq", lam: lam(0, 0, 0, 1) },
    { id: "line-aq", name: "Line canals over a connected aquifer", sector: "irr", before: IRR, after: { cb: 40, cn: 5, q: 10, s: 25 }, quick: "river", slow: "aq", lam: lam(1, 0, 0, 0) },
    { id: "line-saline", name: "Line canals over a saline aquifer", sector: "irr", before: IRR, after: { cb: 40, cn: 5, q: 10, s: 25 }, quick: "river", slow: "sink", lam: lam(1, 0, 0, 0) },
    { id: "indoor-inland", name: "Indoor retrofits, inland city, saving serves new homes", sector: "muni", before: MUNI, after: { cb: 30, cn: 3, q: 43, s: 12 }, quick: "river", slow: "aq", lam: lam(0, 0, 1, 0), dt: 0.45 },
    { id: "indoor-coast", name: "Indoor retrofits, coastal city, saving protected", sector: "muni", before: MUNI, after: { cb: 30, cn: 3, q: 43, s: 12 }, quick: "sink", slow: "aq", lam: lam(1, 0, 0, 0) },
    { id: "turf", name: "Turf removal, saving protected", sector: "muni", before: MUNI, after: { cb: 18, cn: 3, q: 55, s: 8 }, quick: "river", slow: "aq", lam: lam(1, 0, 0, 0) },
  ];

  /** Full model input for a preset, with defaults filled in. */
  function scenario(id) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) throw new Error("Unknown preset: " + id);
    const sec = SECTORS[p.sector];
    return {
      preset: p.id, sector: p.sector,
      before: { ...p.before }, after: { ...p.after },
      quick: p.quick, slow: p.slow, lam: { ...p.lam },
      dt: p.dt ?? 0.5, db: p.db ?? 0.05, lag: sec.lag, profile: sec.profile.slice(),
    };
  }

  return { SECTORS, PRESETS, scenario };
});
