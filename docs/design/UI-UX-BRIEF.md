# TripLink — UI/UX Design Brief (Phase 1, web)

> **Purpose:** everything a designer (or an AI design tool) needs to design every screen of TripLink end to end.
> **Source of truth for behaviour:** `ARCHITECTURE.md` (sections referenced as §n). This brief covers *how it looks and feels*; it never changes rules about money, attribution or privacy.
> **Reference product analysed:** [Wishlink](https://www.wishlink.com) — India's largest creator-commerce platform. §2 explains what to borrow and what not to.
> **Status:** M1–M3 are built with placeholder shadcn styling (see §12). The designs in this brief replace that styling.

---

## 1. The product in one paragraph

TripLink is a **creator-led travel marketplace for India**. Operators (e.g. Travel Devils) list group trips with fixed departures. Instagram/YouTube creators share **tracked links** and a **storefront** (`/@handle`). Travelers discover a trip from a reel, check dates, seats and the refund policy, then either **book and pay on TripLink** (deposit or full, via Razorpay) or **chat on WhatsApp** with our team. Creators earn commission on trips that actually happen; operators get paid in tranches. The platform keeps a fee.

**Four audiences, four surfaces**

| Surface | Who | Device reality | Primary job |
|---|---|---|---|
| Public site + checkout | Traveler | ~80% arrive in **Instagram's in-app browser** on a mid-range Android, on 4G | "Is this trip right for me, is it safe, and can I get a seat?" |
| Traveler account | Traveler | Mobile | Pay the balance, check status, cancel, get the invoice |
| Creator dashboard | Creator | Mobile-first (they live on their phone) | Get a link fast, see what's earning, trust the payout |
| Operator dashboard | Travel company staff | Desktop *and* mobile | List trips, manage departures, see bookings and money |
| Admin console | TripLink team | Desktop | Approve, resolve, pay out, audit |

---

## 2. Wishlink analysis

### 2.1 What Wishlink is
A creator-monetisation platform: creators tag products from 250+ brands (Myntra, Amazon, Nykaa…) in their reels and posts, share Wishlink links, and earn affiliate commission. Shoppers land on a Wishlink page, then **leave to the brand's site to buy**. Claims: 100,000+ creators, 250+ brands, 4.8★ Play Store.

### 2.2 Creator side (observed + reported)
| Area | What Wishlink does |
|---|---|
| Onboarding | "Sign up via OTP → link Instagram or YouTube → start earning". About 15 min: phone OTP, Instagram link, niche, bank details. Minimum ~500 followers. Verified within 24h. |
| Link creation | Tap **+** → paste a product URL (Myntra/Flipkart) → get a short link → share to bio/stories/DMs. "Share product links… in just one click." |
| Collections | Group products by theme; reported to perform ~2.5× better than single links. |
| Engage (auto-DM) | "Every 'Link Please' comment gets an instant, personalized DM with the product link." |
| Analytics | "A Dashin' Analytics Dashboard": earnings, top-performing content, insights. |
| Earnings/payouts | Monthly payout of commissions **confirmed by the brand that month** plus rewards and referrals. Brands confirm in 30–60 days; returns reduce commission. |
| Extras | Paid brand collaborations, product credits, community (15k+), in-app support. |
| Pain points in reviews | **Payment delays**, returns eating earnings, occasional glitches. The biggest complaint is *not knowing when money is coming*. |

### 2.3 Shopper side (observed on `wishlink.com/malvikasitlani`, mobile)
- **Sticky top banner:** "Get a smoother experience on 'Wishlink Shopping App' · 4.4★ · 3M+ Downloads · **Download**".
- **Profile header:** avatar with a coloured ring (story-style), name, Instagram handle with icon, **Follow** button + follower count, bio, stat tiles (**55 Products · 13 Followers**), share icon.
- **Search inside the store:** "Search in @handle's store".
- **Content tabs:** **Reels · Products · Collections · Posts · Video**, followed by a **Category** chip row (e.g. "Lipstick").
- **3-column grid** of reel thumbnails.
- **Bottom nav:** **Home · My Viral Reels · Wishlist**, plus a "Save @handle's Shop" action.
- **Reel page** (`/handle/reels/{id}`): top bar with creator avatar, "Powered by Wishlink", **Follow**, search. Under the reel: **"Tagged products (n)"** and a green **"Save All on WhatsApp"** button, then **"Shop My Looks"** with the same tabs.

### 2.4 Borrow (adapt to travel)
1. **The reel is the entry point.** People arrive from a specific reel, so land them on *that* trip with the reel's context ("As seen in @riya's reel"), not on a generic page. → our **tracked link landing** (§4 A1).
2. **Storefront = the creator's identity.** Story-ring avatar, IG handle, bio, tabs, search inside the store, category chips. → `/@handle` (§4 A5).
3. **Collections** ("Monsoon treks", "Under ₹10k", "Hosted by me") are the creator's main curation tool.
4. **"Save on WhatsApp"** is the right secondary action for Indian audiences. → our **"Send me details on WhatsApp"**, which also creates a lead (§6.8).
5. **One-tap link creation** from a catalogue, with a paste-a-URL shortcut.
6. **Earnings and analytics** that show which reel or link is earning.

### 2.5 Do NOT copy
| Wishlink pattern | Why not for TripLink |
|---|---|
| Sends the shopper **off-site** to buy | We are the marketplace: checkout, refunds and attribution happen on TripLink (§0). The CTA is **Book / Reserve**, not "Buy on brand". |
| **Download-the-app banner / interstitial** | Hurts conversion in the Instagram in-app browser; the spec says no popups (§13). Phase 1 is web only. |
| Vague payout timing ("confirmed by the brand in 30–60 days") | This is Wishlink's #1 complaint. **Show every commission's exact next date** (§6.5): "Confirms on 12 Nov · Payable after 21 Nov". |
| Follower counts as vanity ("13 Followers") | Travel trust comes from *verified operator, real reviews, refund policy, seats left*, not from follower counts. |
| Auto-DM on Instagram comments ("Link Please") | Instagram automation is out of scope in Phase 1 (§1). Our equivalent is the WhatsApp ref flow (§6.8). A possible Phase 2 idea. |
| Low-ticket impulse UX | Our trips cost ₹5k–₹50k with a long consideration cycle. The UX needs trust, dates, a deposit option and a human (WhatsApp). |

### 2.6 Where TripLink should be better
- **Trust by default:** verified-operator badge, GST seller details, refund table, "Pay on TripLink for refund protection", reviews only from completed trips.
- **Scarcity that is true:** live "Only 4 seats left", never fake timers (dark patterns are illegal under the 2026 E-Commerce amendment).
- **Money transparency for creators:** a per-booking timeline, TDS shown up front, and payout-day certainty (the 5th of every month).
- **Low-friction booking:** phone OTP *at checkout* (no separate signup), deposit option, Razorpay in the same tab.

---

## 3. Design principles
1. **Thumb-first, in-app-browser-safe.** 360–414px wide first. No popups or new tabs; the sticky CTA sits in the bottom 20% of the screen. First load under 200 KB JS.
2. **Money is never ambiguous.** Every price says per person and whether GST is included. Every creator rupee has a status and a next date.
3. **Trust before urgency.** Show operator verification, the refund policy and real seats before any "book now" pressure.
4. **One primary action per screen.** Secondary actions (WhatsApp, share, save) are visibly secondary.
5. **Every state is designed:** loading (skeletons), empty (explain + next action), error (what happened + retry), success, and locked (why + how to unlock).
6. **Speak Indian English, plainly.** ₹ with Indian digit grouping (₹1,00,000), dates like "28 Oct 2026", "3D/2N". Hindi-ready: no text baked into images, allow ~30% longer strings.
7. **Accessible:** WCAG AA contrast, 44×44px tap targets, visible focus, labels on every input, and no meaning carried by colour alone.

---

## 4. Screen inventory and flows

Legend: **[Built]** exists with placeholder UI · **[M#]** planned milestone · ★ design priority 1.

### A. Discovery (public, no login)

**A1 ★ Tracked-link landing = trip page with creator context** `[M4]`
Entry: `/r/{code}` redirects to `/trips/{slug}?utm…` and sets the creator cookie.
- Creator ribbon at the top: avatar + "Recommended by @riya" (links to the storefront). Dismissible, and it persists for the session.
- Otherwise identical to A2. The creator context must never hide the price or the operator.

**A2 ★ Trip page** `/trips/{slug}` `[Built — needs design]`
Sections in order:
1. **Gallery**: swipeable on mobile with a counter (1/8); 1 large + 4 grid on desktop. The first image loads with priority.
2. **Title block**: badges (3D/2N, difficulty, "Hosted by @creator"), title, destination · state · "from Delhi", one-line summary, rating if real reviews exist.
3. **Sticky price bar (mobile, bottom)**: "₹10,000 onwards · per person + GST", with **Check dates** as the primary button and a WhatsApp icon button as secondary.
4. **Highlights** (chips or icons).
5. **Dates & prices**: a list of departures, each showing date range, price options (Triple ₹10,000 · Double ₹12,000), deposit ("Reserve with ₹3,000"), and a live seat state (available / "Only 4 left" / Sold out / Booking closed). Tapping a departure starts checkout (C1).
6. **Itinerary**: an accordion by day, with meals icons and stay.
7. **Included / Not included**: two columns with tick and cross icons.
8. **Pickup points**: city, point, time, and any extra charge.
9. **Cancellation policy**: a simple table ("30+ days before → 90% refund") plus "Deposit is non-refundable".
10. **Operator card**: name, "Verified operator" badge, rating, and seller details (legal name, GSTIN, city) required by the E-Commerce Rules. **No phone or email** (they appear only after booking).
11. **Reviews**: "Verified traveler" label, star rating, operator reply. Empty state: "Reviews come only from travelers who completed this trip."
12. **More from @creator / similar trips** (carousel).

States: skeleton for the gallery and dates; "Checking seats…" shimmer; "No upcoming dates. Get notified on WhatsApp."

**A3 Home** `/` `[Built — needs design]`
Hero with a search bar (Where to? · Month · Duration · Budget), trust strip (Verified operators · Secure payments · Clear refunds), popular destinations (image chips), "Newly listed", "Creator-hosted trips", "Weekend getaways under ₹10k", "Trips by top creators" (avatars into storefronts), how it works (3 steps), and a footer with legal and grievance-officer links.

**A4 Search / browse** `/trips` `[Built — needs design]`
Mobile: a search field plus a **Filters** button that opens a bottom sheet with month, budget, duration and trip type. Show applied filters as removable chips and a result count. Sort by recommended / price / soonest date. Cards in a single column on mobile (4:3 image, title, destination, D/N, "from ₹X + GST", next date, seats hint). Empty state: "No trips match. Try another month" with a Clear filters button. Pagination or "Load more".

**A5 ★ Creator storefront** `/@handle` `[Built basic — needs design; curation M4]`
Adapted from Wishlink's shop:
- Header: cover image, avatar with ring, display name, @handle with IG and YT icons, home city, bio, and a **Share** icon. A "Trips hosted: 3 · Travelers: 120+" stat row appears only once it's meaningful.
- Tabs: **Trips · Collections · Hosted by me · Reels**. The Reels tab maps each reel to its trip, like Wishlink's "Tagged products".
- Chips: month and destination.
- Grid: trip cards (2-up on mobile).
- Secondary: "Chat on WhatsApp", which carries the creator ref.
- **No** app banner and **no** follower counter.

**A6 Destination page** `/destinations/{slug}` `[Built — needs design]`
Hero image, name, state, a best-months note, a trip list with filters, and FAQs (good for SEO).

**A7 Static pages** `[M11]`
How it works (travelers / creators / operators), About, Terms, Privacy, Refund policy, Grievance officer, Contact, and an ASCI disclosure guide for creators.

### B. Enquiry (WhatsApp) `[M10]`
- **B1** The "Chat on WhatsApp" button opens `wa.me/<platform number>` with prefilled text containing the trip and ref. Design only the button and its trust microcopy ("Reply in ~15 min, 10am–8pm").
- **B2** Payment-link landing `/checkout/new?lead=…`: the same as C1 but prefilled with a "Sent by TripLink team" note. Expired-link state.

### C. Checkout ★ `[M5]`
One page with collapsible steps on mobile, and a sticky summary on desktop.
1. **C1 Select:** departure (preselected if tapped), price option (radio cards), traveler count (stepper 1–20, capped by seats left), pickup point.
2. **C2 Sign in (inline):** phone number, then 6-digit OTP (auto-read, resend timer 30s). No separate signup page. "Use email instead" link.
3. **C3 Traveler details:** a card per traveler (name, age, gender, phone for the lead traveler), an emergency contact, and "Copy from my profile" for traveler 1.
4. **C4 Code:** a "Have a creator or coupon code?" field. If a creator link is active, show "Referred by @riya ✓" instead of an empty field. Show the discount line, plus the "lowest price in the last 30 days" note whenever a discount is shown (E-Commerce Rules 2026).
5. **C5 Pay:** a choice card between **Pay deposit ₹6,000 now** (balance ₹18,000 due by 13 Oct) and **Pay full ₹24,000**. A price breakdown shows subtotal, discount, GST (5% or 18%) and total. Checkboxes for T&C and the cancellation policy (the policy is linked and summarised). Primary button: "Pay ₹6,000 securely", with Razorpay, UPI, card and netbanking logos.
6. **C6 Seat hold timer:** "Seats held for 14:32", calm rather than alarming. On expiry: "Your hold expired. Seats are still available. Try again."
7. **C7 Processing:** after Razorpay returns, "Confirming your payment…". Poll for up to 60s; if slower, "We'll WhatsApp you as soon as it's confirmed" (the webhook is the source of truth).
8. **C8 Confirmation:** booking ref (TL8XQ2…), trip and dates, amount paid and balance due, "Invoice sent to WhatsApp and email", **operator contact revealed now**, "Add to calendar", "Share with friends", and next steps (packing list arrives 3 days before).

Error states: sold out while paying (refund auto-initiated, with a message), payment failed (retry or change method), amount mismatch (support contact).

### D. Traveler account `[M5–M11]`
- **D1** My bookings: upcoming and past tabs; cards with status chips (Confirmed · Balance due · Paid in full · Completed · Cancelled).
- **D2 ★** Booking detail: timeline (Booked → Balance due by … → Trip → Review), payment history, **Pay balance** button, travelers (editable until X days before), operator contact, pickup, invoice and credit-note downloads, **Cancel booking**.
- **D3 ★** Cancel flow: reason picker, then a **refund preview** ("You'll get ₹14,400 back to your original payment method in 5–7 working days", with a breakdown by policy band). Confirm with a destructive button. Success screen.
- **D4** Wishlist, D5 Write a review (only after completion: stars, text, photos), D6 Support tickets (list, thread, new ticket), D7 Profile (built), D8 Privacy: data export and delete request (DPDP).

### E. Auth `[Built — needs design]`
- **E1** Login: phone first (+91 prefix), OTP (6 boxes), Google, "Use email instead" for a magic link, bot check (Turnstile, invisible where possible).
- **E2** MFA: set up (QR code plus manual key, with instructions for Google Authenticator) and verify.
- Errors: wrong code, too many attempts ("Try again in 10 min"), expired link.

### F. Creator dashboard (mobile-first, bottom nav) `[M4, M8, M9]`
Bottom nav: **Home · Trips · Links · Earnings · Profile**. On desktop this becomes a sidebar.

- **F1 ★ Onboarding (≤ 3 min, can promote before KYC):**
  1. Phone OTP.
  2. Choose @handle (live availability check) + Instagram handle + niche chips.
  3. Accept the creator agreement, including the "#ad disclosure" duty, shown as a friendly checklist rather than a wall of text.
  4. "You're in review. Usually within 24h." While pending, show the catalogue read-only and a "Complete payout details" card for later.
- **F2 ★ Home:** this month's earnings hero ("₹12,400 confirmed · ₹8,000 pending"), next payout ("5 Nov · ₹9,850 after TDS"), top links this week, a "Get link" FAB, and nudges (finish KYC, add a trip to your storefront).
- **F3 ★ Trip catalogue:** cards show a commission badge ("Earn ~₹1,000 per traveler · 10%"), filters, "Hosting available" tag, and **Get link**.
- **F4 ★ Get link sheet (the Wishlink "+" moment):** short link with copy, QR code, a **caption template with "#ad" auto-added (ASCI)**, "Share to WhatsApp", "Share to Instagram story" (downloads a story image), and a label field ("Reel – 12 Oct Spiti vlog"). Also a "Paste a TripLink trip URL" input.
- **F5 Links manager:** list by label, with clicks, visitors, leads, bookings and earnings per link, plus sort and archive.
- **F6 Storefront editor:** reorder trips (drag or up/down buttons), create collections, edit bio and cover, live preview, and "Copy storefront link".
- **F7 ★ Earnings (the anti-Wishlink-pain screen):** buckets **Pending → Confirmed → Payable → Paid**, with the total in each. Each booking row shows trip, date, traveler count (**no traveler names**), commission, and **"Confirms on 12 Nov · Payable after 21 Nov"**. Reversed commissions show their reason. On-hold ones show "Under review", with a support link.
- **F8 Payouts:** history (amount, TDS, net, UTR, status), downloadable statements, a TDS summary per financial year, payout-method card (masked UPI or bank) with "Change" (triggers OTP; show the 48h cool-off banner afterwards), and a KYC status stepper (PAN → bank/UPI → verified).
- **F9 Analytics:** date range, a funnel (clicks → visitors → leads → bookings → GMV), a chart by day, and a table by link.
- **F10 Hosted trips (host tier):** trips they lead, and bookings on them (counts only).

### G. Operator dashboard (desktop-first, responsive) `[Built partly: onboarding, trips, departures]`
Sidebar: **Dashboard · Trips · Departures · Bookings · Settlements · Reviews · Team · Company & KYC**.
- **G1 ★ Onboarding** `[Built]`: a 3-step checklist (company and GST → KYC documents → agreement) with a status banner (Draft · Under review · Changes needed · Approved).
- **G2 Dashboard:** upcoming departures with fill %, bookings this week, and money due next (tranche dates).
- **G3 ★ Trips list and editor** `[Built]`: status badges, a readiness checklist before "Submit for review", and editor tabs (Details · Itinerary · Photos · Pickups · Commission). Needs design for:
  - the itinerary day builder (drag to reorder);
  - the photo grid (cover selector, upload progress);
  - a commission explainer ("Creators see this. Travelers never do").
- **G4 Departures** `[Built]`: calendar view plus list, capacity bar (booked/held/left), price-option editor, close bookings.
- **G5 Bookings:** a table filterable by departure; booking detail (travelers and contacts after confirmation, pickup, payments); manifest CSV export; mark no-show.
- **G6 Settlements** (MFA gate): transfers by tranche (Tranche 1: 50% on 21 Oct, *on hold*), status, and monthly commission invoices.
- **G7 Reviews:** reply inline. **G8 Team:** invite by phone or email, roles (owner, manager, staff).

### H. Admin console (desktop, dense, MFA always) `[Built: approvals]`
Sidebar: **Approvals · Bookings · Leads · Commissions · Payouts · Settlements · Coupons · Reviews · Support · Data requests · Settings · Audit**.
- **H1 ★ Approvals** `[Built]`: queue cards for operators (KYC documents open via 60s links), creators (IG profile link) and trips (full preview). Approve / Reject with a mandatory note.
- **H2 Leads inbox** `[M10]`: new → contacted → payment link sent → converted, with assign and "Create payment link".
- **H3 Bookings:** search by ref, phone or email; manual cancel or refund; change departure; overdue-balances queue.
- **H4 ★ Payout run (maker-checker):** generate → review table → **"Approve (you can't approve your own run)"** → execute → reconcile. The approver must be visibly different from the creator of the run.
- **H5 Commissions:** fraud holds with signals (self-referral match) → release or reverse, with a reason.
- **H6 Audit log:** read-only, filter by actor or entity.

---

## 5. Key end-to-end journeys to prototype (clickable)
1. **Reel → booking (the money path):** Instagram reel → `/r/abc` → trip page with creator ribbon → pick departure → OTP → travelers → deposit → Razorpay → processing → confirmation. *Target: under 3 minutes, one hand.*
2. **Reel → WhatsApp → payment link → booking** (lead flow).
3. **Creator day 1:** signup → review pending → approved → Get link → share → first click in analytics.
4. **Creator month end:** Earnings (buckets and dates) → Payout on the 5th → statement.
5. **Operator:** signup → KYC → create trip → departures → submit → (admin approves) → live.
6. **Traveler:** pay balance → trip → review. And cancel with refund preview.
7. **Admin:** payout run maker-checker.

---

## 6. Design system foundations

**Brand:** "TripLink" is a working name; design with a swappable wordmark. Personality: *adventurous and trustworthy*, like a friend who has been there, not a flashy OTA.

**Color (starting point; the designer owns the final palette):**
| Token | Use | Suggestion |
|---|---|---|
| `primary` | CTAs, links | Deep teal or indigo (trust), e.g. #0F766E |
| `accent` | Highlights, creator ribbon | Warm sunset orange #F97316 (travel energy; nods to Instagram gradients without copying them) |
| `success` | Confirmed, paid | #16A34A |
| `warning` | Few seats, balance due | #D97706 |
| `danger` | Sold out, cancel, errors | #DC2626 |
| `whatsapp` | WhatsApp buttons only | #25D366 (brand rule) |
| Neutrals | Text, borders, surfaces | Slate scale; body text ≥ 4.5:1 contrast |
Plan for dark mode but ship light first (the in-app browser is usually light).

**Type:** Geist (already wired up) or a humanist sans with good ₹ glyphs and Devanagari fallback (Noto Sans Devanagari). Scale: 12 / 14 / 16 (body) / 18 / 22 / 28 / 36. Use tabular numbers for all money.

**Spacing and shape:** 4px base, 16px page gutters on mobile, cards with 12–16px radius, images at 4:3 (cards) and 16:9 (hero).

**Components (build as Figma components with variants):**
- Buttons: primary, secondary, ghost, destructive, WhatsApp. Sizes S, M, L. States: default, hover, pressed, loading, disabled.
- Inputs: text, phone (+91 prefix), OTP (6 boxes), select, date, stepper, textarea, file upload (with progress).
- Trip card (compact and large), departure row (all seat states), price-option radio card, price breakdown, sticky bottom bar.
- Badges and status chips: trip status, booking status, commission status, KYC status.
- Creator ribbon, avatar with story ring, stat tile, earnings bucket card, timeline (booking and commission).
- Bottom sheet, dialog (confirm and destructive), toast, banner (info, warning, error), empty state, skeletons, stepper or checklist.
- Tables for the operator and admin consoles (sortable, with row actions) and a filter bar.

**Iconography:** lucide (already in the codebase).

**Motion:** 150–250ms ease-out; bottom sheets slide up; respect `prefers-reduced-motion`.

---

## 7. Content and microcopy rules
- **Price:** "₹10,000 onwards · per person + GST" (the GST-inclusive display is still an open decision (§19), so design both variants).
- **Duration:** "3D/2N". **Dates:** "28 Oct – 30 Oct 2026". **Seats:** "Only 4 seats left" (≤ 5), "Sold out", "Booking closed".
- **Status vocabulary** (use these exact words everywhere):
  - Booking: Held · Confirmed · Balance due · Paid in full · Completed · Cancelled · Expired.
  - Commission: Pending · Confirmed · Payable · In payout · Paid · Reversed · Under review.
  - Trip: Draft · In review · Live · Paused · Changes needed · Archived.
- **Creator money:** always show a *date* next to a *status* ("Payable after 21 Nov").
- **Errors:** say what happened plus what to do next. Never show raw technical errors.
- Tone: warm, direct, no exclamation-mark overload, no fake urgency.

---

## 8. Compliance and trust requirements (non-negotiable in UI)
| Requirement | Where it shows |
|---|---|
| Seller details (legal name, GSTIN, address) on every listing (E-Commerce Rules) | Operator card on the trip page |
| "Sponsored" label on any paid placement; explain how rankings are decided | Search, home rails, footer link "How we rank" |
| Lowest price in the last 30 days next to any discount (2026 amendment) | Trip price, checkout discount line |
| No dark patterns: no fake timers, no pre-ticked add-ons, no confirm-shaming, easy cancel | Checkout, cancel flow |
| ASCI: creators label affiliate content | "#ad" auto-added in caption templates; disclosure help in the creator dashboard |
| Grievance officer name and email | Footer and Contact page |
| DPDP: consent capture, marketing WhatsApp opt-in (unticked by default), export/delete | Signup, profile, privacy page |
| Refunds only to the original payment method, 5–7 working days | Cancel flow, refund policy |
| Operator contact hidden until booking | Trip page (don't design a "call operator" button there) |
| No traveler PII shown to creators | Creator earnings rows show counts, not names |

---

## 9. Technical constraints designers must respect
- **Instagram in-app browser:** no `target=_blank` dependency, no popups, Razorpay opens in the same tab, and nothing important is hidden behind hover.
- **Performance:** LCP under 2.5s on 4G, CLS under 0.1, so reserve image and price space and avoid carousels that shift the layout. Budget for about 1 hero image above the fold.
- **Widths:** design at 360, 390, 768 and 1280px.
- **Built with:** Tailwind + shadcn/ui (Base UI primitives) + lucide. Designs map to these tokens and components; avoid bespoke widgets that need new libraries.
- **Images:** operators upload their own photos (quality varies), so design gracefully for missing and low-quality images (a gradient placeholder with the destination name).
- **Text length:** trip titles up to 120 characters and destinations up to 80. Test with long titles and Hindi.

---

## 10. Deliverables requested
1. Moodboard and 2 visual directions (with one applied to the home, trip page and creator home).
2. Design system in Figma (tokens + components above).
3. High-fidelity screens, **priority 1 (★)**:
   - trip page and tracked-link landing
   - checkout C1–C8
   - storefront
   - creator onboarding, home, catalogue, Get link sheet and earnings
   - booking detail and cancel
   - operator onboarding and trip editor
   - admin approvals and payout run
4. Priority 2: everything else in §4.
5. Clickable prototypes for journeys 1, 3 and 5 in §5.
6. Every screen with its loading, empty, error and success states.
7. A handoff note per screen: which component, which states, and which copy is final.

---

## 11. Open questions for the design phase
- Should prices display GST-inclusive or "+ GST"? (§19; inclusive converts better.)
- Final brand name, logo and domain.
- Do we show creator follower counts anywhere? (Recommendation: no, per §2.5.)
- Story-image generator for the Get link sheet: is a template-based image enough in Phase 1?
- A Hindi UI toggle in Phase 1, or later?

---

## 12. What already exists in code (so designs line up)
Routes built with placeholder UI (shadcn defaults):
- `/login` and `/mfa`
- `/account/profile`
- `/operator/onboarding`, `/operator/trips`, `/operator/trips/[id]` (tabs) and `/operator/trips/[id]/departures`
- `/admin/approvals`
- `/`, `/trips`, `/trips/[slug]`, `/destinations/[slug]`, `/@handle`

Data available per trip: title, summary, description (Markdown), destination, state, start city, days and nights, difficulty, highlights, inclusions and exclusions, things to carry, itinerary days (title, description, meals, stay), photos, pickup points (with extra charge), departures (dates, capacity, seats left, deposit, price options), cancellation policy (bands), operator (name, legal name, GSTIN, city, rating), host creator.

---

### Sources
- [Wishlink — India's #1 Creator Monetization Platform](https://www.wishlink.com/)
- [Wishlink Creator on the App Store](https://apps.apple.com/us/app/wishlink-creator/id6458532575)
- [Wishlink Creator review: signup, link creation, payouts (TechsProHub)](https://techsprohub.com/wishlink-creator-review-real-earnings/)
- [How creators make money using Wishlink (GarimaShares)](https://garimashares.com/making-money-using-wishlink/)
- [Wishlink for brands](https://www.wishlink.com/w/brand)
- Live storefront observed: [wishlink.com/malvikasitlani](https://www.wishlink.com/malvikasitlani) and its reel page (mobile, 28 Sep 2026)
