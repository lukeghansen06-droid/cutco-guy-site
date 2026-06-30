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
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
/** @type {Record<string, string|boolean|null>} */
let answers = { cook: null, household: null, purpose: null, budget: null, owns: null };

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

  let html = `
    <form id="rec-form" novalidate aria-label="Product recommender quiz"
          style="max-width:600px;margin:0 auto">
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
          Answer all five questions above, then hit &ldquo;See my pick.&rdquo;
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
    const { name, value } = input;
    const q = QUESTIONS.find(q => q.key === name);
    // Convert to boolean for boolKey questions, otherwise keep string
    answers[name] = q && q.boolKey ? value === 'true' : value;
    refreshLabelStyles(form, name, value);
    // Auto-show result as soon as all questions are answered
    if (allAnswered()) showResult();
  });

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
  };
  const result = recommend(a);

  resultEl.innerHTML = `
    <div class="card" style="
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
      padding: clamp(24px,4vw,36px);
      border: 1.5px solid var(--cyan);
      background: rgba(34,211,238,.04);
    ">
      <div style="
        color: var(--cyan);
        font-size: var(--fs-sm);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin-bottom: 8px;
      ">My pick for you</div>

      <h3 style="margin: 0 0 10px; color: var(--ink)">${esc(result.title)}</h3>

      <p style="color:var(--mut);line-height:1.65;margin:0 0 20px;max-width:none">
        ${esc(result.why)}
      </p>

      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
        <a class="btn btn-primary" style="padding:13px 26px" href="/book">
          Book a demo &rarr;
        </a>
        <a class="btn btn-ghost" style="padding:12px 22px"
           href="https://www.cutco.com/products/"
           target="_blank" rel="noopener">
          Browse pieces &rarr;
        </a>
      </div>

      <p style="color:var(--mut);font-size:var(--fs-sm);margin-top:14px;max-width:none">
        Not quite right? Change any answer above to update.
      </p>
    </div>
  `;

  // Scroll the result into view smoothly so the user notices it
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
