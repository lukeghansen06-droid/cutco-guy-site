#!/usr/bin/env node
/*
 * scripts/check-cache-bump.mjs — REPORT ONLY (warn, never auto-bump).
 * If assets/*.js or assets/*.css changed but sw.js CACHE was not bumped, warn.
 * Uses git to compare the working tree against origin/main (fallback: HEAD).
 * Writes reports/automation/cache-bump.{md,json}.
 */
import { read, git, writeReport, reportHeader, li } from './lib/audit-common.mjs';

const currentCache = (read('sw.js').match(/const CACHE\s*=\s*['"]([^'"]+)['"]/) || [])[1] || 'UNKNOWN';

// Determine the compare base: origin/main if present, else HEAD.
let base = 'origin/main';
if (!git('rev-parse --verify origin/main')) base = git('rev-parse --verify HEAD') ? 'HEAD' : null;

let changed = [];
if (base) {
  const diff = (git(`diff --name-only ${base}`) || '') + '\n' + (git('diff --name-only') || '') + '\n' + (git('status --porcelain') || '').replace(/^...?/gm, '');
  changed = [...new Set(diff.split('\n').map((s) => s.trim()).filter(Boolean))];
}
const assetChanged = changed.filter((f) => /^assets\/.+\.(js|css)$/.test(f));
const swChanged = changed.some((f) => f === 'sw.js');
const needsBump = assetChanged.length > 0 && !swChanged;

const json = {
  generatedAt: new Date().toISOString(), reportOnly: true, compareBase: base || 'none (not a git repo)',
  currentCache, changedAssetFiles: assetChanged, swJsChanged: swChanged, needsBump,
};
const md = `${reportHeader('Service-Worker Cache-Bump Check — Report Only')}
## Summary
- Current \`sw.js\` CACHE: **${currentCache}**
- Compare base: \`${base || 'none'}\`
- Changed asset JS/CSS files: **${assetChanged.length}** · sw.js changed: **${swChanged ? 'yes' : 'no'}**
- **Verdict:** ${needsBump ? '⚠️ CSS/JS changed but sw.js CACHE was NOT bumped — bump it by one version.' : '✅ OK (either nothing changed or sw.js was already bumped).'}

## Changed asset files
${li(assetChanged)}
`;
const out = writeReport('cache-bump', json, md);
console.log(`Cache-bump check → ${out}`);
console.log(`${needsBump ? 'WARN' : 'PASS'} · cache:${currentCache} assetsChanged:${assetChanged.length} swChanged:${swChanged}`);
process.exitCode = 0; // advisory warning only
