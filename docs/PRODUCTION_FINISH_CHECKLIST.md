# Production finish checklist

These steps require account access or real customer participation and are intentionally not automated by the repo.

## Reviews

- Send the copy-ready request from `/moderate` only to real demo participants or customers.
- Approve genuine submissions manually in `/moderate`.
- Verify `/reviews` renders the approved review and its Review/AggregateRating JSON-LD.

## Email alerts - DONE (2026-07-10)

- Resend account created (signed in via GitHub `lukeghansen06-droid`, no password to manage).
- `cutcowithluke.com` added and **verified** as a Resend sending domain. DNS records (DKIM TXT, SPF TXT, MX) were added directly in Vercel's DNS panel via Resend's Vercel auto-configure integration; no existing site A/CNAME records were touched.
- Sending-only API key created (`cutcowithluke-site-leads`), added as `RESEND_API_KEY` in Vercel Production and Preview, then the project was redeployed.
- Verified end-to-end: submitted a clearly labeled test lead (`TEST - please ignore`) through the live `/book` form. Resend logs confirmed `status: delivered` to `lukehansen01@gmail.com`, subject `New lead: TEST - please ignore (Aside email check)`. The test row was deleted from Supabase `leads` afterward; `leads` count is back to 0.
- To rotate the key or check delivery history: resend.com (sign in with GitHub) → API keys / Emails.

## GA4

- Create or select the GA4 web data stream.
- Add `GA4_MEASUREMENT_ID` (format `G-...`) to Vercel Production and Preview.
- Verify `lead_submitted` after a valid lead form submission.
- Verify `demo_booked` after Calendly reports `calendly.event_scheduled`.

## Booking

- Make a real test booking through `/book`.
- Confirm the on-page “You’re booked” state appears.
- Confirm Calendly sends its confirmation/reminder messages.
- Cancel the test event after verification.

## Cleanup requiring explicit approval

- Inspect Vercel environment variables and remove only confirmed-unused `KV_*` / `REDIS_URL` values.
- Verify Netlify project `regal-gnome-d05713` has no traffic, domains, forms, or required deploy history before deleting it.
- Do not delete either resource based only on its name.

## Missing asset

- Add 2–3 real, permission-cleared demo/customer photos before placing imagery beside reviews.
- The repo currently has Luke portraits, family photos, and product images, but no clearly verified demo/testimonial photos.

