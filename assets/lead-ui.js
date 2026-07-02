/* assets/lead-ui.js
 * Handles the lead/reminder form on /book AND the referral form on /reviews.
 * ES module — uses feature detection to only wire forms present on the current page.
 *
 * SECURITY: This module does NOT render user input into the DOM.
 *           All user-supplied values travel as JSON to the server only.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function showStatus(region, message, type) {
  if (!region) return;
  if (type === 'clear' || !message) {
    region.textContent = '';
    region.className = 'lead-status';
    return;
  }
  region.textContent = message;
  region.className = 'lead-status lead-status--' + type;
}

async function postLead(payload) {
  const res = await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function errMsg(error) {
  return error === 'spam'  ? 'Submission blocked — please leave the website field blank.'
       : error === 'name'  ? 'Name must be 1–40 characters.'
       : error === 'email' ? 'Please enter a valid email address.'
       : error === 'phone' ? 'Please enter a valid phone number (at least 7 digits).'
                           : 'Something went wrong — please try again.';
}

// ---------------------------------------------------------------------------
// Book page: #lead-form
// ---------------------------------------------------------------------------

function wireLeadForm() {
  const form = document.getElementById('lead-form');
  if (!form) return;

  // Use status region already in HTML (or create one if missing)
  let statusRegion = document.getElementById('lead-form-status');
  if (!statusRegion) {
    statusRegion = document.createElement('div');
    statusRegion.id = 'lead-form-status';
    statusRegion.className = 'lead-status';
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('aria-atomic', 'true');
    statusRegion.setAttribute('role', 'status');
    form.after(statusRegion);
  }

  const submitBtn = form.querySelector('[type="submit"]');

  // Dynamic input type/inputmode/autocomplete keyed to contactType radio
  const contactInput = form.querySelector('#lead-contact');
  const contactRadios = form.querySelectorAll('input[name="contactType"]');

  function syncContactType() {
    const checked = form.querySelector('input[name="contactType"]:checked');
    if (!contactInput || !checked) return;
    if (checked.value === 'phone') {
      contactInput.type = 'tel';
      contactInput.inputMode = 'tel';
      contactInput.autocomplete = 'tel';
    } else {
      contactInput.type = 'email';
      contactInput.inputMode = 'email';
      contactInput.autocomplete = 'email';
    }
  }

  contactRadios.forEach(r => r.addEventListener('change', syncContactType));
  syncContactType(); // run on init to match default checked radio

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const name        = (form.querySelector('#lead-name')?.value    || '').trim();
    const contact     = (form.querySelector('#lead-contact')?.value || '').trim();
    const contactType = form.querySelector('input[name="contactType"]:checked')?.value || 'email';
    const when        = (form.querySelector('#lead-when')?.value    || '').trim();
    const note        = (form.querySelector('#lead-note')?.value    || '').trim();
    const website     = form.querySelector('input[name="website"]')?.value || '';

    if (!name || !contact) {
      showStatus(statusRegion, 'Please fill in your name and how to reach you.', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    showStatus(statusRegion, '', 'clear');

    let result;
    try {
      result = await postLead({ name, contact, contactType, when, note, website });
    } catch {
      showStatus(statusRegion, 'Network hiccup — please try again in a moment.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    if (submitBtn) submitBtn.disabled = false;

    if (result.ok) {
      showConfirmation(form, name);
    } else {
      showStatus(statusRegion, errMsg(result.error), 'error');
    }
  });
}

/**
 * Post-submit confirmation: replaces the lead form with a useful next-step
 * panel (photo, what happens next, text-me-now) instead of a dead-end line.
 * Only the visitor's first name is echoed back — via textContent, never HTML.
 */
function showConfirmation(form, name) {
  const first = (name || '').trim().split(/\s+/)[0];
  const panel = document.createElement('div');
  panel.style.cssText = 'text-align:center';
  panel.innerHTML =
    '<img src="/luke-headshot.jpg" alt="Luke Hansen" width="88" height="88" loading="lazy" ' +
    'style="border-radius:50%;object-fit:cover;border:2px solid var(--gold);margin-bottom:14px" ' +
    'onerror="this.remove()">' +
    '<h3 style="margin:0 0 10px">Got it<span data-lead-first></span> — you\'re on my list.</h3>' +
    '<ol style="text-align:left;max-width:380px;margin:0 auto 18px;color:var(--mut);line-height:1.7;padding-left:1.2em">' +
    '<li>I\'ll reach out the way you asked — usually the same day.</li>' +
    '<li>We find a time that fits (in person or video).</li>' +
    '<li>You see the pieces and decide what fits. That\'s it.</li>' +
    '</ol>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">' +
    '<a class="btn btn-primary" style="padding:12px 22px" href="sms:+13126594280?&body=' +
    encodeURIComponent('Hi Luke! Just sent my info through the site — figured I\'d text you directly too.') +
    '" data-ev="text_luke_click">Text me now instead</a>' +
    '<a class="btn btn-ghost" style="padding:12px 22px" href="#book-now">Or grab a slot yourself</a>' +
    '</div>';
  const nameSlot = panel.querySelector('[data-lead-first]');
  if (nameSlot && first) nameSlot.textContent = ', ' + first;
  form.replaceWith(panel);
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');
}

// ---------------------------------------------------------------------------
// Reviews page: #referral-form → /api/lead
//
// Mapping: the *referee* (person being referred) is the lead stored in the
// pipeline (name = ref_name, contact = ref_contact). The *referrer* (person
// filling out the form) is captured in the note so Luke knows the source.
// Note is prefixed "REFERRAL:" per the task spec.
// ---------------------------------------------------------------------------

function wireReferralForm() {
  const form = document.getElementById('referral-form');
  if (!form) return;

  let statusRegion = document.getElementById('referral-lead-status');
  if (!statusRegion) {
    statusRegion = document.createElement('div');
    statusRegion.id = 'referral-lead-status';
    statusRegion.className = 'lead-status';
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('aria-atomic', 'true');
    statusRegion.setAttribute('role', 'status');
    form.after(statusRegion);
  }

  const submitBtn = form.querySelector('[type="submit"]');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // referee = person being referred (the actual lead to follow up with)
    const refName    = (form.querySelector('[name="ref_name[]"]')?.value    || '').trim();
    const refContact = (form.querySelector('[name="ref_contact[]"]')?.value || '').trim();
    // referrer = person submitting the form
    const refBy      = (form.querySelector('#ref-by')?.value   || '').trim();
    const refNote    = (form.querySelector('#ref-note')?.value || '').trim();
    const website    = form.querySelector('input[name="website"]')?.value || '';

    if (!refName || !refContact || !refBy) {
      showStatus(statusRegion, 'Please fill in all required fields.', 'error');
      return;
    }

    // Auto-detect contactType from referee's contact field
    const contactType = refContact.includes('@') ? 'email' : 'phone';

    // Compose REFERRAL: note — referrer name + optional message (max 300 chars)
    const noteText = ('REFERRAL: referred by ' + refBy + (refNote ? '. ' + refNote : '')).slice(0, 300);

    if (submitBtn) submitBtn.disabled = true;
    showStatus(statusRegion, '', 'clear');

    let result;
    try {
      result = await postLead({
        name: refName,
        contact: refContact,
        contactType,
        when: '',
        note: noteText,
        website,
      });
    } catch {
      showStatus(statusRegion, 'Network hiccup — please try again in a moment.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    if (submitBtn) submitBtn.disabled = false;

    if (result.ok) {
      showStatus(statusRegion, "Thanks for the intro! Luke will follow up with them soon.", 'success');
      form.reset();
    } else {
      showStatus(statusRegion, errMsg(result.error), 'error');
    }
  });
}

// ---------------------------------------------------------------------------
// Boot — only wire forms that exist on the current page
// ---------------------------------------------------------------------------

function init() {
  wireLeadForm();
  wireReferralForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
