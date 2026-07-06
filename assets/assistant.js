/* assets/assistant.js
 * Luke's Cutco Sidekick — client-side guided assistant for the #assistant mount on /find.
 *
 * Rule-based, no backend/API. Natural-sounding intent replies, follow-up quick chips,
 * action CTAs (finder / book / text / official / explorer), light page context
 * (quiz Kitchen Fit + My List), and analytics via the existing /api/track pattern.
 *
 * SECURITY: user text is rendered via textContent or esc() before any innerHTML.
 *   Bot responses contain only pre-written trusted HTML (links, <strong>) — never
 *   user-supplied content. Product names come from our own PRODUCTS array.
 *
 * PRICING: never states exact prices and never calls pricing "live" or current —
 *   it points to the June 2026 snapshot on the site + official Cutco page + Luke.
 */

// ---------------------------------------------------------------------------
// Escape helper
// ---------------------------------------------------------------------------
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BOOK  = '/book';
const FINDER = '#recommender';
const PHONE = 'sms:+13126594280';
const PHONE_DISPLAY = '312-659-4280';
const CUTCO_PRODUCTS = 'https://www.cutco.com/products/';
const CUTCO_SPECIALS = 'https://www.cutco.com/promotions/sale';

// ---------------------------------------------------------------------------
// Analytics — same {t:'ev', l} shape as app.js / recommender-ui.js
// ---------------------------------------------------------------------------
function track(label) {
  if (typeof window !== 'undefined' && window.__cutcoNoTrack) return; // Owner No-Track Mode
  try {
    const b = JSON.stringify({ t: 'ev', l: label });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([b], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b, keepalive: true }).catch(() => {});
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// Page context — localStorage only, no server, no private data
// ---------------------------------------------------------------------------
function getFit() {
  try { const f = JSON.parse(localStorage.getItem('cutcoFit') || 'null'); return (f && f.label) ? f : null; }
  catch (e) { return null; }
}
function getList() {
  try { const l = JSON.parse(localStorage.getItem('cutcoList') || '[]'); return Array.isArray(l) ? l : []; }
  catch (e) { return []; }
}
function smsBody(msg) { return PHONE + '?&body=' + encodeURIComponent(msg); }
function listSms() {
  const list = getList(), fit = getFit();
  const lines = (fit ? ('Kitchen Fit: ' + fit.label + '\n') : '') +
    list.map((n, i) => (i + 1) + '. ' + n).join('\n');
  return smsBody("Hi Luke! Here's my Cutco list:\n" + lines + "\nCan you confirm current pricing and help me pick?");
}

// Reusable CTA builders (kept small — each intent picks a couple)
const CTA = {
  finder:    { label: 'Start the Finder',        ev: 'assistant_start_finder_click', finder: true },
  bookFull:  { label: 'Book the Full Experience', href: BOOK, ev: 'assistant_book_click' },
  bookQuick: { label: 'Book the Quick 20',        href: BOOK, ev: 'assistant_book_click' },
  official:  { label: 'View official Cutco page', href: CUTCO_PRODUCTS, ev: 'official_cutco_link_click', external: true },
  text: (msg) => ({ label: 'Text Luke', href: smsBody(msg || 'Hi Luke! I have a quick Cutco question:'), ev: 'assistant_text_luke_click' }),
  price: (name) => ({ label: 'Ask Luke to confirm price', href: smsBody('Hi Luke! Can you confirm the current price for' + (name ? (': ' + name) : ' a few pieces') + '?'), ev: 'assistant_price_check_click' }),
  explore: (query, label) => ({ label: label, ev: 'assistant_quick_chip_click', explore: query }),
};

// Follow-up chips shown under most replies
const MENU_CHIPS = ['Best 1–3 pieces', 'Gift ideas', 'I already own Cutco', 'Sharpening help', 'Is this pushy?', 'Help me book'];
// Empty-state suggested questions
const START_CHIPS = ['What should I get?', 'Gift ideas', 'I already own Cutco', 'How much does it cost?', 'Is this pushy?', 'Take the finder'];

// ---------------------------------------------------------------------------
// Product list for contextual recommendations (own data → safe to render)
// ---------------------------------------------------------------------------
const SYN = {
  veg:['vegetable'],veggie:['vegetable'],veggies:['vegetable'],vegetable:['vegetable'],vegetables:['vegetable'],
  onion:['vegetable','chopping'],onions:['vegetable','chopping'],tomato:['bread','vegetable'],tomatoes:['bread','vegetable'],
  fruit:['paring','fruit'],apple:['paring'],apples:['paring'],potato:['paring','vegetable'],
  fish:['salmon','fillet','fish'],salmon:['salmon','fillet'],filet:['fillet'],fillet:['fillet'],sushi:['santoku'],
  bread:['bread'],loaf:['bread'],bagel:['bread'],
  meat:['carver','butcher','steak'],steak:['steak'],roast:['carver','carving'],turkey:['carver','carving'],
  ham:['carver'],carve:['carver','carving'],carving:['carver','carving'],brisket:['carver'],grill:['steak','carver'],bbq:['steak','carver'],
  cheese:['cheese'],charcuterie:['cheese'],host:['cheese','carver','steak'],entertain:['cheese','carver'],
  hunt:['hunting'],hunting:['hunting'],deer:['hunting'],elk:['hunting'],game:['hunting'],skinning:['hunting'],
  scissor:['shears'],scissors:['shears'],shear:['shears'],shears:['shears'],herbs:['shears'],poultry:['shears'],
  peel:['peeler','paring'],peeler:['peeler'],
  sharpen:['sharpener'],sharpening:['sharpener'],dull:['sharpener'],
  gift:['gift','wedding'],gifts:['gift'],wedding:['wedding','gift'],registry:['wedding'],present:['gift'],
  housewarming:['housewarming','gift'],graduation:['grad','gift'],grad:['grad'],
  set:['set'],sets:['set'],block:['block','set'],
  starter:['starter'],beginner:['starter'],first:['starter'],apartment:['starter','small'],college:['starter','small'],dorm:['starter','small'],
  small:['small','starter'],cheap:['starter'],affordable:['starter'],
  chef:['chef'],santoku:['santoku'],everyday:['utility','everyday'],utility:['utility'],
  paring:['paring'],pare:['paring'],
  slice:['slicer'],slicing:['slicer'],dice:['dicing','chef'],chop:['chopping','chef'],chopping:['chopping','chef'],
};
const PRODUCTS = [
  { n: 'Petite Chef Knife',  k: 'chef everyday all-purpose vegetable chopping starter', url: 'https://www.cutco.com/products/knives/petite-chef-knife' },
  { n: 'Trimmer',            k: 'everyday utility small versatile starter',               url: 'https://www.cutco.com/products/knives/trimmer' },
  { n: 'French Chef Knife',  k: 'chef all-purpose chopping vegetable',                    url: 'https://www.cutco.com/products/knives/french-chef-knife' },
  { n: 'Santoku',            k: 'santoku sushi japanese all-purpose vegetable everyday',  url: 'https://www.cutco.com/products/knives/santoku' },
  { n: 'Paring Knife',       k: 'paring peeling fruit apple potato small',                url: 'https://www.cutco.com/products/knives/paring-knife' },
  { n: 'Bread Knife',        k: 'bread loaf bagel serrated tomato',                       url: 'https://www.cutco.com/products/knives/bread-knife' },
  { n: 'Salmon Knife',       k: 'salmon fish fillet sushi seafood',                       url: 'https://www.cutco.com/products/knives/salmon-knife' },
  { n: 'Fillet Knife',       k: 'fillet fish fishing angler flexible',                    url: 'https://www.cutco.com/products/knives/fillet-knife' },
  { n: 'Carving Set',        k: 'carver carving roast turkey ham brisket meat host',      url: 'https://www.cutco.com/products/knives/carving-fork-and-knife-set' },
  { n: 'Cheese Knife',       k: 'cheese charcuterie board host entertain',                url: 'https://www.cutco.com/products/knives/cheese-knife' },
  { n: 'Super Shears',       k: 'shears scissors herbs poultry kitchen everyday',         url: 'https://www.cutco.com/products/kitchen-tools/super-shears' },
  { n: 'Vegetable Peeler',   k: 'peeler peel potato fruit',                               url: 'https://www.cutco.com/products/kitchen-tools/peeler' },
  { n: 'Homemaker+8 Set',    k: 'set starter gift homemaker all-purpose block',           url: 'https://www.cutco.com/products/sets/homemaker-8-set' },
  { n: 'Hunting Knife',      k: 'hunting deer elk game outdoor camp skinning',            url: 'https://www.cutco.com/products/outdoor/hunting-knife' },
  { n: 'Steak Knife Set',    k: 'steak knife table dinner mealtime host grill',           url: 'https://www.cutco.com/products/knives/steak-knife' },
];
function norm(s)   { return (s || '').toLowerCase(); }
function tokens(s) { return norm(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean); }
function expand(s) {
  const w = tokens(s), out = [...w];
  w.forEach(x => { if (SYN[x]) out.push(...SYN[x]); });
  return out;
}
function matchProducts(q, limit = 3) {
  const toks = expand(q);
  return PRODUCTS.map(p => {
    const hay = (p.n + ' ' + p.k).toLowerCase();
    let s = 0; toks.forEach(t => { if (t.length > 2 && hay.includes(t)) s++; });
    return { p, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.p);
}

// ---------------------------------------------------------------------------
// Owner gap analysis — "I own X, Y, Z; what should I add?"
// Parses owned pieces from the message, maps coverage lanes, and recommends
// the real gaps with confident, specific reasoning. Names rendered are from
// OUR alias table (trusted) — never raw user text. No prices invented.
// ---------------------------------------------------------------------------
const OWN_ALIAS = [
  { label: 'Petite Chef',        lane: 'prep',      names: ['petite chef'] },
  { label: 'French Chef',        lane: 'prep',      names: ['french chef', "chef's knife", 'chefs knife', 'chef knife', 'big chef'] },
  { label: 'Santoku',            lane: 'prep',      names: ['santoku'] },
  { label: 'Trimmer',            lane: 'prep',      names: ['trimmer'] },
  { label: 'Paring Knife',       lane: 'prep',      names: ['paring', 'pairing'] },
  { label: 'Cleaver',            lane: 'specialty', names: ['cleav', 'meat cleaver'] },
  { label: 'Utility Knife',      lane: 'prep',      names: ['utility knife', 'hardy slicer'] },
  { label: 'Slicer',             lane: 'bread',     names: ['slicer', 'bread knife', 'serrated'] },
  { label: 'Table Knives',       lane: 'table',     names: ['table knife', 'table knives'] },
  { label: 'Steak Knives',       lane: 'table',     names: ['steak knife', 'steak knives'] },
  { label: 'Carving Set',        lane: 'host',      names: ['carving set', 'carving knife', 'carver'] },
  { label: 'Turning Fork',       lane: 'host',      names: ['turning fork', 'carving fork'] },
  { label: 'Cheese Knife',       lane: 'host',      names: ['cheese knife'] },
  { label: 'Super Shears',       lane: 'tools',     names: ['shears', 'scissors'] },
  { label: 'Vegetable Peeler',   lane: 'tools',     names: ['peeler'] },
  { label: 'Spatula Spreader',   lane: 'tools',     names: ['spatula spreader', 'spreader'] },
  { label: 'Butcher Knife',      lane: 'specialty', names: ['butcher'] },
  { label: 'Boning Knife',       lane: 'specialty', names: ['boning'] },
  { label: 'Fillet Knife',       lane: 'specialty', names: ['fillet', 'filet'] },
  { label: 'Salmon Knife',       lane: 'specialty', names: ['salmon knife'] },
  { label: 'a block set',        lane: 'set',       names: ['homemaker', 'galley', 'signature set', 'ultimate set', 'block set', 'knife block', 'the block'] },
  { label: 'Vegetable Knife',    lane: 'prep',      names: ['vegetable knife', 'veggie knife'] },
  { label: 'Petite Santoku',     lane: 'prep',      names: ['petite santoku'] },
  { label: 'Gourmet Paring',     lane: 'prep',      names: ['gourmet paring'] },
  { label: 'Hardy Slicer',       lane: 'prep',      names: ['hardy slicer'] },
  { label: 'Pizza Cutter',       lane: 'tools',     names: ['pizza cutter'] },
  { label: 'Ice Cream Scoop',    lane: 'tools',     names: ['ice cream scoop'] },
  { label: 'Can Opener',         lane: 'tools',     names: ['can opener'] },
];
// Session memory — Willow remembers what you told her you own (this visit only).
let sessionOwned = [];
let suggestedLaneIds = [];
function rememberOwned(found) {
  found.forEach(a => { if (!sessionOwned.some(o => o.label === a.label)) sessionOwned.push(a); });
}
const GAP_LANES = [
  { id: 'prep',  label: 'everyday prep',     hero: 'Petite Chef Knife', also: 'Santoku',
    why: "the do-everything knife you'll grab daily" },
  { id: 'bread', label: 'bread & tomatoes',  hero: 'Slicer (bread knife)', also: null,
    why: "crusty bread and ripe tomatoes, zero squish — the most underestimated piece in the line" },
  { id: 'table', label: 'the table',         hero: 'Table Knives', also: 'Steak Knives',
    why: "used at every single meal, day in and day out" },
  { id: 'tools', label: 'tools & gadgets',   hero: 'Super Shears', also: 'Vegetable Peeler',
    why: "herbs, poultry, packaging — the sleeper hit of the catalog" },
  { id: 'host',  label: 'serving & hosting', hero: 'Carving Set', also: 'Cheese Knife',
    why: "roasts, boards, holidays — the pieces guests notice" },
];
function detectOwned(text) {
  const t = norm(text);
  const found = [];
  OWN_ALIAS.forEach(a => {
    if (a.names.some(nm => t.includes(nm)) && !found.some(f => f.label === a.label)) found.push(a);
  });
  return found;
}
function notOwnedRecs(query, owned, limit) {
  const ownedNorm = owned.map(o => norm(o.label));
  return matchProducts(query, 6).filter(pr => !ownedNorm.some(on => norm(pr.n).includes(on) || on.includes(norm(pr.n)))).slice(0, limit || 3);
}
function askedCount(text) {
  const m = norm(text).match(/\b(one|two|three|1|2|3)\b\s*(more|things?|pieces?|items?|knives|knife|picks?|additions?)/);
  if (!m) return 0;
  return { one:1, two:2, three:3 }[m[1]] || parseInt(m[1], 10) || 0;
}
function ownerGapReply(q) {
  const found = detectOwned(q);
  rememberOwned(found);
  const owned = sessionOwned.length ? sessionOwned.slice() : found;
  if (!owned.length) return null;
  const lanesOwned = new Set(owned.map(o => o.lane));
  if (lanesOwned.has('set')) { lanesOwned.add('prep'); lanesOwned.add('bread'); lanesOwned.add('table'); }
  const gaps = GAP_LANES.filter(l => !lanesOwned.has(l.id));
  const ownedLabels = owned.map(o => o.label);
  const smsOwned = 'Hi Luke! I already own: ' + ownedLabels.join(', ') + '.';

  if (!gaps.length) {
    return {
      t: `You've covered every core lane — seriously complete. Next moves: <strong>free sharpening</strong> so it all cuts like day one, or a specialty piece (Fillet, Butcher, serving sets). Luke can check current owner specials too.`,
      recs: notOwnedRecs('fillet butcher carving cheese', owned, 3),
      ctas: [CTA.text(smsOwned + ' What would you add, and any owner specials right now?'), CTA.explore('all', 'Browse the catalog')],
      chips: ['Sharpening help', 'Gift ideas'],
    };
  }
  const want = askedCount(q);
  const freshGaps = gaps.filter(g => !suggestedLaneIds.includes(g.id));
  if (!freshGaps.length && suggestedLaneIds.length) {
    // She already suggested every core gap — move to specialty instead of repeating.
    return {
      t: `We've covered your core gaps already \u2014 next tier is the fun stuff: a <strong>Fillet Knife</strong> if anyone fishes, a <strong>Butcher Knife</strong> for big cuts, or serving pieces for hosting. Or honestly? Get what you own <strong>sharpened free</strong> and see if anything's still missing after.`,
      recs: notOwnedRecs('fillet butcher carving cheese serving', owned, 3),
      ctas: [CTA.text('Hi Luke! I own: ' + owned.map(o => o.label).join(', ') + '. We covered the basics \u2014 what specialty piece would you add?'), CTA.explore('all', 'Browse the catalog')],
      chips: ['Sharpening help', 'Gift ideas', 'Help me book'],
    };
  }
  const pool = freshGaps.length ? freshGaps : gaps;
  const picks = pool.slice(0, want > 0 ? Math.min(want, 3) : 2);
  picks.forEach(g => { if (!suggestedLaneIds.includes(g.id)) suggestedLaneIds.push(g.id); });
  const lead = picks.length === 1 ? `One pick, easy:` : picks.length === 2 ? `Two picks, easy:` : `Three picks, easy:`;
  let msg = lead;
  picks.forEach((g, i) => {
    msg += `<br><strong>${i + 1}. ${esc(g.hero)}</strong> &mdash; ${esc(g.why)}.`;
  });
  msg += `<br>Text Luke this list &mdash; he&rsquo;ll confirm current pricing and owner specials. (Sharpening what you own is free, by the way.)`;
  if (ownedLabels.length >= 3) msg = `Nice lineup &mdash; ${esc(ownedLabels.join(', '))}. ` + msg;
  const addStr = picks.map(g => g.hero).join(' and ');
  return {
    t: msg,
    recs: notOwnedRecs(picks.map(g => g.hero + ' ' + (g.also || '')).join(' '), owned, 3),
    ctas: [CTA.text(smsOwned + ' Thinking about adding: ' + addStr + '. What do you recommend, and what is current pricing?'), CTA.explore('all', 'Browse the catalog')],
    chips: ['Sharpening help', 'Help me book'],
  };
}

// ---------------------------------------------------------------------------
// Reply engine — returns { t (trusted HTML), recs?, chips?, ctas? }
// Natural, honest, next-step-oriented. Order = priority.
// ---------------------------------------------------------------------------
function reply(q) {
  const n = norm(q);
  const recs = matchProducts(q, 3);

  // Owner gap analysis fires first: either they clearly listed pieces they own,
  // or they used owner/add language and we recognized at least one piece.
  const ownedHits = detectOwned(q);
  if (ownedHits.length >= 3) { const g = ownerGapReply(q); if (g) return g; }
  if (ownedHits.length >= 1 && /(add|adding|add-?on|missing|complete|next|round (it |them )?out|upgrade|already (own|have)|i (own|have)|what else|go with (it|them)|pair)/.test(n)) {
    const g = ownerGapReply(q); if (g) return g;
  }

  // Follow-up: she remembers what you own this session ("what else?", "and after that?")
  if (sessionOwned.length && /^(what else|anything else|and (then|after that)|next\??|more\??|what next|after that|keep going|others?\??)\b/.test(n.trim())) {
    const g = ownerGapReply(q); if (g) return g;
  }

  // Brand comparison — honest, no trash talk, no invented specs
  if (/(wusthof|wüsthof|henckels|zwilling|shun|global|victorinox|cuisinart|better than|compare(d)? to|vs\.? (other|wusthof|henckels))/.test(n))
    return { t: `Honest answer: there are several well-made knife brands, and I won't trash any of them. What's genuinely different about Cutco is the ownership experience: <strong>free sharpening forever</strong>, repair or replacement under the Forever Guarantee, American-made since 1949, and a local person (Luke) who answers. Most brands sell you a knife; Cutco sells you the last knife. Best way to judge is side by side at a demo — bring your current knives.`, ctas: [CTA.bookFull, CTA.text('Hi Luke! How does Cutco actually compare to what I have?')], chips: ['Is this worth it?', 'How long is a demo?'] };

  // "What's in the Homemaker / a set?"
  if (/(what('?s| is) (in|inside) (the )?(homemaker|galley|signature|ultimate|a set|the set)|homemaker set\??$)/.test(n))
    return { t: `The <strong>Homemaker</strong> is Cutco's classic 10-piece block: the core prep knives, table knives, and the block itself &mdash; the &ldquo;whole kitchen in one decision&rdquo; option. Exact contents and current pricing are on the official page, and Luke can walk you through whether a full set or 2&ndash;3 targeted pieces fits you better &mdash; he'll tell you honestly if the set is too much.`, ctas: [CTA.official, CTA.finder], chips: ['Best 1\u20133 pieces', 'How much does it cost?'] };


  if (/\b(hi|hello|hey|yo|sup|howdy)\b/.test(n))
    return { t: `Hey — glad you're here. Tell me what you cook, who you're shopping for, or what you already own, and I'll point you to a smart starting point.`, chips: ['What should I get?', 'Gift ideas', 'I already own Cutco'] };

  if (/(thank|thanks|appreciate)\b/.test(n))
    return { t: `Anytime. The demo's the fun part if you want to see it all in person — otherwise just text Luke and he'll help.`, ctas: [CTA.bookFull, CTA.text()] };

  // "what should I get" — the classic open question
  if (/(what should i (get|buy)|where (do|should) i (start|begin)|help me (choose|decide|pick)|not sure (what|where)|recommend|suggestion|advice)/.test(n)) {
    const fit = getFit();
    if (fit) return { t: `You've already got a Kitchen Fit: <strong>${esc(fit.label)}</strong>. Want me to walk through your #1 pick, or should we text it to Luke and book a quick look?`, ctas: [CTA.finder, CTA.text('Hi Luke! My Kitchen Fit is ' + fit.label + '. Can we go over it?')], chips: ['Best 1–3 pieces', 'Help me book'] };
    return { t: `Start simple. Are you buying for <strong>yourself</strong>, a <strong>gift</strong>, or <strong>adding to Cutco you already own</strong>? That changes the answer — and the finder sorts it in about five questions.`, ctas: [CTA.finder], chips: ['For my own kitchen', 'A gift', 'I already own Cutco', 'Best 1–3 pieces'] };
  }

  // best few pieces
  if (/(best (1|one|1-3|1–3|few|knife|knives)|most popular|favorite|first knife|number one|top knife|one knife|start with|which knife|for my own kitchen|for myself)/.test(n))
    return { t: `Easy starting point: the everyday-prep lane. A <strong>Petite Chef</strong> (or Trimmer) handles most of what you do daily, and <strong>Super Shears</strong> quietly become the most-used tool in the drawer. Want them ranked for how <em>you</em> cook?`, recs: matchProducts('petite chef trimmer shears', 3), ctas: [CTA.finder, CTA.explore('chef', 'Show everyday pieces')], chips: ['I cook a lot', 'I barely cook', 'Gift ideas'] };

  // gifts
  if (/(gift|wedding|registry|present|housewarming|graduation|grad|for (a|my) (friend|mom|dad|parent|sister|brother|couple))/.test(n)) {
    const g = matchProducts(n.replace(/knife|knives/g, '') + ' gift wedding set', 3);
    return { t: `For gifts, the safest move is something useful without knowing their whole kitchen — American-made, beautifully boxed, and guaranteed forever. Who's it for — <strong>wedding, housewarming, parent, grad, or host</strong>? I'll narrow it down.`, recs: g.length ? g : matchProducts('gift set homemaker', 3), ctas: [CTA.finder, CTA.explore('set', 'Show gift-friendly sets')], chips: ['Wedding', 'Housewarming', 'Host / entertainer'] };
  }

  // college / apartment / small kitchen
  if (/(college|apartment|dorm|studio|small (kitchen|space|place)|first place|moving out)/.test(n))
    return { t: `For a smaller kitchen, go compact — a couple of do-everything pieces beat a giant block you won't use. The finder has a <strong>College / Apartment</strong> setup built in, and it's all guaranteed for life so it moves with you.`, recs: matchProducts('petite chef trimmer paring starter', 3), ctas: [CTA.finder, CTA.explore('starter', 'Show compact picks')], chips: ['Best 1–3 pieces', 'How much does it cost?'] };

  // barely cook
  if (/(don'?t (really )?cook|barely cook|hardly cook|not much of a cook|simple meals|basic cooking)/.test(n))
    return { t: `No problem — most people overbuy. One good everyday knife (the <strong>Petite Chef</strong>) plus <strong>Super Shears</strong> covers simple cooking without the clutter.`, recs: matchProducts('petite chef shears trimmer', 3), ctas: [CTA.finder], chips: ['Best 1–3 pieces', 'Gift ideas'] };

  // cook a lot
  if (/(cook a lot|love (to )?cook|cook (every|most) day|serious cook|home chef|i'?m a chef)/.test(n))
    return { t: `Nice — for a kitchen that cooks a lot you want daily drivers that keep up: a <strong>chef's knife or Santoku</strong>, a <strong>paring knife</strong>, and <strong>shears</strong>. The finder ranks a full everyday setup for you.`, recs: matchProducts('santoku french chef paring shears', 3), ctas: [CTA.finder, CTA.explore('chef', 'Show everyday pieces')], chips: ['Full setup', 'Best 1–3 pieces'] };

  // host / entertain
  if (/(host|hosting|entertain|dinner party|guests|charcuterie board)/.test(n))
    return { t: `For hosting, think serving and the table: a <strong>Carving Set</strong> for roasts, a <strong>Cheese knife</strong> for boards, and <strong>Steak Knives</strong> for guests.`, recs: matchProducts('carving cheese steak host', 3), ctas: [CTA.finder, CTA.explore('table', 'Show table & serving pieces')], chips: ['Gift ideas', 'Help me book'] };

  // specific foods
  if (/(grill|bbq|steak|meat|roast|turkey|brisket|carve)/.test(n))
    return { t: `For grilling and meats: a <strong>Carving Set</strong> handles roasts and holiday birds, <strong>Steak Knives</strong> sort the table, and a Trimmer is great for trimming.`, recs: matchProducts('carving steak trimmer meat', 3), ctas: [CTA.finder], chips: ['Host / entertainer', 'Best 1–3 pieces'] };
  if (/(bread|loaf|bagel|tomato|tomatoes)/.test(n))
    return { t: `A <strong>Slicer (bread knife)</strong> with Cutco's Double-D edge glides through crusty bread, bagels, and ripe tomatoes without squishing them.`, recs: matchProducts('bread slicer', 3), ctas: [CTA.finder], chips: ['Best 1–3 pieces', 'I cook a lot'] };
  if (/(vegetable|veggie|onion|chop|dice|salad)/.test(n))
    return { t: `For veggies, a <strong>Santoku</strong> or <strong>Petite Chef</strong> makes chopping and dicing fast and clean — the two knives most people reach for daily.`, recs: matchProducts('santoku petite chef vegetable', 3), ctas: [CTA.finder, CTA.explore('knives', 'Show kitchen knives')], chips: ['Best 1–3 pieces'] };
  if (/(fish|fillet|salmon|sushi)/.test(n))
    return { t: `For fish, a flexible <strong>Fillet Knife</strong> is the tool; the <strong>Salmon Knife</strong> is great for clean, thin slices.`, recs: matchProducts('fillet salmon fish', 3), ctas: [CTA.finder], chips: ['Best 1–3 pieces'] };
  if (/(shear|scissor|herbs|poultry)/.test(n))
    return { t: `<strong>Super Shears</strong> are the sleeper hit — herbs, poultry, packaging, kitchen odd-jobs — and they take apart for easy cleaning.`, recs: matchProducts('shears', 2), ctas: [CTA.explore('tools', 'Show tools & gadgets'), CTA.finder], chips: ['Best 1–3 pieces', 'Gift ideas'] };

  // already own Cutco → owner lane
  if (/(already (own|have)|i own|adding to|add on|complement|owner|my (cutco|set)|fill (in )?the gap)/.test(n))
    return { t: `Perfect \u2014 tell me exactly what you own (just list the pieces, like \u201cPetite Chef, table knives, shears\u201d) and I\u2019ll tell you the honest gaps worth filling and what to skip. And remember: sharpening what you already own is <strong>free for life</strong>.`, ctas: [CTA.text('Hi Luke! I already own some Cutco \u2014 here\u2019s my list: '), CTA.explore('all', 'Browse the catalog')], chips: ['Sharpening help', 'Best 1\u20133 pieces'] };
  // sharpening / guarantee / damage
  if (/(sharpen|dull|damage|damaged|broke|broken|chip|guarantee|warranty|forever|replace|lifetime|repair|service)/.test(n))
    return { t: `Cutco's <strong>Forever Guarantee</strong> is the real deal: free sharpening for life, plus repair or replacement if a knife ever fails to perform (small return-shipping fee). It even transfers with the product, so gifts and hand-me-downs are covered. Send yours in — or Luke can walk you through it.`, ctas: [CTA.text('Hi Luke! I need help with sharpening / the guarantee.'), CTA.bookQuick], chips: ['I already own Cutco', 'Is this pushy?'] };

  // pricing — HONEST, no "live", no invented numbers
  if (/(price|prices|cost|how much|expensive|afford|budget|cheap|worth it|overpriced|justify|payment|financ|installment)/.test(n))
    return { t: `Prices can change, so treat anything on the site as a <strong>June 2026 snapshot</strong> and confirm current pricing through Luke or the official Cutco page. There's a range for every budget — from a single starter knife to full sets — and Luke can talk through payment options too.`, recs: recs.length ? recs : matchProducts('starter set', 2), ctas: [CTA.official, CTA.price()], chips: ['Best 1–3 pieces', 'Is this worth it?'] };

  // referred visitor (checked BEFORE the make-a-referral intent below)
  if (/(i was referred|was referred|someone (sent|referred) me|got your (site|number) from|friend sent me)/.test(n))
    return { t: `Welcome — glad they sent you. Quick version: Luke shows you the pieces, answers questions, and helps you figure out what actually fits. You decide from there, and "nothing right now" is a fine answer. The <a href="/referred" data-ev="path_referred">referred page</a> walks through exactly what to expect.`, ctas: [CTA.bookFull, CTA.text('Hi Luke! A friend referred me — can we set something up?')], chips: ['What happens in a demo?', 'Best 1–3 pieces', 'Is this pushy?'] };

  // "what should I text Luke?"
  if (/(what (should|do) i (text|say|send|write)|how do i (reach|contact) (luke|him))/.test(n))
    return { t: `Keep it simple — one line is plenty. Something like: <em>"Hi Luke! I'm looking at [gift / my kitchen / my Cutco set] — where should I start?"</em> He takes it from there. Tap below and it's pre-typed for you.`, ctas: [CTA.text('Hi Luke! Here\'s my situation: '), CTA.finder], chips: ['Gift ideas', 'I already own Cutco', 'Help me book'] };

  // full vs quick chooser (checked BEFORE the generic demo intent)
  if (/(full or quick|quick or full|which (demo|one) (should|do)|full vs\.? quick|hour or 20)/.test(n))
    return { t: `Simple rule: <strong>the hour is the full demo</strong> — rope cut, tomatoes, and time to compare pieces. <strong>The Quick 20 is for when you already know what you want</strong> — gift ideas, owner questions, or confirming a shortlist. If it's your first look at Cutco, take the hour.`, ctas: [CTA.bookFull, CTA.text('Hi Luke! Can we set up a quick 20-minute chat?')], chips: ['What happens in a demo?', 'Do I have to buy anything?'] };

  // pushy / MLM / Vector
  if (/(pushy|pressure|sales pitch|mlm|pyramid|scam|vector|recruit|is it (a )?)/.test(n))
    return { t: `No. The point is to see the pieces, ask questions, and decide what actually fits — you don't have to buy anything. It's not MLM: Luke doesn't recruit you, and you buy directly from Cutco at the same prices shown on cutco.com.`, ctas: [CTA.bookQuick, CTA.text("Hi Luke! I'm curious but no-pressure — can you help?")], chips: ['How long is a demo?', 'Do I have to buy anything?'] };

  // demo / book
  if (/(demo|book|booking|appointment|meet|meeting|schedule|show me|in person|video call)/.test(n))
    return { t: `The <strong>Full Experience</strong> is best if you want to actually see the pieces (about an hour — the rope cut, tomatoes, the works). The <strong>Quick 20</strong> is better if you already know what you want or just have a few questions.`, ctas: [CTA.bookFull, CTA.bookQuick], chips: ['How long is a demo?', 'Do I have to buy anything?'] };

  // demo length
  if (/(how long|duration|how much time|take long)/.test(n))
    return { t: `Two options: the <strong>Full Experience</strong> runs about an hour (the fun one — you see everything), or the <strong>Quick 20</strong> is roughly 20 minutes if you just need answers. Both are in person or over video.`, ctas: [CTA.bookFull, CTA.bookQuick] };

  // obligation
  if (/(have to buy|obligation|commit|forced|pressure to buy|do i need to)/.test(n))
    return { t: `Nope — zero obligation. Come see the pieces, ask questions, and decide later. Plenty of people just want a look, and that's genuinely welcome.`, ctas: [CTA.bookQuick, CTA.text()], chips: ['Is this pushy?', 'How long is a demo?'] };

  // referral
  if (/(referr?al|refer|friend who|know someone|recommend luke|send a friend)/.test(n))
    return { t: `Love it — referrals are the best compliment. Text Luke your friend's name (with their OK) and he'll reach out with zero pressure.`, ctas: [CTA.text('Hi Luke! I want to refer a friend — here are their details:')], chips: ['Gift ideas', 'Help me book'] };

  // my result / kitchen fit
  if (/(my (result|pick|fit)|kitchen fit|my recommendation|explain (my|the) (pick|#1))/.test(n)) {
    const fit = getFit();
    if (fit) return { t: `Your Kitchen Fit is <strong>${esc(fit.label)}</strong>, and your #1 pick was chosen to match how you answered. Want the full ranked list again, or should we text it to Luke?`, ctas: [CTA.finder, CTA.text('Hi Luke! My Kitchen Fit is ' + fit.label + '. Can we go over my picks?')], chips: ['Best 1–3 pieces', 'Help me book'] };
    return { t: `Take the quick finder and I'll give you a <strong>Kitchen Fit</strong> plus a ranked #1 pick with two supporting options.`, ctas: [CTA.finder] };
  }

  // my list
  if (/(my list|wish ?list|saved|cart)/.test(n)) {
    const list = getList();
    if (list.length) return { t: `You've got <strong>${list.length}</strong> ${list.length === 1 ? 'piece' : 'pieces'} saved. I can't confirm a current total, but Luke can — want to send him the list for a price check?`, ctas: [{ label: 'Send My List to Luke', href: listSms(), ev: 'assistant_text_luke_click' }, CTA.official], chips: ['Best 1–3 pieces', 'Help me book'] };
    return { t: `Your list is empty so far — browse the catalog and tap <em>Add to My List</em> on anything you like, then text it to Luke for a price check.`, ctas: [CTA.explore('all', 'Browse the catalog'), CTA.finder] };
  }

  // made in USA / about
  if (/(made in|where.*made|usa|american|america)/.test(n))
    return { t: `Cutco has been made in the USA (Olean, New York) since 1949 — built to be kept for life, sharpened, used daily, and handed down. Want a starting point? Tell me how you cook.`, ctas: [CTA.finder] };
  if (/(who are you|about luke|about you|your story|who is luke|meet luke)/.test(n))
    return { t: `Luke Hansen is your Cutco guy — a 2026 Cutco Key Salesman on the North Shore (Winnetka). Honest help, straight answers, and you decide what fits.`, ctas: [{ label: 'Meet Luke', href: '/meet', ev: 'assistant_text_luke_click' }, CTA.bookQuick] };
  if (/(ship|shipping|deliver|delivery|arrive|tracking)/.test(n))
    return { t: `Most Cutco orders arrive in about <strong>2–4 business days</strong>, and Luke keeps you posted from order to doorstep.`, ctas: [CTA.text()] };
  if (/(return|refund|money back|money-back|trial|send it back)/.test(n))
    return { t: `New purchases come with a <strong>15-day money-back guarantee</strong>, and after that the Forever Guarantee covers sharpening, repair, and replacement for life. About as low-risk as it gets.`, ctas: [CTA.bookQuick] };
  if (/(special|sale|deal|discount|promo|coupon|offer)/.test(n))
    return { t: `Cutco runs rotating specials and owner-only offers that change month to month. Here's the official page: <a href="${CUTCO_SPECIALS}" target="_blank" rel="noopener" data-ev="official_cutco_link_click">current specials ↗</a>. Or ask Luke what's best right now.`, ctas: [CTA.text("Hi Luke! What Cutco specials are running right now?")] };

  // product match fallback
  if (recs.length)
    return { t: `Here's what I'd look at first — then let's figure out the full picture:`, recs, ctas: [CTA.finder, CTA.explore('all', 'Browse the catalog')], chips: MENU_CHIPS.slice(0, 3) };

  // final fallback
  return { t: `I want to point you to the right thing — try naming what you're cutting (veggies, bread, fish, meat, cheese), who it's for (a gift, a new kitchen), or what you already own. Or take the finder and I'll rank a setup for you.`, ctas: [CTA.finder, CTA.text('Hi Luke! I have a Cutco question:')], chips: START_CHIPS.slice(0, 4) };
}

// ---------------------------------------------------------------------------
// Willow — Luke's grey Maine Coon, the face of the sidekick. Real photo
// (assets/willow-avatar.webp) with layered animated eyelids (blink), a 3D
// tilt that follows the cursor, and expression states: curious (you're
// typing), talking (she's answering). No voice, no libraries, no tracking.
// ---------------------------------------------------------------------------
const WILLOW_HTML = `<span class="willow-wrap" aria-hidden="true">
  <img src="/assets/willow-avatar.webp" alt="" class="willow-photo" width="320" height="320" loading="lazy" decoding="async"/>
  <svg class="willow-lids" viewBox="0 0 100 100" preserveAspectRatio="none">
    <ellipse class="willow-lid willow-lid--l" cx="40" cy="44.7" rx="6.2" ry="0" fill="#a39889"/>
    <ellipse class="willow-lid willow-lid--r" cx="61.3" cy="44.7" rx="6.2" ry="0" fill="#a39889"/>
  </svg>
</span>`;

function wireWillow3d() {
  const head = mount.querySelector('.asst-head');
  const wrap = mount.querySelector('.willow-wrap');
  if (!head || !wrap) return;
  const fine = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  const noMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || noMotion) return;
  head.addEventListener('mousemove', e => {
    const r = wrap.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    wrap.style.transform = 'rotateY(' + (dx * 16).toFixed(1) + 'deg) rotateX(' + (-dy * 12).toFixed(1) + 'deg) scale(1.04)';
  });
  head.addEventListener('mouseleave', () => { wrap.style.transform = ''; });
}
// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function makeEl(tag, cls, html) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html != null) d.innerHTML = html;
  return d;
}
function scrollBottom(el) { el.scrollTop = el.scrollHeight; }

// ---------------------------------------------------------------------------
// Mount references
// ---------------------------------------------------------------------------
let mount = null;
let logEl = null;

// ---------------------------------------------------------------------------
// Render the assistant shell
// ---------------------------------------------------------------------------
function renderShell() {
  mount.innerHTML = `
    <div class="asst-box">
      <div class="asst-head">
        ${WILLOW_HTML}
        <div class="asst-head-id">
          <span class="asst-head-name">Willow</span>
          <span class="asst-head-sub">Luke&rsquo;s Maine Coon &middot; Cutco Sidekick</span>
        </div>
      </div>
      <div class="asst-log" id="asst-log" role="log" aria-live="polite"
           aria-label="Conversation with Willow, Luke's Cutco sidekick" aria-atomic="false" tabindex="0"></div>
      <div class="asst-chips" id="asst-chips" aria-label="Suggested questions"></div>
      <form class="asst-form" id="asst-form" novalidate>
        <label for="asst-input" class="asst-sr-only">Ask Willow a question</label>
        <input id="asst-input" class="asst-input" type="text"
          placeholder="Ask Willow about pieces, gifts, sharpening, pricing, or demos\u2026"
          aria-label="Ask Willow, the Cutco sidekick" autocomplete="off" maxlength="300" />
        <button class="btn btn-primary asst-send" type="submit">Ask</button>
      </form>
      <p class="asst-tip">Willow&rsquo;s an AI assistant (and a cat) &mdash; great for quick questions. For anything important, text Luke. Prices she mentions are snapshots &mdash; confirm on cutco.com.</p>
    </div>
  `;
  logEl = mount.querySelector('#asst-log');
  wireWillow3d();
  const box = mount.querySelector('.asst-box');
  const inp = mount.querySelector('#asst-input');
  if (box && inp) {
    inp.addEventListener('focus', () => box.classList.add('asst--curious'));
    inp.addEventListener('blur', () => box.classList.remove('asst--curious'));
  }
}

// ---------------------------------------------------------------------------
// Render CTAs (action buttons) under a bot reply
// ---------------------------------------------------------------------------
function renderCtas(parent, ctas) {
  if (!ctas || !ctas.length) return;
  const row = makeEl('div', 'asst-ctas');
  ctas.forEach(c => {
    if (c.explore) {
      // Explorer tie-in: set the search box and scroll to the catalog
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'asst-cta';
      btn.textContent = c.label;
      btn.addEventListener('click', () => {
        track('assistant_quick_chip_click');
        const input = document.getElementById('expSearch');
        if (input) { input.value = c.explore === 'all' ? '' : c.explore; input.dispatchEvent(new Event('input', { bubbles: true })); }
        const sel = document.getElementById('expSelect');
        if (sel && ['all','knives','table','tools','cookware','flatware','outdoors','sets'].includes(c.explore)) { sel.value = c.explore; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        const target = document.getElementById('explore');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      row.appendChild(btn);
    } else {
      const a = document.createElement('a');
      a.className = 'asst-cta' + (c.finder ? ' asst-cta--primary' : '');
      a.href = c.finder ? FINDER : c.href;
      a.textContent = c.label;
      if (c.ev) a.setAttribute('data-ev', c.ev);
      if (c.external) { a.target = '_blank'; a.rel = 'noopener'; }
      if (c.finder) a.addEventListener('click', () => {
        const m = document.getElementById('recommender');
        if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      row.appendChild(a);
    }
  });
  parent.appendChild(row);
}

// ---------------------------------------------------------------------------
// Render follow-up quick chips under a bot reply
// ---------------------------------------------------------------------------
function renderFollowups(parent, chips) {
  if (!chips || !chips.length) return;
  const row = makeEl('div', 'asst-followups');
  chips.forEach(text => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'asst-chip asst-chip--sm';
    btn.textContent = text;
    btn.addEventListener('click', () => handleAsk(text, 'chip'));
    row.appendChild(btn);
  });
  parent.appendChild(row);
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
function addUserMsg(text) {
  const d = makeEl('div', 'asst-msg asst-msg--user');
  d.textContent = text;
  logEl.appendChild(d);
  scrollBottom(logEl);
}

function addBotMsg(html, opts) {
  opts = opts || {};
  const d = makeEl('div', 'asst-msg asst-msg--bot', html);

  if (opts.recs && opts.recs.length) {
    const wrap = makeEl('div', 'asst-recs');
    opts.recs.forEach(p => {
      const a = document.createElement('a');
      a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
      a.className = 'asst-rec'; a.textContent = p.n;
      a.setAttribute('data-ev', 'official_cutco_link_click');
      wrap.appendChild(a);
    });
    d.appendChild(wrap);
  }
  renderCtas(d, opts.ctas);
  renderFollowups(d, opts.chips);

  logEl.appendChild(d);
  scrollBottom(logEl);
}

function addTyping() {
  const box = mount && mount.querySelector('.asst-box');
  if (box) box.classList.add('asst--talking');
  const d = makeEl('div', 'asst-msg asst-msg--bot asst-typing',
    '<span class="asst-dot" aria-hidden="true"></span>' +
    '<span class="asst-dot" aria-hidden="true"></span>' +
    '<span class="asst-dot" aria-hidden="true"></span>'
  );
  logEl.appendChild(d);
  scrollBottom(logEl);
  return d;
}

function addErrorMsg() {
  const d = makeEl('div', 'asst-msg asst-msg--bot asst-msg--error');
  d.innerHTML = `Something went sideways on my end — <a href="${PHONE}" data-ev="assistant_text_luke_click">text Luke at ${PHONE_DISPLAY}</a> and he'll sort it out.`;
  logEl.appendChild(d);
  scrollBottom(logEl);
}

// ---------------------------------------------------------------------------
// Empty-state suggested chips
// ---------------------------------------------------------------------------
function renderChips(questions) {
  const chipsEl = mount.querySelector('#asst-chips');
  if (!chipsEl) return;
  chipsEl.hidden = false;
  chipsEl.innerHTML = '';
  questions.forEach(q => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'asst-chip';
    btn.textContent = q;
    btn.addEventListener('click', () => handleAsk(q, 'chip'));
    chipsEl.appendChild(btn);
  });
}
function hideChips() {
  const chipsEl = mount && mount.querySelector('#asst-chips');
  if (chipsEl) chipsEl.hidden = true;
}

// ---------------------------------------------------------------------------
// Ask flow
// ---------------------------------------------------------------------------
/**
 * Safe topic categorization for analytics — logs ONLY a coarse category,
 * never the message text itself.
 */
function topicOf(q) {
  const n = norm(q);
  if (/(price|cost|how much|expensive|afford|budget|payment)/.test(n)) return 'price';
  if (/(guarantee|warranty|sharpen|repair|replace|forever|service)/.test(n)) return 'guarantee';
  if (/(gift|wedding|registry|housewarming|grad)/.test(n)) return 'gift';
  if (/(already own|i own|my cutco|my set|inherit)/.test(n)) return 'owner';
  if (/(book|demo|appointment|schedule|meet)/.test(n)) return 'booking';
  if (/(pushy|pressure|mlm|scam|vector|legit)/.test(n)) return 'skeptic';
  if (/(refer|friend|intro)/.test(n)) return 'referral';
  if (/(knife|knives|santoku|shears|paring|set|cookware|piece)/.test(n)) return 'product';
  return 'other';
}

function handleAsk(raw, source) {
  const q = (raw || '').trim();
  if (!q) return;

  track('assistant_message_send');
  track('ai_topic_' + topicOf(q));
  if (source === 'chip') track('assistant_quick_chip_click');

  hideChips();
  addUserMsg(q);

  const input = mount.querySelector('#asst-input');
  if (input) { input.value = ''; input.focus(); }

  const typingEl = addTyping();
  const delay = 340 + Math.random() * 220;
  setTimeout(() => {
    typingEl.remove();
    try {
      const r = reply(q);
      addBotMsg(r.t, { recs: r.recs, ctas: r.ctas, chips: r.chips });
      const box = mount && mount.querySelector('.asst-box');
      if (box) { box.classList.add('asst--talking'); setTimeout(() => box.classList.remove('asst--talking'), 1600); }
    } catch { addErrorMsg(); }
  }, delay);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  mount = document.getElementById('assistant');
  if (!mount) return;

  renderShell();
  track('assistant_open');

  // Greeting — natural, confident, not emoji-heavy. Adapt to page context.
  const fit = getFit();
  const list = getList();
  let greetCtas = [CTA.finder];
  let contextLine = '';
  if (fit) {
    contextLine = ` You already have a Kitchen Fit saved: <strong>${esc(fit.label)}</strong> — want to revisit it?`;
    greetCtas = [CTA.finder, CTA.text('Hi Luke! My Kitchen Fit is ' + fit.label + '. Can we go over it?')];
  } else if (list.length) {
    contextLine = ` You've got <strong>${list.length}</strong> saved on your list — I can help you send it to Luke for a price check.`;
    greetCtas = [{ label: 'Send My List to Luke', href: listSms(), ev: 'assistant_text_luke_click' }, CTA.finder];
  }

  addBotMsg(
    `Hi \u2014 I&rsquo;m <strong>Willow</strong>, Luke&rsquo;s Maine Coon and unofficial business partner. I&rsquo;ve napped through every demo, so I know the whole catalog cold. Ask me what to get, what pieces actually do, gifts, sharpening, or pricing \u2014 I&rsquo;ll keep it short and point you right. If it needs the human, I&rsquo;ll help you text Luke.${contextLine}`,
    { ctas: greetCtas }
  );
  renderChips(fit ? ['Explain my #1 pick', 'Gift ideas', 'Sharpening help', 'Help me book'] : START_CHIPS);

  const form = mount.querySelector('#asst-form');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const input = mount.querySelector('#asst-input');
    handleAsk(input ? input.value : '', 'input');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
