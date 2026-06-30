// lib/admin.js — single source of truth for the private admin key.
//
// The key MUST be set in the environment. On Vercel:
//   Project → Settings → Environment Variables → REVIEW_ADMIN_KEY = <a long random string>
// There is intentionally NO hard-coded fallback: a default committed to the repo
// would let anyone who reads the code open the private dashboard or wipe data.
export const ADMIN_KEY = process.env.REVIEW_ADMIN_KEY || '';

/** True only when a real key is configured AND the request supplied it. */
export function isAdmin(req) {
  const supplied = (req && req.query && req.query.key) || '';
  return ADMIN_KEY.length > 0 && supplied === ADMIN_KEY;
}
