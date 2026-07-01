/*
 * scripts/lib/audit-common.mjs
 * Shared helpers for the report-only automation scripts.
 *
 * SAFETY: read-only. Nothing here writes to the site, touches secrets, pushes,
 * or deploys. Reports are written only under reports/automation/ (gitignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REPORTS_DIR = path.join(ROOT, 'reports', 'automation');

// Private/admin dashboards — excluded from "public page" scans.
export const ADMIN_PAGES = new Set(['leads', 'moderate', 'stats']);

export function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
export function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

export function allHtml() {
  return fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')).sort();
}
export function publicHtml() {
  return allHtml().filter((k) => !ADMIN_PAGES.has(k));
}

/** Write a report pair to reports/automation/<slug>.{json,md}. Returns the md path. */
export function writeReport(slug, json, md) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORTS_DIR, `${slug}.json`), JSON.stringify(json, null, 2));
  fs.writeFileSync(path.join(REPORTS_DIR, `${slug}.md`), md);
  return path.relative(ROOT, path.join(REPORTS_DIR, `${slug}.md`)).replace(/\\/g, '/');
}

export function li(arr, empty = 'none') {
  return arr && arr.length ? arr.map((x) => `  - ${x}`).join('\n') : `  - ${empty}`;
}

/** Best-effort git command; returns stdout string or null (never throws). */
export function git(args) {
  try { return execSync('git ' + args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); }
  catch { return null; }
}

/** Internal hrefs like href="/book" (lowercase + hyphen route form). */
export function internalHrefs(html) {
  return [...html.matchAll(/href="(\/[a-z0-9-]*)"/g)].map((m) => m[1]);
}

/** Parse the local catalog out of assets/explorer.js (P references the U url map). */
export function loadCatalog() {
  const ex = read('assets/explorer.js');
  const U = (() => {
    const i = ex.search(/var U\s*=/); if (i < 0) return {};
    const s = ex.indexOf('{', i), e = ex.indexOf('};', s) + 1;
    try { return new Function('return (' + ex.slice(s, e) + ')')(); } catch { return {}; }
  })();
  const P = (() => {
    const a = ex.indexOf('var P=['), b = ex.indexOf('var IMG=');
    if (a < 0 || b < 0) return [];
    const seg = ex.slice(a + 6, b), t = seg.slice(seg.indexOf('['), seg.lastIndexOf(']') + 1);
    try { return new Function('U', 'return (' + t + ')')(U); } catch { return []; }
  })();
  const evalLit = (name) => {
    const i = ex.indexOf('var ' + name + '='); if (i < 0) return {};
    let j = ex.indexOf('=', i) + 1; while (ex[j] === ' ') j++;
    const open = ex[j], close = open === '[' ? ']' : '}';
    let depth = 0, inStr = false, q = '';
    for (let k = j; k < ex.length; k++) {
      const c = ex[k];
      if (inStr) { if (c === '\\') { k++; continue; } if (c === q) inStr = false; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
      if (c === open) depth++;
      else if (c === close && --depth === 0) { try { return new Function('return (' + ex.slice(j, k + 1) + ')')(); } catch { return {}; } }
    }
    return {};
  };
  return { P, IMG: evalLit('IMG'), PRICES: evalLit('PRICES'), VALUES: evalLit('VALUES'), U };
}

/** Names in recommender.js CAT{} (the products the quiz can rank/add). */
export function recommenderCatNames() {
  try {
    const src = read('assets/recommender.js');
    const i = src.indexOf('const CAT');
    if (i < 0) return [];
    const s = src.indexOf('{', i), close = matchBrace(src, s);
    const names = [...src.slice(s, close).matchAll(/name:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
    return names;
  } catch { return []; }
}
function matchBrace(src, open) {
  let depth = 0, inStr = false, q = '';
  for (let k = open; k < src.length; k++) {
    const c = src[k];
    if (inStr) { if (c === '\\') { k++; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return k + 1;
  }
  return src.length;
}

/** Today (respects a MOCK_NOW=YYYY-MM-DD env for deterministic tests). */
export function now() {
  const m = process.env.MOCK_NOW;
  return m ? new Date(m + 'T12:00:00Z') : new Date();
}

export function reportHeader(title, note) {
  return `# ${title}\n_Generated: ${new Date().toISOString()}_ — **report only, nothing changed**\n${note ? `\n> ${note}\n` : ''}`;
}
