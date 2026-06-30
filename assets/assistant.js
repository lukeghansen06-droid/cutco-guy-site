/* assets/assistant.js
 * Luke's Cutco Assistant — polished UI for the #assistant mount on /find.
 *
 * HOW IT WORKS (client-side only, no backend):
 *   Ported faithfully from the old site's inline "Luke's Cutco Assistant"
 *   (commit 27c26bb, index.html). The old code was a pure client-side IIFE
 *   with keyword/regex canned responses — zero API calls. This module keeps
 *   the exact same reply() logic and SYN synonym dictionary; it adds improved
 *   UX: suggested-question chips, clear empty + error states, aria-live
 *   announcements, and proper keyboard access.
 *
 * SECURITY: all user-provided text is rendered via textContent or run through
 *   esc() before any innerHTML use. Bot responses contain only pre-written
 *   trusted HTML (links, <strong>) — never user-supplied content.
 *
 * PROGRESSIVE ENHANCEMENT: the static fallback card inside #assistant remains
 *   untouched unless JS loads successfully. mount.innerHTML is only replaced
 *   inside init(), which only runs if #assistant exists.
 */

// ---------------------------------------------------------------------------
// Escape helper — same contract as recommender-ui.js
// ---------------------------------------------------------------------------
/** Escape a dynamic string for safe use in innerHTML. */
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
const PHONE = 'sms:+13126594280';
const PHONE_DISPLAY = '312-659-4280';
const CUTCO_PRODUCTS = 'https://www.cutco.com/products/';
const CUTCO_SPECIALS = 'https://www.cutco.com/promotions/sale';

/** Suggested-question chips shown in the empty state. */
const CHIPS = [
  'What knife should I start with?',
  'What should I gift for a wedding?',
  'How does the guarantee work?',
  'How much does it cost?',
  'Is this pushy?',
  'Knife for filleting fish',
];

// ---------------------------------------------------------------------------
// Synonym dictionary — ported verbatim from old assistant (commit 27c26bb)
// ---------------------------------------------------------------------------
const SYN = {
  veg:['vegetable'],veggie:['vegetable'],veggies:['vegetable'],vegetable:['vegetable'],vegetables:['vegetable'],
  onion:['vegetable','chopping'],onions:['vegetable','chopping'],tomato:['vegetable'],tomatoes:['vegetable'],
  fruit:['paring','fruit'],apple:['paring'],apples:['paring'],potato:['paring','vegetable'],
  fish:['salmon','fillet','fish'],salmon:['salmon','fillet'],filet:['fillet'],fillet:['fillet'],sushi:['santoku'],
  bread:['bread'],loaf:['bread'],bagel:['bread'],
  meat:['carver','butcher','steak'],steak:['steak'],roast:['carver','carving'],turkey:['carver','carving'],
  ham:['carver'],carve:['carver','carving'],carving:['carver','carving'],brisket:['carver'],
  cheese:['cheese'],charcuterie:['cheese'],
  hunt:['hunting'],hunting:['hunting'],deer:['hunting'],elk:['hunting'],game:['hunting'],skinning:['hunting'],
  camp:['camping'],camping:['camping'],survival:['camping'],bushcraft:['camping'],
  outdoor:['outdoor','hunting'],outdoors:['outdoor','hunting'],
  fishing:['fillet','fish'],angler:['fillet'],
  scissor:['shears'],scissors:['shears'],shear:['shears'],shears:['shears'],herbs:['shears'],poultry:['shears'],
  peel:['peeler','paring'],peeler:['peeler'],
  pizza:['pizza'],can:['can opener'],wine:['wine'],cork:['wine'],
  sharpen:['sharpener'],sharpening:['sharpener'],dull:['sharpener'],
  pan:['pan','cookware'],pans:['pan','cookware'],pot:['pot','cookware'],pots:['pot','cookware'],
  skillet:['pan'],saucepan:['sauce','cookware'],cookware:['cookware'],fry:['pan'],saute:['pan'],wok:['wok'],
  flatware:['flatware'],silverware:['flatware'],fork:['flatware'],forks:['flatware'],
  spoon:['flatware'],spoons:['flatware'],
  gift:['gift','wedding'],gifts:['gift'],wedding:['wedding','gift'],registry:['wedding'],present:['gift'],
  housewarming:['housewarming','gift'],graduation:['grad','gift'],grad:['grad'],
  set:['set'],sets:['set'],block:['block','set'],
  starter:['starter'],beginner:['starter'],first:['starter'],apartment:['starter','small'],
  small:['small','starter'],cheap:['starter'],affordable:['starter'],
  chef:['chef'],santoku:['santoku'],everyday:['utility','everyday'],utility:['utility'],
  paring:['paring'],pare:['paring'],
  boning:['boning'],debone:['boning'],bone:['boning'],
  golf:['golf'],pocket:['pocket'],edc:['pocket'],folding:['pocket'],
  slice:['slicer'],slicing:['slicer'],dice:['dicing','chef'],chop:['chopping','chef'],chopping:['chopping','chef'],
};

// ---------------------------------------------------------------------------
// Minimal product list for contextual recommendations.
// (The /find page does not have window.CutcoData; this local list covers the
// most-requested products with direct cutco.com links.)
// ---------------------------------------------------------------------------
const PRODUCTS = [
  { n: 'Petite Chef Knife',  k: 'chef everyday all-purpose vegetable chopping',   url: 'https://www.cutco.com/products/knives/petite-chef-knife' },
  { n: 'Trimmer',            k: 'everyday utility small versatile',                url: 'https://www.cutco.com/products/knives/trimmer' },
  { n: 'French Chef Knife',  k: 'chef all-purpose chopping vegetable',             url: 'https://www.cutco.com/products/knives/french-chef-knife' },
  { n: 'Santoku',            k: 'santoku sushi japanese all-purpose vegetable',    url: 'https://www.cutco.com/products/knives/santoku' },
  { n: 'Paring Knife',       k: 'paring peeling fruit apple potato small',         url: 'https://www.cutco.com/products/knives/paring-knife' },
  { n: 'Bread Knife',        k: 'bread loaf bagel serrated',                       url: 'https://www.cutco.com/products/knives/bread-knife' },
  { n: 'Salmon Knife',       k: 'salmon fish fillet sushi seafood',                url: 'https://www.cutco.com/products/knives/salmon-knife' },
  { n: 'Fillet Knife',       k: 'fillet fish fishing angler flexible',             url: 'https://www.cutco.com/products/knives/fillet-knife' },
  { n: 'Carving Set',        k: 'carver carving roast turkey ham brisket meat',    url: 'https://www.cutco.com/products/knives/carving-fork-and-knife-set' },
  { n: 'Cheese Knife',       k: 'cheese charcuterie board',                        url: 'https://www.cutco.com/products/knives/cheese-knife' },
  { n: 'Super Shears',       k: 'shears scissors herbs poultry kitchen',           url: 'https://www.cutco.com/products/kitchen-tools/super-shears' },
  { n: 'Vegetable Peeler',   k: 'peeler peel potato fruit',                        url: 'https://www.cutco.com/products/kitchen-tools/peeler' },
  { n: 'Homemaker+8 Set',    k: 'set starter gift homemaker all-purpose block',    url: 'https://www.cutco.com/products/sets/homemaker-8-set' },
  { n: 'Hunting Knife',      k: 'hunting deer elk game outdoor camp skinning',     url: 'https://www.cutco.com/products/outdoor/hunting-knife' },
  { n: 'Steak Knife Set',    k: 'steak knife table dinner mealtime',               url: 'https://www.cutco.com/products/knives/steak-knife' },
  { n: 'Cookware Set',       k: 'cookware pan pot skillet wok saucepan saute',     url: 'https://www.cutco.com/products/cookware' },
];

// ---------------------------------------------------------------------------
// Keyword matching — ported from old assistant
// ---------------------------------------------------------------------------
function norm(s)    { return (s || '').toLowerCase(); }
function tokens(s)  { return norm(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean); }
function expand(s)  {
  const w = tokens(s);
  const out = [...w];
  w.forEach(x => { if (SYN[x]) out.push(...SYN[x]); });
  return out;
}
function matchProducts(q, limit = 3) {
  const toks = expand(q);
  return PRODUCTS
    .map(p => {
      const hay = (p.n + ' ' + p.k).toLowerCase();
      let s = 0;
      toks.forEach(t => { if (t.length > 2 && hay.includes(t)) s++; });
      return { p, s };
    })
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.p);
}

// ---------------------------------------------------------------------------
// Canned response engine — ported verbatim from old assistant (commit 27c26bb)
// Returns { t: string (pre-trusted HTML), recs?: Product[] }
// ---------------------------------------------------------------------------
function reply(q) {
  const n    = norm(q);
  const recs = matchProducts(q, 3);

  if (/\b(hi|hello|hey|yo|sup|howdy)\b/.test(n))
    return { t: `Hey! 👋 I'm Luke's assistant. Tell me what you cook (or who you're shopping for) and I'll point you to the right Cutco pieces. Try "a good vegetable knife" or "a wedding gift."` };

  if (/(thank|thanks|appreciate)\b/.test(n))
    return { t: `Anytime! 💙 <a href="${BOOK}">Book a free demo</a> to see it all in person — or just text Luke at <a href="${PHONE}">${PHONE_DISPLAY}</a>.` };

  if (/(price|prices|cost|how much|expensive|afford|budget|cheap)/.test(n))
    return { t: `Cutco sets the prices live on <a href="${CUTCO_PRODUCTS}" target="_blank" rel="noopener">cutco.com</a> — there's something for every budget, from a single starter knife to full sets. Tell me your budget and I'll suggest a starting point.`, recs: recs.length ? recs : matchProducts('starter set', 3) };

  if (/(guarantee|warranty|forever|sharpen|sharpening|dull|break|broke|broken|replace|lifetime|chip)/.test(n))
    return { t: `Cutco's <strong>Forever Guarantee</strong> is the real deal: free sharpening for life, and if a knife ever fails to perform Cutco corrects or replaces it (small return-shipping fee). It even covers accidental damage at half retail, and it <em>transfers</em> with the product — so gifts and hand-me-downs are covered too. <a href="${BOOK}">Ask Luke directly →</a>` };

  if (/(pushy|sales pitch|pressure|mlm|pyramid|vector marketing|is it)/.test(n))
    return { t: `No pressure — promise. I show you what fits, answer your questions, and you decide in your own time. It's not MLM: I don't recruit you, and you buy directly from Cutco at the same prices shown on cutco.com. If I'm ever pushy, call me on it.` };

  if (/(special|sale|deal|discount|promo|coupon|offer)/.test(n))
    return { t: `Cutco runs rotating specials, "set savings" bundles, and owner-only offers that change month to month. Here's the live page: <a href="${CUTCO_SPECIALS}" target="_blank" rel="noopener">current specials ↗</a>. Or <a href="${PHONE}">text Luke</a> and he'll tell you what's best right now.` };

  if (/(job|jobs|work|working|hiring|hire|apply|career|employ|become a rep|sell cutco)/.test(n))
    return { t: `Curious about doing what Luke does? Flexible schedule, real training, no experience needed — performance-based pay. Official info at <a href="https://www.vectormarketing.com" target="_blank" rel="noopener">Vector Marketing ↗</a>.` };

  if (/(demo|book|booking|appointment|meet|meeting|schedule|show me|in person|video call)/.test(n))
    return { t: `Love it. The <strong>1-hour demo</strong> is the fun one — you'll see the knives in action (the famous rope cut, tomatoes, the works), hear the Cutco story, and we'll build your perfect setup with zero pressure. <a href="${BOOK}">Grab a time →</a> (there's a quick 20-min option too).` };

  if (/(made in|where.*made|usa|american|america)/.test(n))
    return { t: `Cutco has been made in the USA (Olean, New York) since 1949, built to be kept for life — sharpened, used daily, and handed down. Want a starting point? Tell me how you cook.`, recs: recs.length ? recs : undefined };

  if (/(who are you|about luke|about you|your story|who is luke)/.test(n))
    return { t: `Luke Hansen is your Cutco guy — a 2026 Cutco Key Salesman on the North Shore (Winnetka). He's all about honest, zero-pressure help. <a href="/meet">Meet Luke</a> or <a href="${BOOK}">book a chat</a>.` };

  if (/(ship|shipping|deliver|delivery|arrive|tracking|when will)/.test(n))
    return { t: `Most Cutco orders arrive in about <strong>2–4 business days</strong>. I'll keep you posted from order to doorstep.` };

  if (/(buy online|order online|purchase|how do i buy|where to buy|how to order)/.test(n))
    return { t: `Two easy ways: buy through me (I place the order with Cutco for you) or browse everything on <a href="${CUTCO_PRODUCTS}" target="_blank" rel="noopener">cutco.com</a>. <a href="${PHONE}">Text Luke</a> your list and he'll take care of the rest.` };

  if (/(return|refund|money back|money-back|trial|send it back)/.test(n))
    return { t: `New purchases come with a <strong>15-day money-back trial</strong>, and after that the Forever Guarantee covers sharpening, repair, and replacement. Low-risk and easy.` };

  if (/(where are you|where.*located|location|near me|north shore|chicago|winnetka|travel|service area)/.test(n))
    return { t: `Luke's based on the North Shore (Winnetka) and serves Chicago, the North Shore, and the DePauw area — in person or over video anywhere. 📍` };

  if (/(care|clean|cleaning|wash|washing|dishwasher|maintain|maintenance|rust)/.test(n))
    return { t: `Quick tip: hand-wash and dry your Cutco to keep the edges at their best (dishwashers are tough on fine cutlery), and send blades in for free sharpening whenever they need it. I'll cover all of it at the demo.` };

  if (/(double.?d|double d|recessed edge|serrat|straight edge|which edge|edge type)/.test(n))
    return { t: `Cutco has two edges: the <strong>Double-D®</strong> (a recessed scallop-style edge that stays sharp a long time — great for crusty bread, tomatoes, meats) and a <strong>straight edge</strong> (for fine, smooth slicing). Most folks mix both; I'll help you choose.` };

  if (/(left.?hand|left handed|lefty|right handed)/.test(n))
    return { t: `Cutco's Double-D edge works for both left- and right-handed users, and some straight-edge pieces have handed options. Tell me which hand and I'll make sure you're set.` };

  if (/(worth it|too expensive|why so expensive|justify|overpriced|is it worth)/.test(n))
    return { t: `Fair question. The idea is buy-once: American-made and guaranteed for life with free sharpening, so instead of replacing cheap knives every few years you keep these for decades (many folks hand them down). Happy to show you the value — no pressure.` };

  if (/(best knife|most popular|favorite|first knife|what should i get|number one|top knife|one knife|start with|which knife)/.test(n))
    return { t: `If I had to pick: start with the <strong>Petite Chef</strong> or <strong>Trimmer</strong> — the true everyday workhorses. For a set, the <strong>Homemaker+8</strong> is the bestseller.`, recs: matchProducts('petite chef trimmer homemaker', 3) };

  if (/(fundrais|donat|charity|booster|school raise)/.test(n))
    return { t: `Yes — Cutco runs fundraising programs and they work really well. <a href="${PHONE}">Text Luke</a> and he'll connect you with the official details for your group.` };

  if (/(payment plan|financ|installment|pay over time|pay monthly|split)/.test(n))
    return { t: `Cutco offers payment options on many orders. <a href="${PHONE}">Text Luke</a> and he'll walk you through what's officially available — no pressure.` };

  if (/(steel|blade material|made of|metal|handle material)/.test(n))
    return { t: `Cutco blades are high-carbon stainless steel, made in the USA, paired with their signature ergonomic handles — built to be used hard and kept for life.` };

  if (/(phone|number|email|contact|reach luke|call you|get in touch)/.test(n))
    return { t: `Easiest ways to reach Luke: <a href="${PHONE}">text or call ${PHONE_DISPLAY}</a> or <a href="mailto:lukeghansen06@gmail.com">email</a>. He answers personally — usually fast. 🙂` };

  if (/(bye|goodbye|see ya|see you|that.s all|thats all|nothing else|all good)/.test(n))
    return { t: `Take care! 👋 <a href="${BOOK}">Book the full demo</a> to see everything in person — it's the fun part. 💙` };

  if (/(gift|wedding|registry|present|housewarming|graduation|grad)/.test(n)) {
    const g = matchProducts(n.replace(/knife|knives/g, '') + ' gift wedding', 3);
    return { t: `Cutco makes a gift people keep for life — beautifully boxed, American-made, guaranteed forever. Here are some crowd-pleasers:`, recs: g.length ? g : matchProducts('gift set homemaker', 3) };
  }

  if (recs.length)
    return { t: `Nice — here's what I'd look at first. Then let's chat about the full picture:`, recs };

  return { t: `I want to point you to the right thing — try naming what you're cutting (veggies, bread, fish, meat, cheese), who it's for (a gift, a new kitchen), or a category (cookware, flatware, hunting). Or just <a href="${PHONE}">text Luke at ${PHONE_DISPLAY}</a> and he'll sort it fast.` };
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function makeEl(tag, cls, html) {
  const d = document.createElement(tag);
  if (cls)       d.className = cls;
  if (html != null) d.innerHTML = html;
  return d;
}

function scrollBottom(el) {
  el.scrollTop = el.scrollHeight;
}

// ---------------------------------------------------------------------------
// Mount references (set in init)
// ---------------------------------------------------------------------------
/** @type {HTMLElement|null} */
let mount = null;
/** @type {HTMLElement|null} */
let logEl = null;

// ---------------------------------------------------------------------------
// Render the assistant shell (replaces static fallback)
// ---------------------------------------------------------------------------
function renderShell() {
  // max-width matches recommender card for visual consistency
  mount.innerHTML = `
    <div class="asst-box" style="max-width:600px;margin:0 auto">
      <div
        class="asst-log"
        id="asst-log"
        role="log"
        aria-live="polite"
        aria-label="Conversation with Luke's Cutco assistant"
        aria-atomic="false"
        tabindex="0"
      ></div>
      <div class="asst-chips" id="asst-chips" aria-label="Suggested questions"></div>
      <form class="asst-form" id="asst-form" novalidate>
        <label for="asst-input" class="asst-sr-only">Ask a question</label>
        <input
          id="asst-input"
          class="asst-input"
          type="text"
          placeholder="Type your question…"
          aria-label="Ask the Cutco assistant"
          autocomplete="off"
          maxlength="300"
        />
        <button class="btn btn-primary asst-send" type="submit">Ask</button>
      </form>
      <p class="asst-tip">Instant answers about knives, pricing, and the guarantee &mdash; knife talk only, not legal or financial advice.</p>
    </div>
  `;
  logEl = mount.querySelector('#asst-log');
}

// ---------------------------------------------------------------------------
// Add messages to the log
// ---------------------------------------------------------------------------
function addUserMsg(text) {
  // textContent: safe, never runs as HTML
  const d = makeEl('div', 'asst-msg asst-msg--user');
  d.textContent = text;
  logEl.appendChild(d);
  scrollBottom(logEl);
}

function addBotMsg(html, recs, isWelcome) {
  const d = makeEl('div', 'asst-msg asst-msg--bot', html);

  // Product recommendation links (safe: names from our own PRODUCTS array)
  if (recs && recs.length) {
    const wrap = makeEl('div', 'asst-recs');
    recs.forEach(p => {
      const a = document.createElement('a');
      a.href        = p.url;
      a.target      = '_blank';
      a.rel         = 'noopener';
      a.className   = 'asst-rec';
      a.textContent = p.n; // textContent: safe even though names come from our own array
      wrap.appendChild(a);
    });
    d.appendChild(wrap);
  }

  // Nudge to book — skip on welcome message
  if (!isWelcome) {
    const nudge = makeEl('p', 'asst-nudge');
    nudge.innerHTML = `Want the full picture? <a href="${BOOK}">Book a free 20-min chat →</a>`;
    d.appendChild(nudge);
  }

  logEl.appendChild(d);
  scrollBottom(logEl);
}

function addTyping() {
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
  d.innerHTML = `Something went sideways on my end — <a href="${PHONE}">text Luke at ${PHONE_DISPLAY}</a> and he'll sort it out.`;
  logEl.appendChild(d);
  scrollBottom(logEl);
}

// ---------------------------------------------------------------------------
// Suggested-question chips
// ---------------------------------------------------------------------------
function renderChips(questions) {
  const chipsEl = mount.querySelector('#asst-chips');
  if (!chipsEl) return;
  chipsEl.innerHTML = '';
  questions.forEach(q => {
    const btn = document.createElement('button');
    btn.type       = 'button';
    btn.className  = 'asst-chip';
    btn.textContent = q; // textContent: safe, CHIPS is our own constant
    btn.addEventListener('click', () => handleAsk(q));
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
function handleAsk(raw) {
  const q = (raw || '').trim();
  if (!q) return;

  hideChips();
  addUserMsg(q);    // textContent-safe

  // Clear input and return focus
  const input = mount.querySelector('#asst-input');
  if (input) { input.value = ''; input.focus(); }

  // Typing indicator, then reply
  const typingEl = addTyping();
  const delay = 360 + Math.random() * 240;
  setTimeout(() => {
    typingEl.remove();
    try {
      const r = reply(q);
      addBotMsg(r.t, r.recs, false);
    } catch {
      addErrorMsg();
    }
  }, delay);
}

// ---------------------------------------------------------------------------
// Init — progressive enhancement entry point
// ---------------------------------------------------------------------------
function init() {
  mount = document.getElementById('assistant');
  if (!mount) return;

  // Replace static fallback with interactive shell
  renderShell();

  // Empty state: welcome message + chips
  addBotMsg(
    `Hi! I’m Luke’s Cutco assistant 🔪 — ask me what you cook or who you’re shopping for and I’ll recommend the right pieces. What are you looking for?`,
    null,
    true  // isWelcome — suppress /book nudge on the greeting
  );
  renderChips(CHIPS);

  // Wire form submit
  const form = mount.querySelector('#asst-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = mount.querySelector('#asst-input');
      handleAsk(input ? input.value : '');
    });
  }
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
