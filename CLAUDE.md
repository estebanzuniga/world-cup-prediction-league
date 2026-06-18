# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview
A private prediction league for the 2026 FIFA World Cup. Friends join a league, submit score predictions before each match kicks off, and earn points based on accuracy. A leaderboard updates automatically after each matchday.

## Commands

```bash
# Root (runs both server + client via concurrently)
npm run dev               # start server (tsx watch) + client (vite) in parallel
npm run build             # build shared → server → client
npm run lint              # eslint over all .ts/.tsx
npm run typecheck         # tsc --noEmit for client and server

# Server (cd server or use --workspace=server)
npm run dev --workspace=server        # tsx watch src/index.ts
npm run test --workspace=server       # vitest run (single pass)
npm run test:watch --workspace=server # vitest watch mode
npm run prisma:migrate --workspace=server  # prisma migrate dev
npm run prisma:studio --workspace=server   # open Prisma Studio
npm run db:seed --workspace=server         # prisma db seed (seed.ts)
npm run prisma:generate --workspace=server # regenerate Prisma client after schema change
```

Run a single test file:
```bash
cd server && npx vitest run src/__tests__/scoring.test.ts
```

## Architecture

**Monorepo** — npm workspaces: `client`, `server`, `shared`. The `shared` package (`@prediction-league/shared`) is consumed directly from TypeScript source (no build step); it exports `ApiResult<T>`, `ApiSuccess`, `ApiError`, and the `MatchStatus` union.

**Server** (`server/src/`):
- `app.ts` — Express app wired with CORS (origin from `CLIENT_URL`), `cookie-parser`, JSON body, and all routers. `errorHandler` is the final middleware.
- `index.ts` — starts the HTTP server and registers the cron job.
- `routes/` — one file per resource. All routes except `health` are behind `requireAuth`.
- `middleware/requireAuth.ts` — reads `Authorization: Bearer <token>`, verifies with `JWT_SECRET`, stamps `req.user = { id, email }`.
- `middleware/errorHandler.ts` — catches anything forwarded via `next(err)`; hides internals (`500` → generic message).
- `lib/jwt.ts` — access tokens (`15m`, `JWT_SECRET`) + refresh tokens (`7d`, `JWT_REFRESH_SECRET`).
- `lib/lockout.ts` — `isPredictionLocked(kickoffTime)` — returns true once the match has kicked off.
- `lib/prisma.ts` — singleton Prisma client.
- `services/scoring.ts` — pure `calculatePoints()` function; the only place scoring logic lives.
- `jobs/syncResults.ts` — `syncResults()` polls football-data.org for `FINISHED` matches, updates `Match`, and upserts `PointsLedger` rows for every prediction × every league membership. Cron schedule: `*/5 12-23 * * *` UTC. No-op if `FOOTBALL_DATA_API_KEY` is unset.

**Auth flow**: `POST /api/auth/login` → sets `refreshToken` httpOnly cookie (7d) and returns `{ accessToken }` in body. Clients send the access token as `Bearer` header. `POST /api/auth/refresh` rotates the access token using the cookie.

**Points ledger**: `PointsLedger` has a unique constraint on `(userId, matchId, leagueId)` so `upsert` is idempotent — re-running `syncResults` never double-counts.

**Leaderboard** (`GET /api/leagues/:id/leaderboard`): aggregates `PointsLedger` in memory (no extra DB query), returns members sorted by `totalPoints` descending, includes `exactScoreCount`.

**Client** (`client/src/`): React 18 + Vite + Tailwind. Currently minimal (scaffold only). The `api/` directory is intended for typed fetch wrappers that use `ApiResult<T>` from shared.

## Tech stack
- Frontend: React 18 + Vite + TailwindCSS
- Backend: Node.js + Express (TypeScript), `tsx` for dev
- Database: PostgreSQL via Prisma ORM (`server/prisma/schema.prisma`)
- Auth: JWT — access token in memory, refresh token in httpOnly cookie
- Testing: Vitest + supertest (`server/src/__tests__/`)
- Scheduler: node-cron — results sync every 5 min during match window
- External API: football-data.org free tier, competition id `WC`

## Conventions
- TypeScript everywhere, `strict: true` (`tsconfig.base.json`)
- Async/await only, no `.then()` chains
- No raw SQL — always use Prisma client
- All routes forward errors to `next(err)` for the typed error handler
- Environment variables via dotenv; never hardcoded
- Every scoring function must have Vitest unit tests

## Environment variables (`.env` at repo root)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs 15-min access tokens |
| `JWT_REFRESH_SECRET` | Signs 7-day refresh tokens |
| `FOOTBALL_DATA_API_KEY` | football-data.org API key (sync is skipped if blank) |
| `PORT` | Server port (default 3000) |
| `CLIENT_URL` | CORS origin for the Vite dev server (default `http://localhost:5173`) |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather — enables the Telegram bot (skipped if unset) |
| `TELEGRAM_ADMIN_CHAT_ID` | Your Telegram chat ID from @userinfobot — only this ID can run bot commands |
| `RESEND_API_KEY` | API key from resend.com — enables password reset emails |
| `SMTP_FROM` | Sender address shown in emails (e.g. `Goalcaster <you@yourdomain.com>`); defaults to `onboarding@resend.dev` |

The test setup (`server/src/__tests__/setup.ts`) loads the root `.env` and injects fallback JWT secrets so tests run without a real `.env`.

## Scoring rules
- Exact score predicted correctly → **3 points**
- Correct result (win/draw/loss) but wrong score → **1 point**
- Wrong result → **0 points**

## Key business rules
- Predictions lock at `match.kickoffTime` — the API rejects submissions at or after that time
- Each user can submit exactly one prediction per match (upsert allowed before lock)
- Points are calculated automatically after a match reaches status `FINISHED`
- Leagues are private and invite-only via a shareable invite code (8-char hex, generated with `crypto.randomBytes`)
- Leaderboard is only visible to league members

## Database schema (Prisma)
`User` — `League` — `LeagueMember` (composite PK) — `Match` — `Prediction` (unique on `userId+matchId`) — `PointsLedger` (unique on `userId+matchId+leagueId`) — `PasswordResetToken` (token unique; expires 1 h; usedAt marks consumed). Prisma schema lives at `server/prisma/schema.prisma`; migrations are in `server/prisma/migrations/`.
