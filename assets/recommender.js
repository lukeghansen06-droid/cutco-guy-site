/* assets/recommender.js — canonical source of recommender logic.
 *
 * Single source of truth for recommend(). Pure (no DOM) so it unit-tests under bun.
 * - Browser: imported by /assets/recommender-ui.js.
 * - Node/Bun tests: lib/recommender.js re-exports from here.
 *
 * recommend() now returns a memorable "Kitchen Fit" label plus a ranked list of
 * REAL Cutco products. Names match the explorer dataset exactly, so the quiz UI
 * can pull snapshot prices from window.CutcoData and add picks to the same wish list.
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

// Short "main uses" line, shown on the #1 pick. Keys match CAT names exactly.
const USES = {
  '7-5/8" Petite Chef':               'Everyday chopping, slicing, and prep — a smaller chef’s knife that never feels intimidating.',
  'Trimmer (Utility Knife)':          'Trimming, peeling, sandwiches, small cuts — the little knife you reach for constantly.',
  '7" Santoku':                       'Slicing, dicing, and chopping veggies and proteins — a true do-everything daily knife.',
  '9-1/4" French Chef':               'Big chopping jobs and batch prep — the classic workhorse of a busy kitchen.',
  '2-3/4" Paring Knife':              'Peeling, coring, garnishes, and in-hand detail work.',
  'Super Shears':                     'Herbs, poultry, packaging, kitchen odd-jobs — and they take apart for easy cleaning.',
  'Spatula Spreader':                 'Spreading, small serving, and soft foods.',
  '9-3/4" Slicer (Bread Knife)':      'Crusty bread, bagels, and ripe tomatoes — clean slices without squishing.',
  'Carving Set':                      'Roasts, turkey, and holiday meals — confident, even serving slices.',
  'Cook’s Combo (Petite Chef + Trimmer)': 'The two everyday knives that handle most of your prep, together.',
  'Homemaker +8 Set with Block':      'A complete everyday kitchen — the core knives plus a block, ready to go.',
  'Studio Set with Block':            'A compact set with a block — a clean, capable starting kitchen.',
  'Essentials Set with Block':        'The essential knives with a block — a solid all-around setup.',
  'Ultimate Set with Block':          'The full lineup with a block — nothing left to add.',
  'Wine & Cheese Set':                'Cheese boards, entertaining, and host gifts.',
  '4-Pc. Steak Knife Set':            'Steak nights and dinner guests — clean, sharp cuts at the table.',
  'Hunting Knife':                    'Field and outdoor tasks.',
};

/**
 * The single "lane" a person falls into, derived from their answers.
 * Every downstream label/badge/explanation keys off this so they never drift.
 * @returns {'owner'|'gift'|'college'|'freshstart'|'simple'|'full'|'everyday'|'starter'}
 */
function laneOf(a) {
  if (a.owns) return 'owner';
  if (a.purpose === 'gift') return 'gift';
  if (a.purpose === 'newhome' && a.household === '1') return 'college';
  if (a.purpose === 'newhome') return 'freshstart';
  if (a.cook === 'barely') return 'simple';
  if (a.budget === 'best' && (a.household === '5+' || a.cook === 'lots')) return 'full';
  if (a.cook === 'lots' || a.household === '5+') return 'everyday';
  return 'starter';
}

const LANE_LABELS = {
  owner:      'The Owner Upgrade',
  gift:       'The Gift Buyer',
  college:    'The College Apartment Setup',
  freshstart: 'The Fresh-Start Kitchen',
  simple:     'The Simple Setup',
  full:       'The Full Setup',
  everyday:   'The Everyday Cook',
  starter:    'The Starter Setup',
};

/**
 * Honest badge for the #1 pick. "Perfect Match" is reserved for answers that
 * point cleanly to one lane — everything else gets a truthful, softer label.
 * @returns {{ label: string, strong: boolean }}
 */
function badgeFor(a) {
  const lane = laneOf(a);
  if (lane === 'gift')    return { label: 'Best Gift Fit',        strong: false };
  if (lane === 'owner')   return { label: 'Best Owner Add-On',    strong: false };
  if (lane === 'college') return { label: 'Best Compact Pick',    strong: false };
  if (lane === 'full')    return { label: 'Best Full Setup Anchor', strong: false };
  // Judged lanes: only call it a Perfect Match when the signals genuinely line up.
  const perfect =
    (lane === 'simple'     && a.budget === 'starter') ||
    (lane === 'everyday'   && a.cook   === 'lots')    ||
    (lane === 'freshstart' && a.budget === 'starter');
  if (perfect) return { label: 'Perfect Match', strong: true };
  if (lane === 'simple' || lane === 'starter' || lane === 'freshstart')
    return { label: 'Best Starting Point', strong: false };
  return { label: 'Best Fit Based on Your Answers', strong: false };
}

/**
 * A personal, practical explanation for the #1 pick — grounded in the answers,
 * never overclaiming. #2 and #3 keep their short one-line `why` from rankFor().
 */
function detailWhy(a) {
  switch (laneOf(a)) {
    case 'simple':
      return 'You told me you keep meals simple, so you don’t need a wall of knives. This is one piece you’ll actually reach for — everyday chopping and slicing without a big, intimidating blade — and it fixes the real annoyance: a dull knife that makes basic prep a chore.';
    case 'starter':
      return 'You want a smart place to start without overbuying. This is the one knife that does most of the work, so you get real capability now and can add pieces later. It’s the piece you’ll pick up almost every time you’re in the kitchen.';
    case 'everyday':
      return 'You cook a lot, so your knife gets used hard and often. This is the one you’ll reach for daily — fast, balanced, and sharp for life — built to be the anchor of a kitchen that actually cooks.';
    case 'full':
      return 'You’re setting up a full kitchen and want it done right. This anchors the whole lineup, so every common task is covered without piecing it together over the years. One decision and the kitchen is set — backed by the Forever Guarantee.';
    case 'college':
      return 'You’re outfitting a smaller space, so this focuses on the pieces you’ll use most without the clutter. It covers everyday prep in a compact setup that fits an apartment kitchen — and it’s guaranteed for life, so it moves with you.';
    case 'freshstart':
      return 'You’re stocking a new place, so this gives you a clean, capable starting point instead of a random mix. It handles the everyday cooking you’ll do most, and you can build around it as the kitchen comes together.';
    case 'gift':
      return 'You’re buying for someone else, so this is an easy win — genuinely useful, feels premium to give, and it’s backed by the Forever Guarantee. It’s the kind of gift people actually keep and remember.';
    case 'owner':
      return 'Since you already own Cutco, this fills the gap most owners are missing instead of repeating what you have. It pairs with your current pieces and covers a job your set probably doesn’t yet.';
    default:
      return 'A practical, do-everything starting point chosen from your answers — useful from day one and easy to build on later.';
  }
}

/**
 * SPIN "Problem" follow-through: one extra sentence keyed to what the visitor
 * said is annoying right now. Optional — '' when unanswered or 'none'.
 */
const PROBLEM_LINES = {
  dull:    'And since dull knives are the pain right now: free sharpening for life is the whole point — this pick stays sharp, forever.',
  prep:    'Since prep time is the pain: this is the piece that shortens the chopping, not another gadget for the drawer.',
  hardveg: 'Since hard produce and crusty loaves are the fight: the right edge handles exactly that — no squishing, no sawing.',
  meat:    'Since meats are where it goes wrong: clean slices come from the right blade, not more force.',
  unsure:  'And since the real problem is not knowing what to get — that’s what this shortlist fixes. Start here; add later only if you need it.',
};

/**
 * Honest trade-off lines per lane: why not the bigger option, why not the
 * smaller one, and who should skip this pick entirely. Shown on the result
 * card so the recommendation reads consultative, not promotional.
 */
const TRADEOFFS = {
  simple:     { bigger: 'A block set would mostly gather dust in a simple-meals kitchen — skip it for now.',
                smaller: 'Going smaller than one good knife means keeping the frustration you came in with.',
                skip: 'Skip this if your current chef’s knife already feels sharp and comfortable.' },
  starter:    { bigger: 'The bigger sets are great, but they’re a second step — you can add pieces anytime.',
                smaller: 'A lone paring knife won’t cover daily prep — this pairing does.',
                skip: 'Skip if you’re outfitting a full family kitchen from scratch — a set makes more sense.' },
  everyday:   { bigger: 'The Ultimate set is more than most daily cooks use — you can grow into it later.',
                smaller: 'A starter pair would leave your busiest nights under-equipped.',
                skip: 'Skip if you barely cook — one great knife is the smarter start.' },
  full:       { bigger: 'There’s nothing meaningfully bigger — the question is fit, not more.',
                smaller: 'Piecing it together one knife at a time works, but a set settles it once.',
                skip: 'Skip the full set if this is your first Cutco and you’d rather test-drive one piece first.' },
  college:    { bigger: 'A full block set fights a small kitchen for counter space — compact wins here.',
                smaller: 'Below this you’re back to guessing with one knife.',
                skip: 'Skip if you’re outfitting a permanent home soon — buy once, there.' },
  freshstart: { bigger: 'You can always scale up once you know how the new kitchen actually gets used.',
                smaller: 'Starting below this means re-shopping in six months.',
                skip: 'Skip if someone may gift you a set — registries love Cutco; ask before you buy.' },
  gift:       { bigger: 'A bigger set can overwhelm a gift moment — useful and easy-to-explain lands better.',
                smaller: 'Much smaller starts to feel like a stocking stuffer instead of a keeper.',
                skip: 'Skip if they already own Cutco — fill their gap instead (I can help you find it).' },
  owner:      { bigger: 'Another big set duplicates what you own — the gap piece is the smart money.',
                smaller: 'Sharpening what you have is free and might be all you need — do that first.',
                skip: 'Skip buying anything until your current pieces are sharpened and accounted for.' },
};

const NEXT_STEPS = {
  gift:  'Best next step: text me who it’s for and I’ll sanity-check the pick before you spend anything.',
  owner: 'Best next step: text me a photo of what you own — service first, gaps second.',
  full:  'Best next step: book the full demo and see the whole lineup in action before deciding.',
};
const NEXT_STEP_DEFAULT = 'Best next step: send this result to me and we’ll confirm fit and current pricing together.';

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
  return LANE_LABELS[laneOf(a)];
}

/**
 * recommend(a) -> {
 *   id, title, tier, label, lane, why,
 *   badge: { label, strong },   // honest #1 badge
 *   detail,                     // personal "why this fits" for the #1 pick
 *   uses,                       // main-uses line for the #1 pick
 *   ranked: [{ name, sku, why }]
 * }
 * @param {object} a
 * @param {'lots'|'some'|'barely'} a.cook
 * @param {'1'|'2-4'|'5+'} a.household
 * @param {'self'|'gift'|'newhome'} a.purpose
 * @param {'starter'|'mid'|'best'} a.budget
 * @param {boolean} a.owns
 * @param {'dull'|'prep'|'hardveg'|'meat'|'unsure'|'none'} [a.problem] — optional
 *        SPIN "what's annoying right now" answer; sharpens `detail` when present.
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
  const top = ranked[0];
  const lane = laneOf(a);
  const problemLine = (a.problem && PROBLEM_LINES[a.problem]) || '';
  const t = TRADEOFFS[lane] || TRADEOFFS.starter;
  return {
    id,
    title: PIECES[id].title,
    tier: PIECES[id].tier,
    label: labelFor(a),
    lane,
    badge: badgeFor(a),
    detail: detailWhy(a) + (problemLine ? ' ' + problemLine : ''),
    uses: (top && USES[top.name]) || '',
    why: top.why,
    ranked,
    whyNotBigger: t.bigger,
    whyNotSmaller: t.smaller,
    skipIf: t.skip,
    nextStep: NEXT_STEPS[lane] || NEXT_STEP_DEFAULT,
  };
}
