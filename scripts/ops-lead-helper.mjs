#!/usr/bin/env node
/*
 * scripts/ops-lead-helper.mjs — ADMIN ONLY. Runs only with KV env present.
 * Ranks leads/referrals by a simple likely-value heuristic into a PRIVATE,
 * gitignored report for Luke's own follow-up. Contacts NO ONE. Sends nothing.
 * Contact info is masked in the report.
 */
import { writeOpsReport, hasKvEnv, stamp } from '../ops/lib/ops-common.mjs';

if (!hasKvEnv()) { console.log('Lead helper → SKIPPED (no KV env). Nothing queried.'); process.exit(0); }

let kv;
try { ({ kv } = await import('@vercel/kv')); }
catch { console.log('Lead helper → @vercel/kv not installed; run npm install. Skipped.'); process.exit(0); }

const leads = (await kv.lrange('leads:v1', 0, 199).catch(() => [])) || [];

const mask = (s) => { s = String(s || ''); if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) + '***@' + d); } return s.replace(/\d(?=\d{2})/g, '•'); };
function score(l) {
  let s = 0; const why = [];
  if (l && l.contactType === 'phone') { s += 2; why.push('phone (fastest)'); }
  if (l && l.note && String(l.note).length > 10) { s += 2; why.push('left a note'); }
  if (l && /refer/i.test(JSON.stringify(l.source || l.type || ''))) { s += 3; why.push('referral'); }
  if (l && l.when && l.when !== '') { s += 1; why.push('gave a time'); }
  return { s, why };
}

const ranked = leads.map((l, i) => {
  const { s, why } = score(l);
  return { rank: 0, score: s, why, name: (String(l && l.name || 'lead').split(' ')[0] || 'lead'), contact: mask(l && l.contact), when: (l && l.when) || 'any' };
}).sort((a, b) => b.score - a.score);
ranked.forEach((r, i) => (r.rank = i + 1));

const md = `# Lead / Referral Priority — PRIVATE (for Luke only)
_Generated: ${stamp()} — no one was contacted; contact info masked. This report is gitignored._

- Total leads: **${leads.length}**

${ranked.length ? ranked.slice(0, 30).map((r) => `${r.rank}. **${r.name}** — score ${r.score} (${r.why.join(', ') || 'basic'}) · ${r.contact} · when: ${r.when}`).join('\n') : '- No leads found.'}

Reach out yourself when you're ready — this helper only prioritizes; it never messages anyone.
`;
const out = writeOpsReport('lead-priority.md', md);
console.log(`Lead helper → ${out} · leads:${leads.length} (no contact made)`);
