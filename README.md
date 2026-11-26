# Conserved Water Ledger

An interactive what-if tool for *The Fate of Conserved Water* (Jonathan Yoder, Washington State University; manuscript in draft). Pick a conservation practice, its hydrologic setting, and where the freed water goes. The tool reports the saving the way a program would, then shows what the basin receives and when.

All numbers in the examples are illustrative, not estimates.

## What it shows

- **Summary:** the reported saving $F$, the change in basin depletion $\Delta D$, the efficacy ratio $\varphi = -\Delta D / F$, the change in observed withdrawal, the practice code (for example `C·rebound`), the wet/dry split of $F$, and the rebound sign condition.
- **Two-ledger Sankey:** where each unit of the diversion goes at the point of use, and what the basin sees (early in the river, late via the aquifer, depleted).
- **Monthly flow change** at two nodes: below the diversion and above the returns, and below all returns.
- **Three states of the use:** state 0 (before), state τ (practice in place, freed water unused), state 1 (after disposition).

## Run it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Test it

Node 18 or later:

```bash
npm test
```

The tests pin the paper's scenario table (Table 4) and check the identities of Equations (3)–(5) for every example. If a test fails after a model change, the manuscript may need the same change.

## Layout

| Path | Role |
| --- | --- |
| `src/model.js` | Model core: pure functions for Equations (1)–(5). Runs in the browser (`WaterModel`) and in Node. |
| `src/presets.js` | Sectors (irrigation, municipal) and example scenarios. |
| `src/app.js` | User interface: controls and drawing. |
| `index.html` | Page markup and styles. |
| `test/model.test.js` | Tests (`node --test`). |
| `scripts/build-artifact.js` | Builds `dist/artifact.html` for publishing as a claude.ai Artifact. |
| `docs/ROADMAP.md` | Architecture and next steps. |

## Model assumptions (v0.1)

One use and one diversion; re-applied, transferred, and banked water pass through the same diversion. Re-applied water uses the post-practice technology. The transferee depletes $d_t$ and returns the rest on the quick path. Banked water loses $d_b$ and returns the rest through the aquifer. Timing is a steady annual cycle with an exponential lag for slow returns. See `docs/ROADMAP.md` for what comes next.
