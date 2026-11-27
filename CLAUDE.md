# Conserved Water Ledger — tool repo

Interactive what-if tool for Jon Yoder's manuscript *The Fate of Conserved Water*. The manuscript lives in `yoderwsu/water-conservation` (edited in Overleaf); this repo holds only the tool.

## Rules

- `src/model.js` mirrors the manuscript's equations and notation. States 0 (before), τ (practice in place, freed water unused), 1 (after disposition). F = −Δ^τW, F_wet = −Δ^τD, F_dry = −Δ^τR; ΔD = −F_wet + F·Σλ_i·d_i; φ = −ΔD/F. Keep the model free of DOM code.
- `test/model.test.js` pins the manuscript's scenario table (`tab:scenarios`; Table 4 as of 2026-11-27). Run `npm test` after any model change. If the paper's numbers or notation change, update the model and tests to match, and the reverse.
- No build step and no runtime dependencies for the page. Scripts load as classic scripts (UMD globals `WaterModel`, `WaterPresets`) so `index.html` works from `file://`.
- Equations in the "Model and assumptions" section are MathML, generated from each `<span class="tex" data-tex="...">` by `npm run render:math` (dev dependency temml; run `npm install` once). Edit the `data-tex` LaTeX, then rerun the script and commit the result. Equation numbers there must match the manuscript.
- Panel text stays in plain words, with no equations or symbols; equations belong only in "Model and assumptions".
- `types.html` defines the practice types and dispositions in plain words. Keep it in step with `practiceCode` in `src/model.js` and with the manuscript's typology (Table `tab:types`).
- Example numbers are illustrative, not estimates; the page says so.
- Prose in the README and docs follows Jon's writing standard (`yoderwsu/writing-standards`) where it applies.

## Live site

GitHub Pages serves `main` (root) at https://yoderwsu.github.io/water-conservation-tool/. Pushing to `main` redeploys it; keep `index.html` at the root and its script paths relative.

## Publishing the Artifact

The tool is also published as a private claude.ai Artifact: https://claude.ai/artifact/CzXkXJRv9GnKXHcyjcutKH

1. `npm run build:artifact` writes `dist/artifact.html` (index.html without the document wrapper).
2. Publish with the Artifact tool: `url` set to the link above, `file_path` set to `dist/artifact.html`, and `files` mapping `src/model.js`, `src/presets.js`, `src/app.js`, and `types.html` to the repo files of the same names. The repo must be one of the session's working directories.
