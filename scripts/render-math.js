// Typeset the equations in index.html as MathML, in place.
// Each <span class="tex" data-tex="..."> gets its MathML filled in from its
// data-tex attribute ("tex d" = display style). The page then needs no math
// library at runtime: browsers draw MathML natively.
// Run after editing any data-tex attribute:  npm run render:math
// (needs the dev dependency temml: npm install)
"use strict";
const fs = require("fs");
const path = require("path");
const temml = require("temml");
const file = path.join(__dirname, "..", "index.html");
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
let n = 0;
const html = fs.readFileSync(file, "utf8").replace(
  /(<span class="tex( d)?" data-tex="([^"]*)">)[\s\S]*?(<\/span>)/g,
  (_, open, d, tex, close) => {
    n++;
    return open + temml.renderToString(unescape(tex), { displayMode: !!d, throwOnError: true }) + close;
  }
);
fs.writeFileSync(file, html);
console.log(`typeset ${n} expressions in index.html`);
