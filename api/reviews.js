// api/reviews.js
// Moderated reviews: a public submission goes to a PENDING list and is NOT shown
// on the site until Luke approves it from the private moderation page. The public
// GET only ever returns APPROVED reviews, so the wall can never display
// unmoderated content.
//
// handleReviews(req, kv) is pure and unit-tested. req = { method, body, isAdmin }.
import { validateReview } from "../lib/validate.js";
import { isAdmin } from "../lib/admin.js";

const APPROVED = "reviews:approved";
const PENDING = "reviews:pending";
const getArr = async (kv, k) => (await kv.get(k)) || [];

export async function handleReviews(req, kv) {
  const admin = !!req.isAdmin;

  if (req.method === "GET") {
    const approved = await getArr(kv, APPROVED);
    if (admin) {
      const pending = await getArr(kv, PENDING);
      return { status: 200, json: { ok: true, reviews: approved, pending, count: approved.length } };
    }
    return { status: 200, json: { reviews: approved, count: approved.length } };
  }

  if (req.method === "POST") {
    const body = req.body || {};

    // ---- admin moderation actions (key-gated) ----
    if (admin && body.action) {
      const id = String(body.id || "");
      const pending = await getArr(kv, PENDING);
      const approved = await getArr(kv, APPROVED);
      if (body.action === "approve") {
        const i = pending.findIndex((r) => r.id === id);
        if (i >= 0) {
          approved.unshift(pending[i]);
          pending.splice(i, 1);
          await kv.set(APPROVED, approved);
          await kv.set(PENDING, pending);
        }
        return { status: 200, json: { ok: true } };
      }
      if (body.action === "reject") {
        await kv.set(PENDING, pending.filter((r) => r.id !== id));
        return { status: 200, json: { ok: true } };
      }
      if (body.action === "unpublish") {
        await kv.set(APPROVED, approved.filter((r) => r.id !== id));
        return { status: 200, json: { ok: true } };
      }
      return { status: 400, json: { ok: false, error: "action" } };
    }

    // ---- public: submit a review → goes to PENDING for approval ----
    const v = validateReview(body);
    if (!v.ok) return { status: 400, json: { ok: false, error: v.error } };
    const review = { id: crypto.randomUUID(), ...v.clean, ts: Date.now() };
    const pending = await getArr(kv, PENDING);
    pending.unshift(review);
    await kv.set(PENDING, pending);
    return { status: 200, json: { ok: true, review, pending: true } };
  }

  return { status: 405, json: { ok: false, error: "method" } };
}

// Vercel adapter — lazy-imports the Supabase store so bun test (which passes an
// in-memory mock into handleReviews) never needs @supabase/supabase-js installed.
export default async function handler(req, res) {
  const { kvAdapter } = await import("../lib/store-supabase.js");
  const kv = kvAdapter();
  const body = req.method === "POST" ? req.body : undefined;
  const out = await handleReviews({ method: req.method, body, isAdmin: isAdmin(req) }, kv);
  res.status(out.status).json(out.json);
}
