/* assets/recommender.js — canonical source of recommender logic.
 *
 * Single source of truth for recommend(). Pure (no DOM) so it unit-tests under bun.
 * - Browser: imported by /assets/recommender-ui.js.
 * - Node/Bun tests: lib/recommender.js re-exports from here.
 *
 * recommend() now returns a memorable "Kitchen Fit" label plus a ranked list of
 * REAL Cutco products. Names match the explorer dataset exactly, so the quiz UI
 * can pull live prices from window.CutcoData and add picks to the same wish list.
 * Product photos come from /assets/products/<sku>.jpg (downloaded locally).
 */

const PIECES = {
  "petite-chef":     { title: "Petite Chef + Trimmer starter", tier: "starter" },
  "santoku-duo":     { title: "Santoku + Paring duo",          tier: "mid" },
  "homemaker-set":   { title: "Homemaker+8 set",               tier: "mid" },
  "ultimate-set":    { title: "Ultimate Set",                  tier: "best" },
  "gift-trimmer":    { title: "Trimmer + Gift Box",            tier: "starter" },
  "complement-knife":{ title: "Owner add-on",                  tier: "mid" },
};

// Recommendable real products: name (matches explorer exactly) -> SKU for the photo.
const CAT = {
  petiteChef: { name: '7-5/8" Petite Chef',                          sku: '1728C' },
  trimmer:    { name: 'Trimmer (Utility Knife)',                     sku: '1721C' },
  santoku:    { name: '7" Santoku',                                  sku: '1766C' },
  frenchChef: { name: '9-1/4" French Chef',                          sku: '1725C' },
  paring:     { name: '2-3/4" Paring Knife',                         sku: '1720C' },
  shears:     { name: 'Super Shears',                                sku: '77C'   },
  spatula:    { name: 'Spatula Spreader',                            sku: '1768C' },
  bread:      { name: '9-3/4" Slicer (Bread Knife)',                 sku: '1724C' },
  carving:    { name: 'Carving Set',                                 sku: '1834CD'},
  combo:      { name: 'Cook’s Combo (Petite Chef + Trimmer)',   sku: '1853CD'},
  homemaker:  { name: 'Homemaker +8 Set with Block',                 sku: '2018C' },
  studio:     { name: 'Studio Set with Block',                       sku: '1809C' },
  essentials: { name: 'Essentials Set with Block',                   sku: '1845C' },
  ultimate:   { name: 'Ultimate Set with Block',                     sku: '1813C' },
  wineCheese: { name: 'Wine & Cheese Set',                           sku: '2130CD'},
  steakSet:   { name: '4-Pc. Steak Knife Set',                       sku: '2065C' },
  hunting:    { name: 'Hunting Knife',                               sku: '1769C' },
};
const P = (key, why) => ({ name: CAT[key].name, sku: CAT[key].sku, why });

function rankFor(a) {
  if (a.owns) return [
    P('bread', 'The gap most owners are missing — crusty bread and ripe tomatoes, handled.'),
    P('carving', 'Turns any dinner into an occasion, and pairs with what you already own.'),
    P('shears', 'The everyday tool people wish they had added sooner.'),
  ];
  if (a.purpose === 'gift') {
    if (a.budget === 'starter') return [
      P('combo', 'The two everyday knives, gift-boxed — a keeper from day one.'),
      P('spatula', 'Small, genuinely useful, and always a hit.'),
      P('wineCheese', 'An easy host or hostess win.'),
    ];
    if (a.budget === 'best') return [
      P('homemaker', 'A complete, impressive set they’ll use for decades.'),
      P('carving', 'A centerpiece for holidays and hosting.'),
      P('shears', 'Rounds out the kitchen nicely.'),
    ];
    return [
      P('santoku', 'A do-everything knife that feels premium to give.'),
      P('paring', 'The little knife everyone reaches for.'),
      P('wineCheese', 'A thoughtful host gift.'),
    ];
  }
  if (a.cook === 'barely') return [
    P('petiteChef', 'Handles almost everything without feeling like a big knife.'),
    P('trimmer', 'Your everyday grab — small, nimble, sharp for life.'),
    P('shears', 'Quietly the most-used tool in the drawer.'),
  ];
  if (a.budget === 'best' && (a.household === '5+' || a.cook === 'lots')) return [
    P('ultimate', 'The full lineup for a kitchen that cooks a lot — set it and forget it.'),
    P('carving', 'For the meals worth showing off.'),
    P('shears', 'The everyday essential, done right.'),
  ];
  if (a.cook === 'lots' || a.household === '5+') return [
    P('homemaker', 'A real cooking kitchen, outfitted without overkill.'),
    P('santoku', 'The knife you’ll reach for daily.'),
    P('shears', 'The everyday workhorse most people forget.'),
  ];
  if (a.budget === 'starter') return [
    P('petiteChef', 'The one knife that does most of the work.'),
    P('trimmer', 'Its perfect partner for the little jobs.'),
    P('paring', 'Rounds out a smart, small starter.'),
  ];
  return [
    P('santoku', 'A do-everything knife that covers most tasks.'),
    P('petiteChef', 'Versatile, balanced, and easy to handle.'),
    P('shears', 'You’ll use it more than you expect.'),
  ];
}

function labelFor(a) {
  if (a.owns) return 'The Owner Upgrade';
  if (a.purpose === 'gift') return 'The Gift Buyer';
  if (a.purpose === 'newhome') return 'The Fresh-Start Kitchen';
  if (a.cook === 'barely') return 'The Simple Setup';
  if (a.budget === 'best' && (a.household === '5+' || a.cook === 'lots')) return 'The Full Setup';
  if (a.cook === 'lots' || a.household === '5+') return 'The Everyday Cook';
  return 'The Starter Setup';
}

/**
 * recommend(a) -> { id, title, tier, label, why, ranked: [{name, sku, why}] }
 * @param {object} a
 * @param {'lots'|'some'|'barely'} a.cook
 * @param {'1'|'2-4'|'5+'} a.household
 * @param {'self'|'gift'|'newhome'} a.purpose
 * @param {'starter'|'mid'|'best'} a.budget
 * @param {boolean} a.owns
 */
export function recommend(a) {
  let id;
  if (a.owns)                                                          id = "complement-knife";
  else if (a.purpose === "gift")                                       id = a.budget === "starter" ? "gift-trimmer" : "santoku-duo";
  else if (a.cook === "barely")                                        id = "petite-chef";
  else if (a.budget === "best" && (a.household === "5+" || a.cook === "lots")) id = "ultimate-set";
  else if (a.cook === "lots" || a.household === "5+")                  id = "homemaker-set";
  else                                                                 id = a.budget === "starter" ? "petite-chef" : "santoku-duo";

  const ranked = rankFor(a);
  return { id, title: PIECES[id].title, tier: PIECES[id].tier, label: labelFor(a), why: ranked[0].why, ranked };
}
