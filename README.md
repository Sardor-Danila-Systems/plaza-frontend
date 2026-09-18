# Euro Plaza Management System — frontend

Next.js 16 (App Router) frontend for Euro Plaza Group's construction/
finance/warehouse management CRM. This is a pure client — every page under
`app/(protected)/` is a client component that talks to the
[`plaza-api`](../plaza-api) backend over HTTP; nothing here connects to a
database directly, so there is no Prisma/Neon configuration in this repo.

## Prerequisites

- Node.js 24+
- A running instance of `plaza-api` (local or deployed) — see that repo's
  own README for its setup, including the `CORS_ORIGIN` it must allow for
  this frontend's origin.

## Install

```bash
npm install
```

## Environment

Copy the example file:

```bash
cp .env.local.example .env.local
```

| Variable               | Required | Meaning                                                                                     |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`   | no       | Base URL of the `plaza-api` backend. Defaults to `http://localhost:3000` if unset. Public — read in the browser on every API call (`lib/api/client.ts`). |

If pages load but every request fails (network errors in the browser
console, nothing ever loads), the most common cause is **not** this
variable — it's the backend's own `CORS_ORIGIN` not including this
frontend's origin. See `plaza-api/README.md`.

## Run

```bash
npm run dev
```

Opens on [http://localhost:3001](http://localhost:3001) — the dev script
passes `-p 3001` so it doesn't collide with `plaza-api`'s default port 3000
when both run locally at once.

## Build

```bash
npm run build
npm run start
```

## Tests

```bash
npx playwright test
```

Requires both a running `plaza-api` (with `DATABASE_URL` pointed at a real
reachable Postgres/Neon database, migrated and reachable) and this frontend
dev server — see `tests/e2e/demo-flow.spec.ts`'s own header comment and
`playwright.config.ts` for the expected ports (`baseURL:
http://localhost:3001`).

## Architecture notes

- **No server-side data fetching.** Every data-bearing page is a client
  component using TanStack Query against `plaza-api`'s REST endpoints
  (`lib/api/*.ts` + `lib/query/hooks/*.ts`). There are no Next.js Server
  Components reading a database and no Route Handlers proxying one either —
  keep it that way when adding pages, so this repo never needs its own
  database credentials.
- **Money/quantity values are Decimal strings** end-to-end from the backend;
  `lib/format/decimal.ts` formats them for display via `decimal.js` and
  never converts them to `Number` for anything that gets submitted back.
- **Auth** is a short-lived access token (in memory, via the Zustand store in
  `lib/auth/store.ts`) plus an HttpOnly refresh cookie the browser sends
  automatically — see `lib/auth/auth-provider.tsx`.
