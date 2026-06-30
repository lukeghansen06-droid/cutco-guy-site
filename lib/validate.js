// lib/validate.js
const hasLink = s => /(https?:\/\/|www\.|\.\w{2,}\/)/i.test(s);
export function validateReview(i = {}) {
  if (i.website) return { ok:false, error:"spam" };           // honeypot
  const name = String(i.name||"").trim();
  const text = String(i.text||"").trim();
  const rating = Number(i.rating);
  if (name.length < 1 || name.length > 40) return { ok:false, error:"name" };
  if (!(rating >= 1 && rating <= 5)) return { ok:false, error:"rating" };
  if (text.length < 12 || text.length > 600) return { ok:false, error:"length" };
  if (hasLink(text)) return { ok:false, error:"link" };
  return { ok:true, clean:{ name, rating, text } };
}
export function validateLead(i = {}) {
  if (i.website) return { ok:false, error:"spam" };
  const name = String(i.name||"").trim();
  const contact = String(i.contact||"").trim();
  const contactType = i.contactType === "phone" ? "phone" : "email";
  const when = String(i.when||"").trim().slice(0,40);
  const note = String(i.note||"").trim().slice(0,300);
  if (name.length < 1 || name.length > 40) return { ok:false, error:"name" };
  if (contactType === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact))
    return { ok:false, error:"email" };
  if (contactType === "phone" && contact.replace(/\D/g,"").length < 7)
    return { ok:false, error:"phone" };
  return { ok:true, clean:{ name, contact, contactType, when, note } };
}
