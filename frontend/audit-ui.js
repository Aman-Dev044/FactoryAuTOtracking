/**
 * Final UI audit. Run from the frontend directory: `node audit-ui.js`
 *
 * Flags the things that silently look broken rather than failing the build:
 * stale icon sets, hardcoded colours that ignore the theme, and fixed widths
 * that break small screens.
 */
const fs = require('fs');
const path = require('path');

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
    else if (/\.(jsx?|css)$/.test(e.name)) files.push(p);
  }
})('src');

const findings = { hi: [], hex: [], darkbg: [], fixed: [], rgba: [] };

// Surfaces that are deliberately literal: printed paper must not follow the theme.
const PRINT_SAFE = /data-theme=["']light["']|printable|@media print/;

/**
 * Places where a literal colour is the correct answer, so the audit stays
 * signal-only:
 *  - ThemeContext writes the browser chrome colour, which must be a real value.
 *  - OrgContext picks readable text to sit ON the tenant's brand fill.
 *  - AIChatbot paints white on its brand-coloured header.
 */
const BY_DESIGN = [
  /context[\\/]ThemeContext\.jsx$/,
  /context[\\/]OrgContext\.jsx$/,
  /chat[\\/]AIChatbot\.jsx$/,
];

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const rel = path.relative('src', f);
  const isCss = f.endsWith('.css');
  const printSafe = PRINT_SAFE.test(raw) || BY_DESIGN.some((r) => r.test(f));

  if (/react-icons\/hi/.test(raw)) findings.hi.push(rel);

  const srcLines = raw.split(String.fromCharCode(10));
  srcLines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;

    // White IS correct on a saturated brand fill. Mark such a spot with
    // 'on-brand' in a nearby comment and the audit trusts it.
    if (/on-brand/.test(srcLines.slice(Math.max(0, i - 5), i + 1).join(' '))) return;

    // The token layer is where literal colours belong.
    if (isCss && /index\.css|ui\.css/.test(rel)) return;

    // White/near-black as text is fine (it sits on a coloured fill).
    const hexes = line.match(/#[0-9a-fA-F]{6}\b/g) || [];
    for (const h of hexes) {
      const low = h.toLowerCase();
      if (low === '#ffffff' && /color:/.test(line) && !/background/.test(line)) continue;
      if (printSafe) continue;
      findings.hex.push(`${at}  ${h}`);
    }

    // A literal light background will stay light in dark mode.
    if (!printSafe && /background[^:]*:\s*['"]?#(fff|ffffff|f8fafc|f1f5f9)\b/i.test(line)) {
      findings.darkbg.push(`${at}  ${line.trim().slice(0, 80)}`);
    }

    // Translucent white was a dark-theme trick; it is invisible on light surfaces.
    // (Legitimate on a saturated brand fill, which BY_DESIGN covers.)
    if (!printSafe && /rgba\(255,\s*255,\s*255/.test(line) && !/color:/.test(line)) {
      findings.rgba.push(`${at}  ${line.trim().slice(0, 80)}`);
    }

    // Fixed pixel widths over ~420px overflow a 360px phone.
    const w = line.match(/width:\s*['"]?(\d{3,4})px/);
    if (w && Number(w[1]) > 420 && !/max-?width/i.test(line) && !/min\(/.test(line)) {
      findings.fixed.push(`${at}  width:${w[1]}px`);
    }
  });
}

const report = (label, list, limit = 25) => {
  console.log(`\n${label}: ${list.length}`);
  list.slice(0, limit).forEach((x) => console.log('   ' + x));
  if (list.length > limit) console.log(`   … and ${list.length - limit} more`);
};

report('Files still importing react-icons/hi', findings.hi);
report('Hardcoded hex colours (theme-blind)', findings.hex);
report('Literal light backgrounds (break dark mode)', findings.darkbg);
report('Translucent-white leftovers (invisible on light)', findings.rgba);
report('Fixed widths > 420px (break 360px phones)', findings.fixed);

const total = Object.values(findings).reduce((a, b) => a + b.length, 0);
console.log(`\n${total === 0 ? 'CLEAN — no findings' : total + ' finding(s) total'}`);
