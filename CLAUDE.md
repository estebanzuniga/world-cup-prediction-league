# World Cup Prediction League

## Project overview
A private prediction league for the 2026 FIFA World Cup. Friends join a league,
submit score predictions before each match kicks off, and earn points based on
accuracy. A leaderboard updates automatically after each matchday.

## Tech stack
- **Frontend:** React 18 + Vite + TailwindCSS
- **Backend:** Node.js + Express (TypeScript)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT (access token + refresh token), GitHub OAuth optional
- **Testing:** Vitest + supertest for API routes
- **Scheduler:** node-cron for result syncing
- **External API:** football-data.org (free tier, World Cup competition id: WC)

## Project structure
```
/
├── client/          # Vite + React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── api/     # typed fetch wrappers
├── server/          # Express backend
│   ├── routes/
│   ├── services/
│   ├── jobs/        # cron jobs
│   └── prisma/      # schema + migrations
└── shared/          # types shared between client and server
```

## Conventions
- TypeScript everywhere, strict mode on
- Async/await only, no .then() chains
- No raw SQL — always use Prisma client
- All routes go through a typed error handler middleware
- Environment variables via dotenv, never hardcoded
- Every scoring function must have Vitest unit tests

## Scoring rules
- Exact score predicted correctly → **3 points**
- Correct result (win/draw/loss) but wrong score → **1 point**
- Wrong result → **0 points**

## Key business rules
- Predictions lock at `match.kickoff_time` — the API must reject submissions after that
- Each user can submit exactly one prediction per match (upsert allowed before lock)
- Points are calculated automatically after a match reaches status `FINISHED`
- Leagues are private and invite-only via a shareable link + code

## Database tables (Prisma models to generate)
- `User` — id, name, email, passwordHash, avatarUrl, createdAt
- `League` — id, name, inviteCode, createdBy, createdAt
- `LeagueMember` — leagueId, userId, joinedAt
- `Match` — id, homeTeam, awayTeam, kickoffTime, homeScore, awayScore, status, externalId
- `Prediction` — id, userId, matchId, predictedHome, predictedAway, submittedAt
- `PointsLedger` — id, userId, matchId, leagueId, points, breakdown (JSON)