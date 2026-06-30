/* assets/recommender.js — canonical source of recommender logic.
 *
 * This file is the single source of truth for recommend().
 * - Browser: imported by /assets/recommender-ui.js as an ES module.
 * - Node/Bun tests: lib/recommender.js re-exports from here via a relative path.
 *
 * Keeping logic here (not in lib/) means it works with browser ES module imports
 * served from /assets/ without needing a build step or import-map.
 */

const PIECES = {
  "petite-chef":    { title: "Petite Chef + Trimmer starter", tier: "starter",
                      why: "The two knives you'll reach for every day — versatile and easy to handle." },
  "santoku-duo":    { title: "Santoku + Paring duo",          tier: "mid",
                      why: "A do-everything pair that covers most kitchen tasks beautifully." },
  "homemaker-set":  { title: "Homemaker+8 set",               tier: "mid",
                      why: "A balanced set that outfits a real cooking kitchen without overkill." },
  "ultimate-set":   { title: "Ultimate Set",                  tier: "best",
                      why: "The full lineup for a busy kitchen that cooks a lot — set it and forget it." },
  "gift-trimmer":   { title: "Trimmer + Gift Box",            tier: "starter",
                      why: "A gift people actually keep — useful from day one, backed forever." },
  "complement-knife":{ title: "Carver or Bread knife add-on", tier: "mid",
                      why: "Fills the gap most Cutco owners are missing — pairs with what you have." },
};

/**
 * recommend(a) -> { id, title, why, tier }
 *
 * @param {object} a
 * @param {'lots'|'some'|'barely'} a.cook
 * @param {'1'|'2-4'|'5+'} a.household
 * @param {'self'|'gift'|'newhome'} a.purpose
 * @param {'starter'|'mid'|'best'} a.budget
 * @param {boolean} a.owns — already owns Cutco
 */
export function recommend(a) {
  let id;
  if (a.owns)                                                          id = "complement-knife";
  else if (a.purpose === "gift")                                       id = a.budget === "starter" ? "gift-trimmer" : "santoku-duo";
  else if (a.cook === "barely")                                        id = "petite-chef";
  else if (a.budget === "best" && (a.household === "5+" || a.cook === "lots")) id = "ultimate-set";
  else if (a.cook === "lots" || a.household === "5+")                  id = "homemaker-set";
  else                                                                 id = a.budget === "starter" ? "petite-chef" : "santoku-duo";
  return { id, ...PIECES[id] };
}
