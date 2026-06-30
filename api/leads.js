// api/leads.js — key-gated lead list (GET only; Luke's private view of all captured leads)
export default async function handler(req, res) {
  const key = (req.query && req.query.key) || "";
  const expected = process.env.LEADS_KEY;
  if (!expected || key !== expected) {
    return res.status(401).json({ ok:false, error:"unauthorized" });
  }
  const { kv } = await import("@vercel/kv");
  const leads = (await kv.lrange("leads:v1", 0, 199)) || [];
  return res.status(200).json({ ok:true, leads });
}
