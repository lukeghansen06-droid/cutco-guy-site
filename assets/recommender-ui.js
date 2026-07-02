/* assets/recommender-ui.js
 * Interactive quiz UI for the #recommender mount on /find.
 *
 * Progressive enhancement: replaces the static fallback only when JS runs.
 * If JS is off, the existing static card in #recommender remains untouched.
 *
 * Imports recommend() from /assets/recommender.js — the single source of truth.
 */

import { recommend } from '/assets/recommender.js';

// ---------------------------------------------------------------------------
// Intent chip → answer pre-selection map
// Chips on the page have data-intent="<key>". Clicking one pre-populates the
// matching answer fields, then scrolls to the quiz.
//
//   my-kitchen   → purpose=self        (for my own kitchen)
//   gift         → purpose=gift        (buying for someone else)
//   new-home     → purpose=newhome     (stocking a new place)
//   cook-a-lot   → cook=lots           (heavy cooking frequency)
//   barely-cook  → cook=barely         (minimal cooking)
//   already-own  → owns=true           (complement-knife path)
//   best-1-3     → budget=best + household=1  (best small selection)
//   full-setup   → household=5+ + budget=best (full household, full lineup)
// ---------------------------------------------------------------------------
const INTENT_MAP = {
  'my-kitchen':  { purpose: 'self' },
  'gift':        { purpose: 'gift' },
  'new-home':    { purpose: 'newhome' },
  'cook-a-lot':  { cook: 'lots' },
  'barely-cook': { cook: 'barely' },
  'already-own': { owns: true },
  'best-1-3':    { budget: 'best', household: '1' },
  'full-setup':  { household: '5+', budget: 'best' },
};

// ---------------------------------------------------------------------------
// Quiz question definitions
// ---------------------------------------------------------------------------
const QUESTIONS = [
  {
    key: 'cook',
    legend: 'How often do you cook?',
    options: [
      { value: 'lots',   label: 'A lot — cooking is my thing' },
      { value: 'some',   label: 'Some — a few times a week' },
      { value: 'barely', label: 'Barely — simple meals mostly' },
    ],
  },
  {
    key: 'household',
    legend: 'How many people in your household?',
    options: [
      { value: '1',   label: 'Just me' },
      { value: '2-4', label: '2–4 people' },
      { value: '5+',  label: '5 or more' },
    ],
  },
  {
    key: 'purpose',
    legend: 'Who is this for?',
    options: [
      { value: 'self',    label: 'My own kitchen' },
      { value: 'gift',    label: 'A gift for someone' },
      { value: 'newhome', label: 'New home / apartment' },
    ],
  },
  {
    key: 'budget',
    legend: 'Budget comfort level?',
    options: [
      { value: 'starter', label: 'Start small — just the essentials' },
      { value: 'mid',     label: 'Middle ground — solid set' },
      { value: 'best',    label: 'Best option — go all in' },
    ],
  },
  {
    key: 'owns',
    legend: 'Do you already own any Cutco?',
    boolKey: true,
    options: [
      { value: 'false', label: 'No — starting fresh' },
      { value: 'true',  label: 'Yes — looking to add on' },
    ],
  },
  {
    // SPIN "Problem" question — sharpens the result copy in recommender.js
    key: 'problem',
    legend: 'What’s most annoying in your kitchen right now?',
    options: [
      { value: 'dull',    label: 'Dull knives make prep a chore' },
      { value: 'prep',    label: 'Prep just takes too long' },
      { value: 'hardveg', label: 'Hard veggies & crusty bread fight back' },
      { value: 'meat',    label: 'Meat never slices clean' },
      { value: 'unsure',  label: 'Honestly — not knowing what to get' },
      { value: 'none',    label: 'Nothing specific, just exploring' },
    ],
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
/** @type {Record<string, string|boolean|null>} */
let answers = { cook: null, household: null, purpose: null, budget: null, owns: null, problem: null };
const TOTAL_QS = QUESTIONS.length;

/** @type {HTMLElement|null} */
let mount = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function allAnswered() {
  return Object.values(answers).every(v => v !== null);
}

/** Escape HTML to prevent XSS from any dynamic string used in innerHTML. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function renderQuiz() {
  if (!mount) return;

  const answeredCount = Object.values(answers).filter(v => v !== null).length;
  let html = `
    <form id="rec-form" novalidate aria-label="Product recommender quiz"
          style="max-width:600px;margin:0 auto">
      <div class="rec-quiz-head">
        <div class="rec-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${TOTAL_QS}" aria-valuenow="${answeredCount}" aria-label="Questions answered">
          <span class="rec-progress-fill" id="rec-progress-fill" style="width:${(answeredCount / TOTAL_QS * 100).toFixed(0)}%"></span>
        </div>
        <span class="rec-progress-txt" id="rec-progress-txt">${answeredCount} of ${TOTAL_QS}</span>
        <button type="button" class="rec-reset" id="rec-reset-top">Start over</button>
      </div>
  `;

  QUESTIONS.forEach(q => {
    const currentVal = answers[q.key];
    // boolKey questions store boolean; convert to string for comparison
    const currentStr = currentVal === null ? null : String(currentVal);

    html += `
      <fieldset style="
        border: 1px solid var(--line);
        border-radius: var(--radius);
        padding: clamp(14px,3vw,22px);
        margin-bottom: 14px;
      ">
        <legend style="
          font-weight: 600;
          color: var(--ink);
          padding: 0 8px;
          font-size: var(--fs-base);
        ">${esc(q.legend)}</legend>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px" role="group">
    `;

    q.options.forEach(opt => {
      const uid   = `rec-${q.key}-${opt.value}`;
      const isChk = currentStr === opt.value;
      const labelBorder  = isChk ? 'var(--cyan)' : 'var(--line)';
      const labelBg      = isChk ? 'rgba(34,211,238,.08)' : 'transparent';

      html += `
        <label for="${uid}" style="
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 10px 14px;
          min-height: 44px;
          min-width: 44px;
          border: 1.5px solid ${labelBorder};
          border-radius: 8px;
          font-size: var(--fs-sm);
          background: ${labelBg};
          transition: border-color .15s, background .15s;
          user-select: none;
        ">
          <input
            type="radio"
            id="${uid}"
            name="${q.key}"
            value="${esc(opt.value)}"
            ${isChk ? 'checked' : ''}
            style="accent-color:var(--cyan);width:16px;height:16px;flex-shrink:0;cursor:pointer"
          />
          ${esc(opt.label)}
        </label>
      `;
    });

    html += `</div></fieldset>`;
  });

  html += `
      <div style="text-align:center;margin-top:6px">
        <button
          type="submit"
          class="btn btn-primary"
          style="padding:13px 30px;font-size:var(--fs-base)"
        >See my pick &rarr;</button>
        <p style="color:var(--mut);font-size:var(--fs-sm);margin-top:10px;max-width:none">
          Answer the questions above, then hit &ldquo;See my pick.&rdquo;
        </p>
      </div>
    </form>

    <div
      id="rec-result"
      aria-live="polite"
      aria-atomic="true"
      style="margin-top:24px"
    ></div>
  `;

  mount.innerHTML = html;

  // Wire change events — update state + highlight selected label
  const form = mount.querySelector('#rec-form');
  form.addEventListener('change', e => {
    const input = e.target;
    if (input.type !== 'radio') return;
    if (!window.__quizStarted) {
      window.__quizStarted = true;
      if (!window.__cutcoNoTrack) { try { navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([JSON.stringify({ t: 'ev', l: 'find_quiz_start' })], { type: 'application/json' })); } catch (e) {} }
    }
    const { name, value } = input;
    const q = QUESTIONS.find(q => q.key === name);
    // Convert to boolean for boolKey questions, otherwise keep string
    answers[name] = q && q.boolKey ? value === 'true' : value;
    refreshLabelStyles(form, name, value);
    updateProgress();
    // Auto-show result as soon as all questions are answered
    if (allAnswered()) showResult();
  });

  // Start-over control in the quiz header
  const resetBtn = mount.querySelector('#rec-reset-top');
  if (resetBtn) resetBtn.addEventListener('click', resetQuiz);

  // Submit also triggers result (handles keyboard Enter on focused radio)
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (allAnswered()) {
      showResult();
    } else {
      // Focus the first unanswered fieldset's first radio so the user knows what's missing
      const unanswered = QUESTIONS.find(q => answers[q.key] === null);
      if (unanswered) {
        const first = form.querySelector(`input[name="${unanswered.key}"]`);
        if (first) {
          first.closest('fieldset').focus({ preventScroll: false });
          first.focus();
        }
      }
    }
  });
}

/** Update label border/background for a question group after a selection. */
function refreshLabelStyles(form, name, selectedValue) {
  form.querySelectorAll(`input[name="${name}"]`).forEach(input => {
    const label = input.closest('label');
    if (!label) return;
    if (input.value === selectedValue) {
      label.style.borderColor = 'var(--cyan)';
      label.style.background  = 'rgba(34,211,238,.08)';
    } else {
      label.style.borderColor = 'var(--line)';
      label.style.background  = 'transparent';
    }
  });
}

/** Update the progress bar + "X of N" after each selection. */
function updateProgress() {
  if (!mount) return;
  const count = Object.values(answers).filter(v => v !== null).length;
  const fill = mount.querySelector('#rec-progress-fill');
  const txt  = mount.querySelector('#rec-progress-txt');
  const bar  = mount.querySelector('.rec-progress');
  if (fill) fill.style.width = (count / TOTAL_QS * 100).toFixed(0) + '%';
  if (txt)  txt.textContent = count + ' of ' + TOTAL_QS;
  if (bar)  bar.setAttribute('aria-valuenow', String(count));
}

/**
 * Reset the finder: clear answers + Kitchen Fit state + celebration guards,
 * re-render the fresh quiz, and focus the first question. Never touches My List.
 */
function resetQuiz() {
  answers = { cook: null, household: null, purpose: null, budget: null, owns: null, problem: null };
  try { localStorage.removeItem('cutcoFit'); } catch (e) {}
  window.__quizStarted = false;
  window.__perfectSeen = false;
  hasCelebrated = false;
  trackEvent('find_quiz_reset');
  renderQuiz();                      // rebuilds the form + clears the visible result
  if (mount) {
    mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const first = mount.querySelector('#rec-form input[type="radio"]');
    if (first) first.focus({ preventScroll: true });
  }
}

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------
// One-sentence diagnosis keyed off the result lane (from recommender.js).
const DIAGNOSIS = {
  simple:     'Simple meals, no clutter — you want one knife that just works.',
  starter:    'A smart, no-overbuy starting point you can build on over time.',
  everyday:   'You cook often — you want daily-driver knives that keep up.',
  full:       'You’re outfitting a real kitchen and want it done right.',
  college:    'A compact, guaranteed-for-life setup for a smaller kitchen.',
  freshstart: 'A clean, capable starting point for a new place.',
  gift:       'A genuinely useful gift that feels premium and lasts.',
  owner:      'You already own Cutco — let’s fill the gap, not repeat it.',
};

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (e) { return false; }
}

/** Fire a lightweight analytics view-event (not a click) exactly like completion. */
function trackEvent(label) {
  if (typeof window !== 'undefined' && window.__cutcoNoTrack) return; // Owner No-Track Mode
  try {
    const b = JSON.stringify({ t: 'ev', l: label });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([b], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b, keepalive: true }).catch(() => {});
  } catch (e) {}
}

let hasCelebrated = false;
/**
 * Tasteful, one-shot celebration when the result first appears.
 * Full motion: a short burst of small gold/cyan/rainbow particles over the
 * result header (pointer-events:none, auto-removed). Reduced motion: a single
 * subtle glow pulse on the card instead — no particles, nothing to clean up.
 */
function celebrate(card) {
  if (hasCelebrated || !card) return;
  hasCelebrated = true;

  if (prefersReducedMotion()) {
    card.classList.add('rec-celebrate-glow');
    setTimeout(() => card.classList.remove('rec-celebrate-glow'), 1600);
    return;
  }

  const layer = document.createElement('div');
  layer.className = 'rec-confetti';
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['#ecc885', '#22d3ee', '#a855f7', '#ec4899', '#34d399'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('i');
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--x', (Math.random() * 100).toFixed(2) + '%');
    p.style.setProperty('--dx', ((Math.random() * 2 - 1) * 46).toFixed(0) + 'px');
    p.style.setProperty('--delay', (Math.random() * 180).toFixed(0) + 'ms');
    p.style.setProperty('--rot', (Math.random() * 360).toFixed(0) + 'deg');
    if (i % 3 === 0) p.style.borderRadius = '50%';
    layer.appendChild(p);
  }
  card.appendChild(layer);
  setTimeout(() => layer.remove(), 1500);
}

// ---------------------------------------------------------------------------
// Result display
// ---------------------------------------------------------------------------
function showResult() {
  const resultEl = mount && mount.querySelector('#rec-result');
  if (!resultEl) return;

  const a = {
    cook:      answers.cook,
    household: answers.household,
    purpose:   answers.purpose,
    budget:    answers.budget,
    // owns may already be boolean (from chip) or 'true'/'false' string (from radio)
    owns:      answers.owns === true || answers.owns === 'true',
    problem:   answers.problem || 'none',
  };
  const result = recommend(a);
  const top = result.ranked[0];
  const support = result.ranked.slice(1);

  // Snapshot prices + add-to-list come from the explorer (window.CutcoData) when present.
  const data = (typeof window !== 'undefined') ? window.CutcoData : null;
  const priceOf = (n) => (data && data.price) ? data.price(n) : '';
  const priceBlock = (name) => window.PriceStatus
    ? window.PriceStatus.priceBlock(name, priceOf(name))
    : (priceOf(name) ? `<div class="pprice">${esc(priceOf(name))}</div><div class="psnap">June 2026 snapshot — confirm current price</div>` : '<div class="pask">Ask Luke to confirm price</div>');

  const badgeStar = result.badge.strong ? '★ ' : '';
  const diagnosis = DIAGNOSIS[result.lane] || 'Here’s the setup that best fits your answers.';

  const supportHtml = support.map((p, i) => `
      <li class="ranked-pick-card">
        <span class="rec-rank" aria-hidden="true">${i + 2}</span>
        <img class="rec-pic" src="/assets/products/${p.sku}.jpg" alt="${esc(p.name)}"
             loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">
        <div class="rec-info">
          <div class="rec-name">${esc(p.name)}</div>
          ${priceBlock(p.name)}
          <p class="rec-why">${esc(p.why)}</p>
          <button type="button" class="rec-add" data-add="${esc(p.name)}" data-ev="quiz_add_product_to_list">+ Add</button>
        </div>
      </li>`).join('');

  const smsSend = encodeURIComponent(
    `Hi Luke! My Cutco Finder result: "${result.label}". Top picks: ` +
    result.ranked.map((p, i) => `${i + 1}) ${p.name}`).join(', ') + `. Can we go over these?`
  );
  const smsBook = encodeURIComponent(
    `Hey Luke, I got "${result.label}". My top picks were ` +
    result.ranked.map((p, i) => `${i + 1}) ${p.name}`).join(', ') + `. Can we book a demo around this?`
  );
  const smsAsk = encodeURIComponent(`Hi Luke! Quick question about the ${top.name} — can you tell me more and confirm the current price?`);

  resultEl.innerHTML = `
    <div class="rec-result-card">
      <div class="rec-head">
        <div class="rec-fit-eyebrow eyebrow-premium">Your Kitchen Fit</div>
        <h3 class="rec-fit-label animated-gradient-text">${esc(result.label)}</h3>
        <p class="rec-fit-diagnosis">${esc(diagnosis)}</p>
        <p class="rec-based">Based on your answers</p>
      </div>

      <div class="ranked-pick-card is-top-pick">
        <div class="rpc-badge${result.badge.strong ? ' is-strong' : ''}">${badgeStar}${esc(result.badge.label)}</div>
        <div class="rpc-top">
          <img class="rpc-photo" src="/assets/products/${top.sku}.jpg" alt="${esc(top.name)}"
               loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">
          <div class="rpc-headline">
            <div class="rpc-kicker">Your #1 pick</div>
            <div class="rpc-name">${esc(top.name)}</div>
            ${priceBlock(top.name)}
          </div>
        </div>
        ${result.uses ? `<p class="rpc-uses"><span>Main uses:</span> ${esc(result.uses)}</p>` : ''}
        <p class="rpc-why"><strong>Why this fits:</strong> ${esc(result.detail)}</p>
        <div class="rec-straight" style="border-top:1px dashed var(--line);margin-top:12px;padding-top:12px">
          <p class="rpc-uses" style="margin:0 0 6px"><span>Why not bigger:</span> ${esc(result.whyNotBigger || '')}</p>
          <p class="rpc-uses" style="margin:0 0 6px"><span>Why not smaller:</span> ${esc(result.whyNotSmaller || '')}</p>
          <p class="rpc-uses" style="margin:0"><span>Who should skip this:</span> ${esc(result.skipIf || '')}</p>
        </div>
        <div class="rpc-actions">
          <button type="button" class="rec-add rpc-add" data-add="${esc(top.name)}" data-ev="quiz_add_product_to_list">+ Add to My List</button>
          <a class="rec-ask" href="sms:+13126594280?&body=${smsAsk}" data-ev="price_check_text_luke">Ask Luke about this</a>
        </div>
      </div>

      ${support.length ? `<p class="rec-support-label">Great pairings for this setup</p><ol class="rec-picks">${supportHtml}</ol>` : ''}

      <p style="text-align:center;color:var(--ink);font-weight:600;margin:var(--space-4) 0 0">${esc(result.nextStep || '')}</p>
      <div class="rec-actions premium-cta-row">
        <a class="btn btn-primary" href="sms:+13126594280?&body=${smsSend}" data-ev="find_quiz_send_to_luke">Send This to Luke</a>
        <a class="btn btn-grad" href="sms:+13126594280?&body=${smsBook}" data-ev="book_with_result_click">Book With This Result</a>
        <a class="btn btn-ghost" href="#expGrid" data-ev="keep_browsing_products">Keep Browsing Products</a>
        <button type="button" class="btn btn-ghost rec-result-reset">Start Over</button>
      </div>
      <p class="rec-note">Prices are a June 2026 snapshot set by Cutco &mdash; confirm current pricing on cutco.com. Not quite right? Change any answer above.</p>
    </div>
  `;

  // Save the Kitchen Fit result so the My List SMS can include it; track completion.
  try {
    const compact = ['cook:' + a.cook, 'household:' + a.household, 'purpose:' + a.purpose, 'budget:' + a.budget, 'owns:' + a.owns, 'problem:' + a.problem].join(', ');
    localStorage.setItem('cutcoFit', JSON.stringify({ label: result.label, answers: compact }));
  } catch (e) {}
  trackEvent('find_quiz_complete');
  if (result.badge.strong && !window.__perfectSeen) {
    window.__perfectSeen = true;
    trackEvent('perfect_match_seen');
  }

  resultEl.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-add');
      let ok = false;
      if (data && data.add) { ok = data.add(name); }
      btn.textContent = ok ? '✓ Added to list' : (data && data.add ? '✓ Already on your list' : '✓ Noted for Luke');
      btn.disabled = true;
      btn.classList.add('added');
    });
  });

  const rstBtn = resultEl.querySelector('.rec-result-reset');
  if (rstBtn) rstBtn.addEventListener('click', resetQuiz);

  // Celebrate once, then bring the result into view.
  celebrate(resultEl.querySelector('.rec-result-card'));
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------------------------------------------------------------------------
// Intent chip wiring
// ---------------------------------------------------------------------------
function applyIntent(intent) {
  const preset = INTENT_MAP[intent];
  if (!preset) return;

  Object.assign(answers, preset);

  // Re-render quiz with pre-selections applied
  renderQuiz();

  // Scroll to the recommender mount
  if (mount) mount.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // If every question is answered from the preset alone, show result immediately
  if (allAnswered()) showResult();
}

function wireChips() {
  document.querySelectorAll('[data-intent]').forEach(chip => {
    chip.addEventListener('click', e => {
      e.preventDefault(); // prevent hash-scroll; we handle scroll manually
      applyIntent(chip.dataset.intent);
    });
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function init() {
  mount = document.getElementById('recommender');
  if (!mount) return;

  // Progressive enhancement: replace static fallback with interactive quiz
  renderQuiz();
  wireChips();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
