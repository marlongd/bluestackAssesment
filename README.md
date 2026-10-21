# Team Notes API

A small REST service for capturing and sharing notes within teams.

> **Status:** early scaffold. `GET /health`, the database layer, users, and team
> membership exist today; the notes API is built up in the stories described in
> the README's roadmap.

## Prerequisites

- Node.js 22 or newer
- npm

## Setup

```sh
npm install
```

## Run

```sh
npm run start        # start once
npm run start:dev    # start with watch mode
npm run start:prod   # run the compiled build (after npm run build)
```

The service listens on `http://localhost:3000` by default. Override with the
`PORT` environment variable (copy `.env.example` to `.env` to get started).

## Storage

The service uses a local SQLite database file. By default it is created at
`data/notes.db` relative to where the service is run. Override the location with
the `DATABASE_PATH` environment variable (set it to `:memory:` for an ephemeral
database).

Schema migrations live in `migrations/` as plain `.sql` files. They are applied
automatically on startup, in filename order, and recorded in the
`schema_migrations` table so each migration runs exactly once. No ORM or
generated client is used.

```sh
# Use a throwaway database for manual testing
$env:DATABASE_PATH=":memory:"; npm run start
```

> Note: the `data/` directory and `*.db` files are gitignored.

## Demo identity

This service does **not** implement real authentication. Instead, every request
is identified by an `X-User-Id` header containing the id of a user created via
`POST /users`. The header is trusted as-is; there is no secret, session, or
signature.

> **This is a demo-only mechanism and must not be used in production.** All
> identity resolution is isolated in `src/auth/` (`DemoIdentityGuard`) so it can
> be replaced with real authentication without changing controllers or services.

Requests to protected routes without a valid `X-User-Id` receive `401`. A user
must be a member of a team to act within it; non-members receive `403`.

## Quality checks

```sh
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # jest (unit + e2e)
npm run build        # compile to dist/
```

## Endpoints

| Method | Path                   | Auth        | Description                                        |
| ------ | ---------------------- | ----------- | -------------------------------------------------- |
| GET    | `/health`              | none        | Liveness check; reports process and database.      |
| POST   | `/users`               | none        | Create a user. Body: `{ "name": string }`.         |
| POST   | `/teams`               | `X-User-Id` | Create a team; the caller becomes its owner.       |
| GET    | `/teams`               | `X-User-Id` | List teams the caller belongs to.                  |
| POST   | `/teams/:teamId/members` | `X-User-Id` | Owner-only. Add a member. Body: `{ "userId": string }`. |

```sh
# Health
curl http://localhost:3000/health
# {"status":"ok","uptime":12.34,"db":"ok"}

# Create two users
ADA=$(curl -s -X POST http://localhost:3000/users -H 'Content-Type: application/json' -d '{"name":"Ada"}' | jq -r .id)
BOB=$(curl -s -X POST http://localhost:3000/users -H 'Content-Type: application/json' -d '{"name":"Bob"}' | jq -r .id)

# Ada creates a team (she becomes owner)
TEAM=$(curl -s -X POST http://localhost:3000/teams -H "X-User-Id: $ADA" -H 'Content-Type: application/json' -d '{"name":"Alpha"}' | jq -r .id)

# Ada adds Bob
curl -s -X POST http://localhost:3000/teams/$TEAM/members -H "X-User-Id: $ADA" -H 'Content-Type: application/json' -d "{\"userId\":\"$BOB\"}"

# Bob now sees the team
curl -s http://localhost:3000/teams -H "X-User-Id: $BOB"
```
