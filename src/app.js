/*
 * Conserved Water Ledger: user interface.
 * Reads controls, calls WaterModel.compute, and draws the summary, the
 * two-ledger Sankey, the monthly flow-change plot, and the state table.
 * Depends on src/model.js (WaterModel) and src/presets.js (WaterPresets).
 */
(function () {
  "use strict";
  const { compute } = window.WaterModel;
  const { SECTORS, PRESETS, scenario } = window.WaterPresets;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const LAMS = [["s", "Protected in the source"], ["u", "Re-applied by the proprietor (rebound)"], ["t", "Transferred to another user"], ["b", "Banked or recharged"]];
  const KEYS = ["cb", "cn", "q", "s"];
  const TYPE_TEXT = {
    A: "Type A: the practice cuts consumption and gives up some service (fewer acres, less lawn). The saving is mostly real water.",
    B: "Type B: the practice cuts evaporation or loss to a sink and keeps the service. The saving is real water.",
    C: "Type C: the practice mostly cuts water that would have flowed back. Little of the saving is new water; mostly the timing and location of flows change.",
    D: "Type D: the practice frees little or no withdrawal. Any effect comes from moving water in time or space.",
  };
  const DISP_TEXT = {
    protected: "Most freed water is protected in the river.",
    rebound: "Most freed water is re-applied by the same user (rebound).",
    transfer: "Most freed water goes to another user.",
    banked: "Most freed water is banked in the aquifer.",
    mixed: "The freed water is split among several destinations.",
  };
  const $ = (id) => document.getElementById(id);

  let st = {};
  function load(id) { st = { ...scenario(id), view: "scn" }; }

  // ---------- formatting ----------
  const MINUS = "−";
  function fmt(v, dec) {
    if (!isFinite(v)) return "—";
    dec = dec ?? 1;
    let r = Math.round(v * 10 ** dec) / 10 ** dec;
    if (Math.abs(r) < 1e-9) r = 0;
    const s = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(dec);
    return (r < 0 ? MINUS : "") + s;
  }
  function sfmt(v, dec) { const s = fmt(v, dec); return (v > 1e-9 && s !== "0" ? "+" : "") + s; }
  const pct = (v) => Math.round(v * 100) + "%";

  // ---------- controls ----------
  function buildControls() {
    const sel = $("preset");
    sel.innerHTML = PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("") + `<option value="custom">Custom (edited)</option>`;
    sel.addEventListener("change", () => { if (sel.value !== "custom") { load(sel.value); sync(); render(); } });

    $("comps").innerHTML = KEYS.map((k) => `<div class="comp-row"><div class="nm"><span id="nm-${k}"></span><small id="nm2-${k}"></small></div>
      <input class="num" type="number" min="0" max="200" step="1" id="b-${k}" aria-label="Before">
      <input class="num" type="number" min="0" max="200" step="1" id="a-${k}" aria-label="After practice"></div>`).join("");
    KEYS.forEach((k) => {
      $("b-" + k).addEventListener("input", (e) => { st.before[k] = Math.max(0, +e.target.value || 0); custom(); render(); });
      $("a-" + k).addEventListener("input", (e) => { st.after[k] = Math.max(0, +e.target.value || 0); custom(); render(); });
    });

    $("lams").innerHTML = LAMS.map(([k, l]) => `<div class="slider"><label class="lab" for="lam-${k}">${l}</label><output id="lam-${k}-o" for="lam-${k}"></output><input type="range" id="lam-${k}" min="0" max="1" step="0.05"></div>`).join("");
    LAMS.forEach(([k]) => $("lam-" + k).addEventListener("input", (e) => { setLam(k, +e.target.value); custom(); syncLams(); render(); }));

    ["irr", "muni"].forEach((s) => $("sec-" + s).addEventListener("click", () => {
      if (st.sector === s) return;
      load(PRESETS.find((x) => x.sector === s).id); sync(); render();
    }));
    document.querySelectorAll('input[name="quick"]').forEach((r) => r.addEventListener("change", (e) => { st.quick = e.target.value; custom(); render(); }));
    document.querySelectorAll('input[name="slow"]').forEach((r) => r.addEventListener("change", (e) => { st.slow = e.target.value; custom(); render(); }));
    $("dt").addEventListener("input", (e) => { st.dt = +e.target.value; custom(); render(); });
    $("db").addEventListener("input", (e) => { st.db = +e.target.value; custom(); render(); });
    $("lag").addEventListener("input", (e) => { st.lag = +e.target.value; render(); });
    $("view-scn").addEventListener("click", () => { st.view = "scn"; sync(); render(); });
    $("view-base").addEventListener("click", () => { st.view = "base"; sync(); render(); });
  }
  // Moving one share rescales the others so the four always sum to one.
  function setLam(key, v) {
    const others = LAMS.map((x) => x[0]).filter((k) => k !== key);
    const rest = others.reduce((s, k) => s + st.lam[k], 0), rem = 1 - v;
    if (rest < 1e-9) { others.forEach((k) => (st.lam[k] = 0)); st.lam[key === "s" ? "u" : "s"] = rem; }
    else others.forEach((k) => (st.lam[k] = (st.lam[k] / rest) * rem));
    st.lam[key] = v;
  }
  function custom() { st.preset = "custom"; $("preset").value = "custom"; }
  function syncLams() { LAMS.forEach(([k]) => { $("lam-" + k).value = st.lam[k]; $("lam-" + k + "-o").textContent = pct(st.lam[k]); }); }
  function sync() {
    const sec = SECTORS[st.sector];
    $("preset").value = st.preset;
    ["irr", "muni"].forEach((s) => $("sec-" + s).setAttribute("aria-pressed", String(st.sector === s)));
    $("qq").textContent = sec.quickQ; $("qs").textContent = sec.slowQ;
    $("quick-river-l").textContent = sec.quick.river; $("quick-sink-l").textContent = sec.quick.sink;
    $("slow-aq-l").textContent = sec.slow.aq; $("slow-sink-l").textContent = sec.slow.sink;
    $("quick-" + st.quick).checked = true; $("slow-" + st.slow).checked = true;
    KEYS.forEach((k) => { $("nm-" + k).textContent = sec.labels[k][0]; $("nm2-" + k).textContent = sec.labels[k][1]; $("b-" + k).value = st.before[k]; $("a-" + k).value = st.after[k]; });
    syncLams();
    $("dt").value = st.dt; $("db").value = st.db; $("lag").value = st.lag;
    ["scn", "base"].forEach((v) => $("view-" + v).setAttribute("aria-pressed", String(st.view === v)));
  }

  // ---------- drawing ----------
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function ledgerNodes(x, r, sec) {
    const n = [
      { label: "Left in river", v: x.left || 0, basin: "early" },
      { label: sec.labels.q[0] + (r.qSink ? " (to sink)" : ""), v: x.q, basin: r.qSink ? "dep" : "early" },
      { label: sec.labels.s[0] + (r.sSink ? " (to sink)" : ""), v: x.s, basin: r.sSink ? "dep" : "late" },
    ];
    if ((x.bank || 0) > 1e-9) n.push({ label: "Banked recharge", v: x.bank, basin: "late" });
    n.push({ label: sec.labels.cn[0], v: x.cn, basin: "dep" }, { label: sec.labels.cb[0], v: x.cb, basin: "dep" });
    return n;
  }
  function drawSankey(r) {
    const svg = $("sankey"); svg.replaceChildren();
    const sec = SECTORS[st.sector];
    const x = st.view === "base" ? { left: 0, ...st.before, bank: 0 } : r.fin;
    const nodes = ledgerNodes(x, r, sec);
    const total = nodes.reduce((s, n) => s + n.v, 0);
    const H = 360, top = 12, bottom = 12, gap = 18, xl = 226, nw = 11, xr = 404;
    const k = (H - top - bottom - gap * (nodes.length - 1)) / Math.max(total, 1e-9);
    let y = top;
    nodes.forEach((n) => { n.y = y; n.h = Math.max(n.v * k, 0); y += n.h + gap; });
    const BAS = [["early", "Early in river"], ["late", "Late, via aquifer"], ["dep", "Depleted (ET or sink)"]];
    const tot = { early: 0, late: 0, dep: 0 };
    nodes.forEach((n) => (tot[n.basin] += n.v));
    const rgap = 30, rh = BAS.reduce((s, [b]) => s + tot[b] * k, 0) + rgap * 2;
    let ry = (H - rh) / 2;
    const rp = {};
    BAS.forEach(([b]) => { rp[b] = { y: ry, h: tot[b] * k, fill: ry }; ry += tot[b] * k + rgap; });
    nodes.forEach((n) => {
      if (n.v <= 1e-9) return;
      const a0 = n.y, a1 = n.y + n.h, b0 = rp[n.basin].fill, b1 = b0 + n.h;
      rp[n.basin].fill = b1;
      const x0 = xl + nw, x1 = xr, xm = (x0 + x1) / 2;
      svg.appendChild(el("path", { d: `M${x0},${a0} C${xm},${a0} ${xm},${b0} ${x1},${b0} L${x1},${b1} C${xm},${b1} ${xm},${a1} ${x0},${a1} Z`, class: "f-" + n.basin, "fill-opacity": n.basin === "early" ? 0.5 : 0.38 }));
    });
    nodes.forEach((n) => {
      svg.appendChild(el("rect", { x: xl, y: n.y, width: nw, height: Math.max(n.h, 1), class: "f-" + n.basin }));
      const t = el("text", { x: xl - 8, y: n.y + n.h / 2, "text-anchor": "end", "dominant-baseline": "middle", class: "sk-lab" + (n.v <= 1e-9 ? " zero" : "") });
      t.appendChild(el("tspan", {}, n.label + "  ")); t.appendChild(el("tspan", { class: "sk-val" }, fmt(n.v)));
      svg.appendChild(t);
    });
    BAS.forEach(([b, lab]) => {
      const p = rp[b];
      svg.appendChild(el("rect", { x: xr, y: p.y, width: nw, height: Math.max(p.h, 1), class: "f-" + b }));
      svg.appendChild(el("text", { x: xr + nw + 8, y: p.y + p.h / 2 - 7, "dominant-baseline": "middle", class: "sk-lab" + (b === "dep" ? " sk-dep" : "") }, lab));
      let v = fmt(tot[b]);
      if (b === "dep" && st.view === "scn") v += `  (Δ ${sfmt(tot[b] - r.P0.D)})`;
      svg.appendChild(el("text", { x: xr + nw + 8, y: p.y + p.h / 2 + 8, "dominant-baseline": "middle", class: "sk-val" + (b === "dep" ? " sk-dep" : "") }, v));
    });
  }
  function niceStep(x) { const p = 10 ** Math.floor(Math.log10(x)); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function drawHydro(r) {
    const svg = $("hydro"); svg.replaceChildren();
    const W = 640, H = 250, pl = 46, pr = 10, pt = 12, pb = 26;
    const m = Math.max(0.5, ...r.nodeA.map(Math.abs), ...r.nodeB.map(Math.abs));
    const step = niceStep(m / 2.5), ym = Math.ceil(m / step) * step;
    const y = (v) => pt + ((ym - v) / (2 * ym)) * (H - pt - pb);
    for (let v = -ym; v <= ym + 1e-9; v += step) {
      svg.appendChild(el("line", { x1: pl, x2: W - pr, y1: y(v), y2: y(v), class: Math.abs(v) < 1e-9 ? "ax0" : "ax" }));
      svg.appendChild(el("text", { x: pl - 6, y: y(v), "text-anchor": "end", "dominant-baseline": "middle", class: "ax-t" }, fmt(v, step < 1 ? 1 : 0)));
    }
    const gw = (W - pl - pr) / 12, bw = gw * 0.34;
    for (let t = 0; t < 12; t++) {
      const gx = pl + t * gw + gw / 2;
      [[r.nodeA[t], "bar-a", -bw - 1], [r.nodeB[t], "bar-b", 1]].forEach(([v, c, dx]) => {
        const y0 = y(Math.max(v, 0)), y1 = y(Math.min(v, 0));
        svg.appendChild(el("rect", { x: gx + dx, y: y0, width: bw, height: Math.max(y1 - y0, 0.5), class: c })).appendChild(el("title", {}, `${MONTHS[t]}: ${fmt(v)}`));
      });
      svg.appendChild(el("text", { x: gx, y: H - 8, "text-anchor": "middle", class: "ax-t" }, MONTHS[t]));
    }
    const sA = r.nodeA.reduce((a, b) => a + b, 0), sB = r.nodeB.reduce((a, b) => a + b, 0);
    $("hydro-cap").textContent = `Units of water per month, compared with the baseline. Over the year, Node A changes by ${sfmt(sA)} and Node B by ${sfmt(sB)}; the Node B total equals the basin's gain (positive) or loss (negative). Slow returns take ${fmt(st.lag)} months on average to arrive.`;
  }
  function drawTable(r) {
    const P0 = r.P0, Pt = r.Pt, f = r.fin;
    const rows = [
      ["Beneficial consumption (crops, lawns)", P0.cb, Pt.cb, f.cb],
      ["Other consumption (evaporation, weeds)", P0.cn, Pt.cn, f.cn],
      ["Outflow lost to a sink", P0.N, Pt.N, r.N1],
      ["Return flow that stays in the basin", P0.R, Pt.R, r.R1],
    ];
    let h = `<thead><tr><th>Part of the water balance</th><th>Before</th><th>After practice</th><th>After reuse</th><th>Freed by the practice</th></tr></thead><tbody>`;
    rows.forEach(([n, x0, xt, x1]) => { h += `<tr><td>${n}</td><td>${fmt(x0)}</td><td>${fmt(xt)}</td><td>${fmt(x1)}</td><td>${fmt(x0 - xt)}</td></tr>`; });
    h += `<tr class="tot"><td>Depletion (consumed or lost)</td><td>${fmt(P0.D)}</td><td>${fmt(Pt.D)}</td><td>${fmt(r.D1)}</td><td>${fmt(r.Fwet)} wet saving</td></tr>`;
    h += `<tr class="tot"><td>Withdrawal</td><td>${fmt(P0.W)}</td><td>${fmt(Pt.W)}</td><td>${fmt(r.W1)}</td><td>${fmt(r.F)} reported saving</td></tr>`;
    h += `<tr><td>Left in river (protected)</td><td>0</td><td>—</td><td>${fmt(f.left)}</td><td></td></tr></tbody>`;
    $("states").innerHTML = h;
  }

  function render() {
    const r = compute(st);
    $("w0").textContent = fmt(r.P0.W); $("wt").textContent = fmt(r.Pt.W);
    $("dt-o").textContent = fmt(st.dt, 2); $("db-o").textContent = fmt(st.db, 2); $("lag-o").textContent = fmt(st.lag) + " mo";
    $("du-note").textContent = `Water re-applied by the same user is used with the new technology, so ${pct(r.du)} of it is consumed.`;
    $("s-F").textContent = fmt(r.F);
    const sD = $("s-D");
    sD.textContent = sfmt(r.dD);
    sD.className = "v " + (r.dD > 0.05 ? "bad" : r.dD < -0.05 ? "good" : "");
    $("s-D-s").textContent = r.dD > 0.05 ? `Water consumed or lost to the basin each year. Here it rises by ${fmt(r.dD)}: the basin loses water.` : r.dD < -0.05 ? `Water consumed or lost to the basin each year. Here it falls by ${fmt(-r.dD)}: the basin gains water.` : "Water consumed or lost to the basin each year. Here it does not change.";
    const sp = $("s-phi");
    sp.textContent = fmt(r.phi, 2);
    sp.className = "v " + (r.phi < -0.005 ? "bad" : "");
    $("s-W").textContent = sfmt(r.dW);
    $("code").textContent = r.code;
    $("code-exp").innerHTML = `<b>Practice code.</b> ${TYPE_TEXT[r.type]} ${DISP_TEXT[r.disposition]}`;
    const tot = Math.abs(r.Fwet) + Math.abs(r.Fdry) || 1;
    $("bar-wet").style.width = (Math.abs(r.Fwet) / tot) * 100 + "%";
    $("bar-dry").style.width = (Math.abs(r.Fdry) / tot) * 100 + "%";
    $("lab-wet").textContent = "wet " + fmt(r.Fwet) + ": would have been consumed or lost"; $("lab-dry").textContent = "dry " + fmt(r.Fdry) + ": would have returned anyway";
    let sign;
    if (r.F <= 1e-9) sign = "The practice frees no withdrawal, so there is nothing to protect or re-apply. Any effect comes through timing and routing.";
    else {
      const used = r.F * r.sumLd;
      sign = used < 0.05
        ? `None of the freed water is consumed again, so the basin keeps the whole wet saving of ${fmt(r.Fwet)}.`
        : `The basin loses water when the freed water that is used again consumes more than the wet saving. Here reuse consumes ${fmt(used)} units against a wet saving of ${fmt(r.Fwet)}.`;
      if (r.du > 1e-9) {
        const th = r.Fwet / (r.F * r.du);
        sign += th < 1 ? ` If the rest were protected, re-applying more than ${pct(Math.max(th, 0))} of the freed water would make the basin worse off.` : " Even if the user re-applied all of it, the basin would not lose water.";
      }
    }
    $("sign").innerHTML = sign;
    drawSankey(r); drawHydro(r); drawTable(r);
  }

  buildControls();
  load("mod-trust");
  sync();
  render();
})();
