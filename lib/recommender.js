const PIECES = {
  "petite-chef": {title:"Petite Chef + Trimmer starter", tier:"starter",
    why:"The two knives you'll reach for every day — versatile and easy to handle."},
  "santoku-duo": {title:"Santoku + Paring duo", tier:"mid",
    why:"A do-everything pair that covers most kitchen tasks beautifully."},
  "homemaker-set": {title:"Homemaker+8 set", tier:"mid",
    why:"A balanced set that outfits a real cooking kitchen without overkill."},
  "ultimate-set": {title:"Ultimate Set", tier:"best",
    why:"The full lineup for a busy kitchen that cooks a lot — set it and forget it."},
  "gift-trimmer": {title:"Trimmer + Gift Box", tier:"starter",
    why:"A gift people actually keep — useful from day one, backed forever."},
  "complement-knife": {title:"Carver or Bread knife add-on", tier:"mid",
    why:"Fills the gap most Cutco owners are missing — pairs with what you have."}
};
export function recommend(a) {
  let id;
  if (a.owns) id = "complement-knife";
  else if (a.purpose === "gift") id = a.budget === "starter" ? "gift-trimmer" : "santoku-duo";
  else if (a.cook === "barely") id = "petite-chef";
  else if (a.budget === "best" && (a.household === "5+" || a.cook === "lots")) id = "ultimate-set";
  else if (a.cook === "lots" || a.household === "5+") id = "homemaker-set";
  else id = a.budget === "starter" ? "petite-chef" : "santoku-duo";
  return { id, ...PIECES[id] };
}
