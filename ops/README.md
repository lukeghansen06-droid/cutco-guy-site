# Ops Agent

A controlled background-job system for cutcowithluke.com. It can do useful work
(audits, drafts, prioritization) **with permissions** — but it can never push, deploy,
touch secrets, or change the public site / prices / photos / reviews on its own.

## Folder map
```
ops/
  README.md            this file
  jobs/registry.mjs    the job registry (single source of truth)
  lib/ops-common.mjs   shared read-only helpers
  reports/             generated run reports (gitignored)
  approvals/           approval queue: README + example templates (committable),
                       working files + drafts (gitignored)
scripts/run-job.mjs    the runner
```

## Risk levels (permissions)
| Level | Icon | Can do | Cannot do |
|---|---|---|---|
| `safe_report` | 🟢 | read public files, write reports | change any site file |
| `draft_only` | 🟡 | write drafts/recommendations to `ops/approvals/` | apply anything |
| `approval_required` | 🟠 | prepare/apply exact diffs **from an approval file** | apply without approval + `--apply` |
| `admin_only` | 🔴 | read KV **only if env present**; counts-only reports | commit private data |

## Quick start
```bash
npm run ops:list          # list every job + risk level
npm run ops:safe          # run all non-mutating jobs (safe_report + draft_only)
npm run ops:daily         # the daily set
npm run ops:weekly        # the weekly set
npm run ops:preflight     # bun test + full preflight
npm run ops:price-review  # draft the manual price re-verification checklist
npm run ops:admin-digest  # private counts (only if KV env present)

# run any single job:
node scripts/run-job.mjs <job-id>
# apply a mutating job (needs an approval file):
node scripts/run-job.mjs apply-approved-price-updates --apply
```

## Hard guarantees
- Batch modes (`--all-safe`/`--daily`/`--weekly`) never apply and never run mutations.
- Mutations happen only on a single-job run with `--apply` **and** a valid approval file.
- Admin jobs skip cleanly when KV env is absent.
- Nothing here pushes, deploys, prints secrets, or invents prices/reviews.

See `docs/OPS_AGENT.md` for the full guide and `ops/approvals/README.md` for the approval flow.
