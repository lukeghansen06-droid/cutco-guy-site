// api/reviews.js
import { validateReview } from "../lib/validate.js";
const KEY = "reviews:v1";
export async function handleReviews(req, kv) {
  if (req.method === "GET") {
    const reviews = (await kv.lrange(KEY, 0, 49)) || [];
    return { status:200, json:{ reviews, count: reviews.length } };
  }
  if (req.method === "POST") {
    const v = validateReview(req.body || {});
    if (!v.ok) return { status:400, json:{ ok:false, error:v.error } };
    const review = { id: crypto.randomUUID(), ...v.clean, ts: Date.now() };
    await kv.lpush(KEY, review);
    return { status:200, json:{ ok:true, review } };
  }
  return { status:405, json:{ ok:false, error:"method" } };
}
// Vercel adapter — lazy-imports kv so bun test (no @vercel/kv installed) can still
// import handleReviews without hitting the real KV package.
// track.js uses: import { kv } from '@vercel/kv'  (top-level); we mirror the same
// client/destructuring but inside an async import to keep the test isolated.
export default async function handler(req, res) {
  const { kv } = await import("@vercel/kv");
  const body = req.method === "POST" ? req.body : undefined;
  const out = await handleReviews({ method: req.method, body }, kv);
  res.status(out.status).json(out.json);
}
