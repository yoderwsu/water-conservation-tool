# Architecture and roadmap

## Principles

1. **The model core is the paper.** `src/model.js` evaluates the manuscript's equations and nothing else. It has no DOM access, so it can be tested in Node and reused by other front ends.
2. **Tests pin the paper.** `test/model.test.js` reproduces the manuscript's scenario table. A change to the model that moves those numbers is a change to the paper, and the reverse.
3. **Static first.** The tool runs from plain files with no server and no build. It can be hosted anywhere (GitHub Pages, an agency web server, a claude.ai Artifact) and opened offline.
4. **Data separate from code.** Practices, settings, and parameter values live in data files (`src/presets.js` now; a parameter library later), so that hydrologists can review and extend them without reading the model.

## Current version (v0.1)

- One use, one diversion, two river nodes.
- Four physical paths (beneficial ET, non-beneficial ET, quick path, slow path), each classed as recoverable or not by the setting.
- Four dispositions with linked shares; transferee and banking depletion fractions.
- Steady-state monthly timing with an exponential lag kernel.
- Practice code: Type A if the practice cuts beneficial consumption, otherwise B or C by wet versus dry; D if the practice frees no withdrawal.

## Next steps

### v0.2: Parameter library and uncertainty
- Move practices and settings into a data file (JSON or CSV) with ranges, not single values, for each fraction and lag. Start from Washington practice inventories and program records (manuscript Section 8, "Parameter library").
- Add Monte Carlo draws over the ranges and show a distribution for $\varphi$ and $\Delta D$, not one number.
- Export a disclosure record (practice code, $F$, $F_{wet}$, $F_{dry}$, $\Delta D$, $\varphi$, expected sign of $\Delta Q$ at named nodes) in the format of the manuscript's "Disclosure template".

### v0.3: Timing and routing
- Replace the single exponential kernel with kernels by return path and setting, including multi-year lags for canal seepage reaching springs.
- Let users name nodes and set which returns enter above or below each node.
- Add banking schedules: recharge in one season, recovery in another.

### v0.4: Basin network
- Several uses and diversions on one river, each with its own practices, and a portfolio view that sums them.
- Transfer kernels $h_{jk}$ estimated from groundwater–surface water models for a pilot basin (Walla Walla or Yakima), loaded as data.
- Compare the summed portfolio against observed depletion (ET remote sensing).

### Later
- Co-effects: evaporative cooling ($L_v$ times the ET cut) and water quality loads carried by return flows.
- Source substitution (lever 5) with separate ledgers per source.

## Platform options

| Option | When it fits |
| --- | --- |
| Static site (this repo, GitHub Pages) | Default. Free, no server, easy to share and archive with the paper. |
| claude.ai Artifact | Quick private sharing and review; built with `npm run build:artifact`. |
| Python package mirroring `model.js` | If the parameter library and Monte Carlo work move to notebooks. Keep both cores tested against the same scenario table. |
| Web app with a server | Only if users need accounts, saved scenarios shared across an agency, or large basin models. |
