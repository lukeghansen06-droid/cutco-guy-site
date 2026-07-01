/* assets/price-status.js — single source of truth for how a price is shown.
 * Loaded (classic script) BEFORE explorer.js and recommender-ui.js on /find so
 * both use the SAME logic (no duplication). Exposes window.PriceStatus.
 *
 * Status model:
 *   "verified_snapshot" — has a hand-set June-2026 price (NOT live-verified).
 *   "needs_refresh"     — flagged stale (optional; none flagged today).
 *   "unavailable"       — no price on record.
 *
 * Rules baked in: never says "live"/"current"/"estimated"; never shows savings.
 */
(function () {
  var SNAP_LABEL = 'June 2026 snapshot — confirm current price';
  var NEEDS = new Set(); // product names manually flagged needs_refresh (none today)

  function statusOf(name, price) {
    if (name && NEEDS.has(name)) return 'needs_refresh';
    return (price == null || price === '') ? 'unavailable' : 'verified_snapshot';
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  // Reusable price block for a card (price + honest microcopy, or an "ask Luke" line).
  // Does NOT include the official link (callers render that once, their own way).
  function priceBlock(name, price) {
    var st = statusOf(name, price);
    if (st === 'verified_snapshot') {
      return '<div class="pprice">' + esc(price) + '</div><div class="psnap">' + SNAP_LABEL + '</div>';
    }
    if (st === 'needs_refresh') {
      return '<div class="pask">Price needs refresh</div><a class="pofficial" href="sms:+13126594280?&body=' +
        encodeURIComponent('Hi Luke! Can you confirm the current price for: ' + (name || '')) +
        '" data-ev="price_check_text_luke">Ask Luke to confirm &rarr;</a>';
    }
    return '<div class="pask">Ask Luke to confirm price</div>';
  }

  function officialLink(url, label) {
    if (!url) return '';
    return '<a class="pofficial" href="' + url + '" target="_blank" rel="noopener" data-ev="official_cutco_link_click">' + (label || 'View official Cutco page &rarr;') + '</a>';
  }

  window.PriceStatus = { SNAP_LABEL: SNAP_LABEL, statusOf: statusOf, priceBlock: priceBlock, officialLink: officialLink };
})();
