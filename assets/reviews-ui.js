/* assets/reviews-ui.js
 * Live reviews display + review-form submit for /reviews.
 * ES module, no framework. Progressive enhancement.
 *
 * SECURITY: All user-supplied content (name, text) is HTML-escaped via esc()
 * before insertion into the DOM. Star rating is built from the numeric value,
 * never from raw input. This prevents stored XSS.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape & < > " ' so user content is safe to inject into innerHTML.
 * Applied to EVERY dynamic value (name, text) before DOM insertion.
 */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build ★/☆ characters from a numeric rating — never from raw input.
 * Clamps to 1–5.
 */
function buildStars(rating) {
  const n = Math.max(1, Math.min(5, Math.round(Number(rating))));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/**
 * Return a short relative-time string from a Unix-ms timestamp.
 * e.g. "just now", "3h ago", "2d ago".
 */
function relativeTime(ts) {
  const diff   = Date.now() - Number(ts);
  const mins   = Math.floor(diff / 60_000);
  const hours  = Math.floor(diff / 3_600_000);
  const days   = Math.floor(diff / 86_400_000);
  const weeks  = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years  = Math.floor(days / 365);

  if (mins  <  2) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  if (weeks <  5) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/**
 * Build a review card HTML string.
 * SECURITY: name and text are escaped; stars are built from numeric rating.
 */
function buildCardHTML(review) {
  const stars   = buildStars(review.rating);
  const time    = relativeTime(review.ts);
  const numStar = Math.max(1, Math.min(5, Math.round(Number(review.rating))));

  return `
    <article class="review-card">
      <header class="review-card__header">
        <span class="review-card__name">${esc(review.name)}</span>
        <span class="review-card__stars" aria-label="${numStar} out of 5 stars">${stars}</span>
        <time class="review-card__time">${esc(time)}</time>
      </header>
      <p class="review-card__text">${esc(review.text)}</p>
    </article>
  `;
}

// ---------------------------------------------------------------------------
// Reviews display — load from API on page load
// ---------------------------------------------------------------------------

async function loadReviews() {
  const list = document.getElementById('reviews-list');
  if (!list) return;

  let data;
  try {
    const res = await fetch('/api/reviews');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch {
    // Non-alarming fallback — leave the empty-state, add a quiet note
    const note = document.createElement('p');
    note.style.cssText = 'text-align:center;color:var(--mut);font-size:.875rem;margin-top:1rem';
    note.textContent = 'Could not load reviews right now — check back soon.';
    list.appendChild(note);
    return;
  }

  if (!data || data.count === 0) {
    // Keep existing empty-state markup untouched
    return;
  }

  // API returns newest-first already; render them all
  // SECURITY: buildCardHTML escapes name+text
  list.innerHTML = `<div class="review-wall">${data.reviews.map(buildCardHTML).join('')}</div>`;
}

// ---------------------------------------------------------------------------
// Rating hover-fill (Task 2.5)
// JS fills all stars up to the hovered/focused one via the .star-lit class.
// Keyboard arrow-key navigation on radios still works.
// ---------------------------------------------------------------------------

function wireRatingHoverFill() {
  const group = document.querySelector('.rating-group');
  if (!group) return;

  const inputs = Array.from(group.querySelectorAll('input[type="radio"]'));
  const labels = inputs.map(inp => group.querySelector(`label[for="${inp.id}"]`));

  /** Add .star-lit to all labels from 0 up to (and including) index. */
  function fillUpTo(index) {
    labels.forEach((label, i) => {
      if (label) label.classList.toggle('star-lit', i <= index);
    });
  }

  /** Remove hover fill; restore only the currently-checked star's fill. */
  function restoreSelection() {
    const checked = inputs.findIndex(inp => inp.checked);
    labels.forEach((label, i) => {
      if (label) label.classList.toggle('star-lit', checked >= 0 && i <= checked);
    });
  }

  // Mouse hover on labels
  labels.forEach((label, idx) => {
    if (!label) return;
    label.addEventListener('mouseenter', () => fillUpTo(idx));
  });
  group.addEventListener('mouseleave', restoreSelection);

  // Keyboard: focus fills, change (arrow key) restores selection
  inputs.forEach((input, idx) => {
    input.addEventListener('focus',  () => fillUpTo(idx));
    input.addEventListener('change', restoreSelection);
  });

  // When focus leaves the entire group, restore
  group.addEventListener('focusout', e => {
    if (!group.contains(e.relatedTarget)) restoreSelection();
  });
}

// ---------------------------------------------------------------------------
// Status region helper
// ---------------------------------------------------------------------------

function showStatus(region, message, type) {
  if (!region) return;
  if (type === 'clear' || !message) {
    region.textContent = '';
    region.className = 'review-status';
    return;
  }
  region.textContent = message;
  region.className = `review-status review-status--${type}`;
}

// ---------------------------------------------------------------------------
// Prepend a new review card into #reviews-list
// ---------------------------------------------------------------------------

function prependReviewCard(review) {
  const list = document.getElementById('reviews-list');
  if (!list) return;

  // If empty-state is showing, replace with a wall container
  const emptyState = list.querySelector('.reviews-empty');
  if (emptyState) {
    list.innerHTML = '<div class="review-wall"></div>';
  }

  let wall = list.querySelector('.review-wall');
  if (!wall) {
    wall = document.createElement('div');
    wall.className = 'review-wall';
    list.prepend(wall);
  }

  // SECURITY: buildCardHTML escapes name+text
  const tmp = document.createElement('div');
  tmp.innerHTML = buildCardHTML(review);
  const article = tmp.querySelector('article');
  if (article) wall.prepend(article);
}

// ---------------------------------------------------------------------------
// Review form submit
// ---------------------------------------------------------------------------

function wireReviewForm() {
  const form = document.getElementById('review-form');
  if (!form) return;

  // Create aria-live status region after the form (for SR announcements)
  let statusRegion = document.getElementById('review-status');
  if (!statusRegion) {
    statusRegion = document.createElement('div');
    statusRegion.id = 'review-status';
    statusRegion.className = 'review-status';
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('aria-atomic', 'true');
    statusRegion.setAttribute('role', 'status');
    form.after(statusRegion);
  }

  const submitBtn = form.querySelector('[type="submit"]');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Read fields
    const name     = (form.querySelector('#review-name')?.value  || '').trim();
    const ratingEl = form.querySelector('input[name="rating"]:checked');
    const rating   = ratingEl ? Number(ratingEl.value) : 0;
    const text     = (form.querySelector('#review-text')?.value   || '').trim();
    const website  = form.querySelector('input[name="website"]')?.value || '';

    // Client-side validation
    if (!name || !rating || !text) {
      showStatus(statusRegion, 'Please fill in your name, choose a star rating, and write a review.', 'error');
      return;
    }

    // Disable submit during request
    if (submitBtn) submitBtn.disabled = true;
    showStatus(statusRegion, '', 'clear');

    let result;
    try {
      const res = await fetch('/api/reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // SECURITY: honeypot `website` is passed as-is (must be blank for real users)
        body: JSON.stringify({ name, rating, text, website, ts: Date.now() }),
      });
      result = await res.json();
    } catch {
      showStatus(statusRegion, 'Network hiccup — please try again in a moment.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    if (submitBtn) submitBtn.disabled = false;

    if (result.ok) {
      // Prepend the new card (escaping happens inside buildCardHTML)
      prependReviewCard(result.review);
      showStatus(
        statusRegion,
        'Thanks — your review is in! It goes live after a quick check.',
        'success'
      );
      form.reset();
      // Clear any lingering star-lit classes after form.reset()
      document.querySelectorAll('.rating-group label').forEach(l => l.classList.remove('star-lit'));
    } else {
      const msg =
        result.error === 'spam'
          ? 'Looks like a spam signal — please try again without the website field filled in.'
          : result.error === 'rate'
          ? "You've submitted recently — please wait a little before trying again."
          : result.error
          ? `Could not submit: ${result.error}. Please try again.`
          : 'Something went wrong — please try again.';
      showStatus(statusRegion, msg, 'error');
    }
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function init() {
  loadReviews();
  wireRatingHoverFill();
  wireReviewForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
