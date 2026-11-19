# CLAUDE.md — ListingWatch

## What this is
ListingWatch is a marketplace listing monitor. It's a portfolio project for the CounterFind Full-Stack Engineering Intern role, so it mirrors their stack: TypeScript monorepo, SvelteKit, Fastify, Sequelize, Zod, TanStack Query, Tailwind, Vitest, Playwright.

Flow: **Puppeteer scraper → Fastify API (SQLite) → SvelteKit dashboard**, where a user reviews and flags suspicious listings.

Scrape target: **https://books.toscrape.com only**. It's a practice site, so there are no ToS issues. Don't point the scraper anywhere else.

## Repo layout (pnpm workspaces)
```
listing-watch/
├─ apps/api          Fastify + Sequelize + SQLite
├─ apps/dashboard    SvelteKit + Tailwind + TanStack Query
├─ packages/shared   Zod schemas + inferred TS types (imported by api AND dashboard)
└─ packages/scraper  Puppeteer script that POSTs to the API
```

## Commands
Keep these scripts working as they're added:
```bash
pnpm install
pnpm dev                          # api + dashboard together
pnpm --filter api dev
pnpm --filter dashboard dev
pnpm --filter scraper start       # scrape → POST /listings (API must be running)
pnpm test                         # Vitest across all packages
pnpm --filter dashboard test:e2e  # Playwright smoke test
pnpm lint && pnpm typecheck
```

## Core rules
1. **Zod schemas live in `packages/shared` and nowhere else.** The API validates requests with them and the dashboard validates forms and responses with them. Derive types with `z.infer`. Never redefine a listing shape by hand.
2. **No `any`.** Use `unknown` plus Zod parsing at boundaries. Strict TS everywhere.
3. **Finish small before expanding.** Ship the MVP feature fully (with a test) before touching stretch goals.
4. Keep changes scoped. Don't add dependencies without a reason noted in the PR/commit.

## Data model: Listing
`id`, `title`, `price` (number), `rating` (1–5), `inStock` (bool), `url` (unique), `status` (`ok` | `flagged` | `reviewed`), `flagReasons` (string[]), `notes` (string, optional), `createdAt`, `updatedAt`.

## MVP features
- **Scraper:** collect title, price, rating, stock status, and URL, then POST to the API. Upsert by `url`.
- **API:** CRUD on `/listings` with Zod validation. `PATCH /listings/:id/flag` sets status and notes.
- **Flagging rules** (pure functions in their own module so they're easy to test):
  - Price well below the median for the same rating (pick a threshold and document it, e.g. under 50% of median).
  - Near-duplicate titles (normalized string similarity, threshold documented).
- **Dashboard:** a searchable, sortable table, a "flagged only" filter, and a review/flag modal. Flag changes use an **optimistic update** via TanStack Query, with rollback on error.

## Testing
- Vitest: shared schemas, flag rules, and at least one API route via `fastify.inject` (no real server).
- Playwright: one smoke test that loads the dashboard and flags a listing.
- Every new feature ships with a test. Don't cut Vitest tests.

## Priorities if behind schedule
Cut in this order: optimistic update → Playwright → duplicate detection.
**Never cut:** Vitest tests, README.

Stretch goals (only once the MVP is done): i18n with 2 languages, a GitHub Action that runs Vitest, an AI-written summary of why each listing was flagged.

## README requirements
The README must cover architecture, design decisions (especially the shared Zod schemas), how to run it, an **AI log**, and future improvements.

## AI log (important)
This project has to show the AI was used deliberately and the code stays under the author's control. When Claude writes or substantially changes code, append an entry to `AI_LOG.md`:
```
- <date> | <area/file> | what Claude did | what was reviewed/rewritten by hand and why
```
Prefer explaining and suggesting over large unreviewed rewrites. Flag anything non-obvious so it can be understood and defended in an interview.

## Conventions
- Small, focused commits in conventional style (`feat(api): add flag route`).
- Fastify: one route file per resource, schemas imported from `@listing-watch/shared`.
- Svelte: reusable UI (table, modal, badge) goes in `apps/dashboard/src/lib/components`.
- Tailwind utilities only. No custom CSS unless unavoidable.
- Put user-facing strings in one place so i18n is easy to add later.
