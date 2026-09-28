# TripLink v2 — Build plan (prototype → production)

**Target:** the clickable prototype "TripLink App Prototype" (artifact v4, Wishlink for travel), screen for screen.
**Stack:** Next.js on **Vercel** (frontend + API routes + cron) · **Supabase** (Postgres + RLS, Auth, Storage, pg_cron).
**Spec:** ARCHITECTURE.md §20 wins over older sections. Rules: AGENTS.md.
**Rhythm:** one phase at a time → file list agreed → build → tests → deploy to a Vercel preview → you click through it against the prototype → merge.

---

## Environments

| | Frontend (Vercel) | Backend (Supabase) | Notes |
|---|---|---|---|
| Local | `pnpm dev` | dev project `tiwuxlufvkrmivxqjrur` | Dev login + Instagram simulation allowed |
| Preview (every PR) | Vercel Preview, region `bom1` | same dev project | Dev login allowed so you can test; real users never see previews |
| Production | Vercel Production, `triplink.in` | **new** prod project (ap-south-1, Pro plan, PITR) | Created in Phase 9; dev flags hard-off |

Secrets live only in Vercel env vars (Preview vs Production separated) and `.env.local`. Migrations go to dev via `supabase db push`; to prod only from CI after merge.

---

## Status

| Phase | What | State |
|---|---|---|
| — | M0–M3 foundations: auth, RLS, operator trip CMS, public trip pages | ✅ done |
| — | Prototype design system, shells, creator join flow, catalog, Get link, links, earnings, operator shell | ✅ done (commit `cfc4aec`) |
| 0 | Deploy pipeline (Vercel team td-web1, previews behind Vercel login) | ✅ done |
| 1 | Link tracking: /r redirect, signed cookie, trip landing + storefront restyle | ✅ done |
| 2 | Instagram reels, storefront editor, waitlist cron + admin override | ✅ done |
| 3 | Operator affiliate settings, content kit, catalog filters | ✅ done |
| 4 | Leads: enquiry + OTP (dev-simulated), Leads inbox, Mark booked, lead fees | ✅ done (real OTP sender pending) |
| **5** | Operator performance | ⏭ next |
| 6–8 | below | planned |

---

## Phase 0 — Deploy pipeline (Vercel + Supabase)
**Goal:** every push gives a working preview URL on the dev database.
- Import `traveldevilsinfo-web/Travellink` into Vercel (team: yours), framework Next.js, region `bom1`, Node 22.
- Vercel env (Preview): Supabase URL/anon/service keys (dev), `PII_ENCRYPTION_KEY`, `NEXT_PUBLIC_SITE_URL` (preview domain), `ALLOW_DEV_LOGIN=true`, `ALLOW_IG_SIMULATION=true`, `DEV_LOGIN_PASSWORD`.
- Supabase Auth URL config: add `https://*-travellink*.vercel.app/**` redirect pattern.
- CI (GitHub Actions) green on the PR; fix `supabase start` in CI or switch RLS tests to the linked-project runner.
- Make the GitHub repo **private**; merge PR #1 into `main`.
**Done when:** PR preview URL opens the home page; dev-login → creator dashboard works on the preview.

## Phase 1 — Link tracking (finishes M4 core)
Prototype screens: *Follower: trip page from a reel*, *Creator storefront (public)*.
- `/r/[code]` redirect: look up link → log click (bot filter, hashed IP, `click_id`) → set `tl_vid` + HMAC-signed `tl_ref` (90 days) → 302 to the trip page (or storefront).
- Trip page restyled to the prototype: "Recommended by @creator" ribbon from the cookie, gallery, dates with live seats, itinerary, refund table, operator card, booking-mode CTA area (buttons wired in Phases 4/6).
- Public storefront `/@handle` restyled: header, tabs (Trips · Collections · Reels), chips, trip grid.
- Stats: pg_cron `refresh_creator_stats` fills `creator_daily_stats`; creator Home/Links show real clicks.
**Done when:** open a creator link in a fresh browser → lands on the trip with the ribbon → click appears on My links within 15 min; tampered cookie ignored.

## Phase 2 — Instagram content + storefront editor
Prototype screens: *Get my link (reel picker)*, *Home: reels ranked*, *My links (reel views)*, *My storefront*.
- Migration: `creator_links` gets `ig_media_id`, `ig_permalink`, `ig_thumbnail_url`; `storefront_items` (creator, trip, position) + `storefront_collections`.
- Fetch recent reels (Instagram API) for the picker; daily Vercel Cron: refresh followers, reel views, long-lived token; snapshot row per day; waitlist auto-promotion when ≥1,000.
- Storefront editor: add/remove/reorder trips, collections.
- Admin: waitlist queue with override (audited reason).
**Done when:** a link shows its reel thumbnail and views; waitlisted creator crossing 1,000 is promoted by the cron.

## Phase 3 — Operator affiliate settings + creator catalog extras
Prototype screens: *Trips & commission*, *Trip settings*, *Creator trip detail (content kit)*, *Find trips filters*.
- Trip settings page: commission slider (≥ floor) with "creators earn ₹X", lead-fee toggle + amount + monthly cap, booking mode (TripLink / operator site + redirect URL / enquiry).
- Content kit: operator-provided hooks + downloadable trip photos on the creator trip page.
- Catalog filters: highest earning, pays per lead, near me, booking mode, search.
**Done when:** operator changes commission → creator catalog shows the new rate immediately; redirect mode requires an https URL.

## Phase 4 — Leads (M5a)
Prototype screens: *Enquire form + confirmation*, *Operator: Leads inbox + Mark booked*, *Creator earnings: lead rows*.
- Enquire modal on the trip page: name, WhatsApp number with OTP, travelers, date → lead with attribution (cookie/link), lead fee snapshot, dedupe 30 days.
- Migration: `conversions` table; `commissions` generalised (`kind` booking | lead, `source`, nullable booking_id with one-of check); RLS + pgTAP.
- Operator Leads inbox: filters, WhatsApp link, statuses, **Mark booked** (ref, travelers, amount → conversion → pending commission).
- Lead fee lifecycle: pending → confirmed after 7-day check (cron).
**Done when:** enquiry from a creator link shows under that creator for the operator and as a pending lead fee for the creator; Mark booked creates a pending booking commission.

## Phase 5 — Operator performance (M5b)
Prototype screens: *Performance*, *Creator detail*, *Find creators*, *Invite / custom commission*.
- `org_daily_stats` rollup (trip × creator × link) + security-definer read functions for operators (no raw clicks exposed).
- Performance: KPIs, clicks-per-day chart, funnel, creators table, by-trip table, date range.
- Creator detail: IG stats, their reels/links for your trips, custom commission (`commission_overrides`).
- Find creators: verified creators with niche/city/followers filters; invite to a trip (`collab_invites` table + creator notification).
**Done when:** numbers on Performance match creator-side totals for the same period.

## Phase 6 — Redirect bookings, integrations, billing (M6)
Prototype screens: *Redirect interstitial*, *Integrations*, *Billing*, *Leads dispute banner*.
- Redirect page with `?tl_click=` + UTM to the operator URL.
- Postback API `POST /api/v1/conversions` (hashed org API keys, idempotent on booking_ref), JS pixel, key rotation, test button, recent conversions list.
- Traveler check-in (WhatsApp template; needs BSP) → disputes queue.
- Monthly operator invoice (commission + 18% GST), security deposit, invoice PDF, payment status; creator commissions from conversions payable only after invoice paid.
**Done when:** postback with valid click_id → pending commission; bad key → 401; replay → no duplicate; invoice totals match conversions.

## Phase 7 — Creator payouts (M7)
PAN (encrypted) + UPI/bank via RazorpayX, payout run with maker-checker, TDS by FY, statements, 48 h cool-off on payout-method change.

## Phase 8 — Checkout on TripLink (M8)
Razorpay checkout for `platform` trips, webhook confirmation, Route transfers, refunds.

## Phase 9 — Launch
Production Supabase project + migrations from CI, `triplink.in` on Vercel, Meta App Review approved (real Instagram), dev flags off, security checklist (ARCHITECTURE §18), legal pages, monitoring.

---

## Things only you can do (start now — they gate later phases)
1. **Make the GitHub repo private** (Settings → General → Danger zone). Needed before Phase 0.
2. **Meta developer app** → Instagram API with Instagram login → business verification → App Review (4–6 weeks). Gates real Instagram in production.
3. **WhatsApp Business (BSP)** account — gates Phase 6 traveler check-ins.
4. **Razorpay** Route + RazorpayX activation — gates Phases 7–8.
5. **CA** — commission invoice GST, TDS (Phases 6–7).
