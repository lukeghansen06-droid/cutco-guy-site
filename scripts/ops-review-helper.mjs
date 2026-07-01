#!/usr/bin/env node
/*
 * scripts/ops-review-helper.mjs — ADMIN ONLY. Runs only with KV env present.
 * Lists pending review count and flags link-heavy / spammy ones as suggestions.
 * NEVER approves or rejects anything. Writes a gitignored private report.
 * Report avoids PII: uses review id + a short redacted preview only.
 */
import { writeOpsReport, hasKvEnv, stamp, li } from '../ops/lib/ops-common.mjs';

if (!hasKvEnv()) { console.log('Review helper → SKIPPED (no KV env). Nothing queried.'); process.exit(0); }

let kv;
try { ({ kv } = await import('@vercel/kv')); }
catch { console.log('Review helper → @vercel/kv not installed; run npm install. Skipped.'); process.exit(0); }

const pending = (await kv.get('reviews:pending').catch(() => [])) || [];

function spamScore(r) {
  const text = String(r && r.text || '');
  const links = (text.match(/https?:\/\/|www\.|\.[a-z]{2,}\//gi) || []).length;
  let score = 0; const reasons = [];
  if (links >= 1) { score += 2 * links; reasons.push(`${links} link(s)`); }
  if (/\b(viagra|casino|crypto|loan|seo services|backlink)\b/i.test(text)) { score += 5; reasons.push('spam keyword'); }
  if (text.length < 12) { score += 1; reasons.push('very short'); }
  if ((text.match(/[A-Z]/g) || []).length > text.length * 0.6 && text.length > 10) { score += 1; reasons.push('shouty caps'); }
  return { score, reasons };
}

const flagged = [];
pending.forEach((r, i) => {
  const { score, reasons } = spamScore(r);
  const id = (r && r.id) || `#${i}`;
  const preview = String(r && r.text || '').replace(/https?:\/\/\S+/g, '[link]').slice(0, 60);
  if (score >= 2) flagged.push({ id, score, reasons, suggestion: score >= 4 ? 'likely reject' : 'review manually', preview });
});

const md = `# Review Moderation Helper — PRIVATE (suggestions only)
_Generated: ${stamp()} — nothing was approved or rejected. PII redacted._

- Pending reviews: **${pending.length}**
- Flagged as spammy/link-heavy: **${flagged.length}**

${flagged.length ? flagged.sort((a, b) => b.score - a.score).map((f) => `- \`${f.id}\` — score ${f.score} (${f.reasons.join(', ')}) → **${f.suggestion}** — "${f.preview}…"`).join('\n') : '- No obviously spammy pending reviews. ✅'}

Approve/reject manually in the admin dashboard (/moderate). This helper never acts.
`;
const out = writeOpsReport('review-moderation.md', md);
console.log(`Review helper → ${out} · pending:${pending.length} flagged:${flagged.length} (no action taken)`);
