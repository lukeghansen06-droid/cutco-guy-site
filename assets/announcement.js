/*  announcement.js — one editable place for temporary, time-sensitive notes.
 *
 *  WHY THIS EXISTS: things like "I leave for Spain in a week" do not belong in
 *  biography copy — they go stale and then quietly make the site wrong. Edit the
 *  ANNOUNCEMENT object below and every page that has an announcement slot updates.
 *
 *  TO UPDATE .... change `message` (and `expiresOn`).
 *  TO HIDE ...... set `enabled: false`.
 *  TO REMOVE .... set `enabled: false`, or just let `expiresOn` pass — it
 *                 disappears on its own, no code change needed.
 *
 *  Renders into any element with `data-announcement`. If disabled or expired,
 *  nothing is inserted at all (no empty box, no layout shift).
 */

export const ANNOUNCEMENT = {
  enabled: true,

  // Short label shown before the message.
  label: 'Heads up',

  // Keep this plain and human. No exclamation marks needed.
  message:
    'I leave for Spain in one week, so my in-person window is short right now. ' +
    'Video demos keep running while I am away, and I answer texts.',

  // ISO date (YYYY-MM-DD). After this date the note stops rendering by itself.
  // Set to null for "show until I turn it off".
  expiresOn: '2026-08-09',

  // Optional inline action. Set to null for a message with no button.
  action: { label: 'Grab a video demo', href: '/book' },
};

function isActive(a, now = new Date()) {
  if (!a || !a.enabled) return false;
  if (!a.expiresOn) return true;
  const end = new Date(`${a.expiresOn}T23:59:59`);
  if (Number.isNaN(end.getTime())) return true; // malformed date → fail visible, not broken
  return now <= end;
}

function render(host, a) {
  const box = document.createElement('aside');
  box.className = 'announcement';
  box.setAttribute('role', 'note');

  const label = document.createElement('span');
  label.className = 'announcement__label';
  label.textContent = a.label;
  box.appendChild(label);

  const msg = document.createElement('p');
  msg.className = 'announcement__msg';
  msg.textContent = a.message; // textContent: never inject markup from config
  box.appendChild(msg);

  if (a.action && a.action.href && a.action.label) {
    const link = document.createElement('a');
    link.className = 'announcement__action';
    link.href = a.action.href;
    link.textContent = a.action.label;
    link.setAttribute('data-ev', 'announcement_action_click');
    box.appendChild(link);
  }

  host.appendChild(box);
}

export function mountAnnouncements(root = document) {
  if (!isActive(ANNOUNCEMENT)) return 0;
  const hosts = root.querySelectorAll('[data-announcement]');
  hosts.forEach((h) => render(h, ANNOUNCEMENT));
  return hosts.length;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountAnnouncements());
  } else {
    mountAnnouncements();
  }
}
