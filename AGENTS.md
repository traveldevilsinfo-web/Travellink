# AGENTS.md — Rules for AI coding tools (Cursor / Claude Code / Windsurf / Lovable)

Read `ARCHITECTURE.md` before every task. It is the source of truth. If a request conflicts with it, stop and ask.
Copy this file to `CLAUDE.md` and `.cursorrules` as well so every tool picks it up.

## Stack
Next.js (App Router, TypeScript strict) · Tailwind + shadcn/ui · Supabase (`@supabase/ssr`) · Razorpay · Vercel · zod · react-hook-form · Vitest · Playwright · pnpm.

## Hard rules: never break these
1. **Money is integer paise (`bigint` in DB, `number` safe-integer or `bigint` in TS).** No floats for amounts. All money math lives in `lib/domain/money.ts` and `lib/domain/pricing.ts` and comes with unit tests.
2. **Never trust the client for prices, amounts, commission %, attribution or user IDs.** Recompute on the server from DB rows.
3. **Service-role Supabase client only in `lib/supabase/admin.ts`**, which has `import 'server-only'`. Never import it in components, pages or any `"use client"` file. Use it only in webhooks, cron, money writes, admin actions *after* `requireAdmin()`, **OAuth callbacks that store provider-verified data** (Instagram followers — `lib/creator/connect.ts`; the user id must come from the session), and the **`/r/[code]` click logger** (`lib/tracking/click.ts`; anonymous followers, no client write path to clicks).
4. **Every table has RLS enabled.** New tables need policies in the same migration. Money, ledger, webhook and audit tables get **no** client insert/update/delete policies.
5. **Schema changes only through new files in `supabase/migrations/`** (`supabase migration new <name>`). Never edit an existing migration. Never change the schema in the dashboard. Regenerate types after every migration: `supabase gen types typescript --local > lib/supabase/types.ts`.
6. **Every server action and route handler starts with:** auth guard → zod parse → rate limit (if user-facing) → domain service call. No business logic in components.
7. **Payments are confirmed only from the Razorpay webhook** (`payment.captured`), after verifying the signature on the raw body and doing an idempotent insert into `webhook_events`. The client-side success handler only shows "processing".
8. **Seat counts change only via SQL functions** `hold_seats`, `confirm_seats`, `release_held_seats` and `release_booked_seats`.
9. **Every money event posts a balanced journal** via `post_journal()` (see ARCHITECTURE §7.4).
10. **Secrets never get the `NEXT_PUBLIC_` prefix.** The only public keys are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_SENTRY_DSN`.
11. **No PII in logs, Sentry or PostHog** (phones, emails, PAN, names). Use IDs.
12. **Never store** Aadhaar numbers, card data, full bank account numbers or raw IPs. PAN is stored only encrypted via `lib/security/crypto.ts`.
13. **Don't add dependencies** without saying why. Prefer the stack above.
14. **Don't build Phase-2/out-of-scope features** (ARCHITECTURE §1 "Out of scope").

## Conventions
- Server Components by default; `"use client"` only for interactivity.
- Folder-per-feature under `app/`; shared UI in `components/`; logic in `lib/domain/*` (pure, testable, no Next imports).
- Supabase clients: `createServerClient()` (user session, RLS) for reads and user-scoped writes; `createAdminClient()` only as per rule 3.
- Errors: throw typed `AppError(code, message)`; map to safe user messages; log details to Sentry.
- Dates: store UTC; trip dates are `date` in IST; format with `Asia/Kolkata`.
- Names: DB snake_case; TS camelCase; zod schemas `XxxSchema`; server actions in `actions.ts` next to the page.
- Forms: react-hook-form + zodResolver with the **same** schema the server uses.
- Tests: every file in `lib/domain` has a `*.test.ts`. Every migration with policies gets an RLS test in `supabase/tests/`.
- UI: mobile-first (Instagram in-app browser), shadcn components, skeleton loaders, empty states, and error states on every page.

## Definition of done (every task)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass
- [ ] New tables/policies have RLS tests
- [ ] No service-role import outside allowed files (`pnpm lint` enforces it)
- [ ] Inputs validated with zod; outputs have no extra PII
- [ ] Loading, empty and error states done
- [ ] Explains in the PR/summary: what changed, security impact, migrations added

## Build order (one milestone per session; see ARCHITECTURE §17)
**v2 order (ARCHITECTURE §20.8 — the product is now "Wishlink for travel"; §20 overrides earlier sections):**
M0 Foundations ✓ → M1 Auth & roles ✓ → M2 Operator + trip CMS ✓ → M3 Public site ✓ → M4 Creators + Instagram (1,000-follower gate) + links → M5 Leads + operator performance → M6 Redirect conversions + operator billing → M7 Creator payouts → M8 Platform checkout (Razorpay + Route) → M9+ refunds, lifecycle, trust, hardening.

### Starter prompt per milestone
> "Implement milestone **M{n}** from ARCHITECTURE.md §17. First list the files you'll create or change and any migration needed, then wait for my OK. Follow AGENTS.md hard rules. Write the domain unit tests first for anything touching money, seats, attribution or refunds. At the end, show how each acceptance criterion is met."

## ESLint guard (add in M0)
```js
// eslint.config.mjs (excerpt)
{
  files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
  ignores: ['app/api/**', 'app/**/actions.ts'],
  rules: {
    'no-restricted-imports': ['error', { paths: [
      { name: '@/lib/supabase/admin', message: 'Service role only in API routes, webhooks, cron and server actions after a guard.' }
    ]}]
  }
}
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
