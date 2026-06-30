// api/lead.js
import { validateLead } from "../lib/validate.js";
const KEY = "leads:v1";
export async function handleLead(req, kv, sendEmail) {
  if (req.method !== "POST") return { status:405, json:{ ok:false, error:"method" } };
  const v = validateLead(req.body || {});
  if (!v.ok) return { status:400, json:{ ok:false, error:v.error } };
  const lead = { id: crypto.randomUUID(), ...v.clean, ts: Date.now() };
  await kv.lpush(KEY, lead);
  try { await sendEmail(lead); } catch (e) { /* stored anyway; never block the user */ }
  return { status:200, json:{ ok:true } };
}
// Vercel adapter — lazy-imports kv so bun test (no @vercel/kv installed) can still
// import handleLead without hitting the real KV package. Same pattern as reviews.js.
export default async function handler(req, res) {
  const { kv } = await import("@vercel/kv");
  const send = async (lead) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) { console.log("LEAD (no email configured):", lead); return; }
    await fetch("https://api.resend.com/emails", { method:"POST",
      headers:{ "Authorization":`Bearer ${key}`, "Content-Type":"application/json" },
      body: JSON.stringify({ from:"leads@cutcowithluke.com", to:"lukeghansen06@gmail.com",
        subject:`New lead: ${lead.name}`,
        text:`${lead.name}\n${lead.contactType}: ${lead.contact}\nWhen: ${lead.when}\nNote: ${lead.note}` }) });
  };
  const out = await handleLead({ method:req.method, body:req.body }, kv, send);
  res.status(out.status).json(out.json);
}
