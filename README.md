# Team Notes API

A small REST service for capturing and sharing notes within teams, built with
[NestJS](https://nestjs.com/) and TypeScript on top of SQLite. It is designed as
a focused demo: a clean, tested HTTP surface with a deliberate set of
documented trade-offs rather than a production-hardened system.

## Features

- **Users & teams** — create users, create teams, and add members.
- **Team-scoped notes** — create, list (paginated), retrieve, update, and
  soft-delete notes within a team.
- **Optimistic concurrency** — updates use `If-Match` versioning so concurrent
  saves can't silently clobber each other.
- **Soft deletion** — deleted notes are retained and hidden, not destroyed.
- **Consistent errors** — every error uses one JSON envelope with a stable
  machine-readable `code`, and never leaks internal details.

## Prerequisites

- Node.js 22 or newer
- npm

## Setup

```sh
npm install
```

Copy `.env.example` to `.env` to override defaults (all variables are optional):

| Variable        | Default          | Purpose                                            |
| --------------- | ---------------- | -------------------------------------------------- |
| `PORT`          | `3000`           | HTTP port the service listens on.                  |
| `DATABASE_PATH` | `data/notes.db`  | SQLite file location (`:memory:` for ephemeral).   |
| `BODY_LIMIT`    | `100kb`          | Maximum accepted request body size.                |

## Run

```sh
npm run start        # start once
npm run start:dev    # start with watch mode
npm run build        # compile to dist/
npm run start:prod   # run the compiled build
```

The service listens on `http://localhost:3000` by default. Migrations are
applied automatically on startup.

## Storage

The service uses a local SQLite database file (`data/notes.db` by default),
accessed through `better-sqlite3` — no ORM or generated client.

Schema migrations live in `migrations/` as plain `.sql` files. They are applied
automatically on startup, in filename order, and recorded in the
`schema_migrations` table so each migration runs exactly once.

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
npm run typecheck    # tsc --noEmit over src and test
npm run lint         # eslint, zero warnings allowed
npm run test         # jest (unit + e2e)
npm run build        # compile to dist/
```

Tests run through a small harness (`test/create-test-app.ts`) that boots the
real application against a fresh temporary SQLite file per suite and applies the
same `configureApp()` used in production. End-to-end specs live alongside it in
`test/`; unit specs sit next to the code they cover.

## Endpoints

| Method | Path                     | Auth        | Description                                            |
| ------ | ------------------------ | ----------- | ------------------------------------------------------ |
| GET    | `/health`                | none        | Liveness check; reports process and database.          |
| POST   | `/users`                 | none        | Create a user. Body: `{ "name": string }`.             |
| POST   | `/teams`                 | `X-User-Id` | Create a team; the caller becomes its owner.           |
| GET    | `/teams`                 | `X-User-Id` | List teams the caller belongs to.                      |
| POST   | `/teams/:teamId/members` | `X-User-Id` | Owner-only. Add a member. Body: `{ "userId": string }`. |
| POST   | `/teams/:teamId/notes`   | `X-User-Id` | Create a note. Body: `{ "title": string, "body": string }`. |
| GET    | `/teams/:teamId/notes`   | `X-User-Id` | List a team's notes, most recently updated first.      |
| GET    | `/teams/:teamId/notes/:noteId` | `X-User-Id` | Retrieve a single note.                          |
| PUT    | `/teams/:teamId/notes/:noteId` | `X-User-Id` | Replace a note. Requires `If-Match: <version>`.  |
| DELETE | `/teams/:teamId/notes/:noteId` | `X-User-Id` | Soft-delete a note. Returns `204`.               |

### Errors

Errors are returned in a consistent shape, with a stable `code` clients can
branch on:

```json
{ "statusCode": 400, "error": "BadRequest", "message": "...", "code": "BAD_REQUEST" }
```

| Status | `code`              | When                                                     |
| ------ | ------------------- | -------------------------------------------------------- |
| 400    | `BAD_REQUEST`       | Invalid/missing/unknown body or query fields; bad `If-Match`. |
| 401    | `UNAUTHORIZED`      | Missing or unknown `X-User-Id`.                           |
| 403    | `FORBIDDEN`         | The caller is not a member of the team.                   |
| 404    | `NOT_FOUND`         | Unknown route, team, user, or note.                       |
| 409    | `CONFLICT`          | Stale `If-Match`; adding an existing member.              |
| 413    | `PAYLOAD_TOO_LARGE` | Request body exceeds `BODY_LIMIT`.                        |
| 500    | `INTERNAL_ERROR`    | Unexpected server error (details logged, never returned). |

Unexpected errors never leak stack traces, SQL text, or file paths — the client
only ever sees the envelope above.

### Request limits

The maximum accepted request body size is configurable via `BODY_LIMIT`
(default `100kb`; accepts `100kb`, `1mb`, or a byte count). Oversized requests
receive `413`. This is an **operational safeguard** against large payloads, not
a per-note product limit.

### Pagination

`GET /teams/:teamId/notes` accepts `limit` (default `20`, max `100`) and
`offset` (default `0`) query parameters and returns an envelope:

```json
{ "items": [ /* notes */ ], "total": 3, "limit": 20, "offset": 0 }
```

### Concurrency (optimistic locking)

Every note carries a `version` (starting at `1`). `PUT` requires an `If-Match`
header containing the version the client last read. If the stored version has
moved on (someone else saved first), the write is rejected with `409 Conflict`
and the note is left unchanged — correct saves replace the whole body rather
than sending diffs, and the client should debounce saves and retry on a 409.

- Missing or malformed `If-Match` → `400 Bad Request`.
- Stale `If-Match` → `409 Conflict`.

The version check and write happen in a single SQL statement
(`NotesRepository.updateIfVersion`), so two racing writers cannot both succeed.

### Deletion

Notes are **soft-deleted**: `DELETE` stamps a `deleted_at` timestamp and keeps
the row rather than removing it. Soft-deleted notes disappear from `GET` (single
and list) and are treated as `404`. There is no restore or purge endpoint yet,
and no unique constraint on note fields, so a removed title can be re-used. The
`deleted_at` column exists so a restore feature can be added later.

## Walkthrough

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

# Bob creates a note in the team
curl -s -X POST http://localhost:3000/teams/$TEAM/notes -H "X-User-Id: $BOB" -H 'Content-Type: application/json' -d '{"title":"Kickoff","body":"Agenda..."}'

# Anyone in the team can list the notes
curl -s "http://localhost:3000/teams/$TEAM/notes?limit=20&offset=0" -H "X-User-Id: $ADA"

# Retrieve one note (fill in NOTE and VERSION from a create/list response)
curl -s http://localhost:3000/teams/$TEAM/notes/$NOTE -H "X-User-Id: $ADA"

# Update it, asserting the version you last read
curl -s -X PUT http://localhost:3000/teams/$TEAM/notes/$NOTE \
  -H "X-User-Id: $ADA" -H "If-Match: $VERSION" -H 'Content-Type: application/json' \
  -d '{"title":"Kickoff (revised)","body":"Updated agenda..."}'

# Soft-delete it
curl -s -X DELETE http://localhost:3000/teams/$TEAM/notes/$NOTE -H "X-User-Id: $ADA" -o /dev/null -w '%{http_code}\n'
```

## Design decisions

- **Demo identity via header.** Real auth is out of scope, so identity is a
  trusted `X-User-Id` header, isolated behind `DemoIdentityGuard` and
  `@CurrentUser()` for easy replacement later.
- **Authorization always resolves the team from the route.** The team id in the
  path is the sole basis for access; note ids never authorize. Membership is
  checked before any note operation.
- **403 for non-members, even on unknown teams.** This keeps the contract simple
  and consistent (a member of the wrong team should never reach note logic) at
  the cost of revealing whether a team exists. A production system might prefer
  `404` to avoid that leak.
- **Versioning with `If-Match`.** Chosen over "last write wins" and over
  per-field patching because whole-body replacement matches how note editors
  flush saves. Concurrency-safe via a single conditional `UPDATE`.
- **Stale writes are `409`, not `412`.** HTTP-pure semantics suggest
  `412 Precondition Failed`; `409 Conflict` was chosen as the more familiar
  signal for API consumers. This is a deliberate deviation, documented here.
- **Soft delete.** Notes are retained with a `deleted_at` stamp rather than
  hard-deleted, leaving room for a future restore and giving a cheap audit
  trail (the deleter is recorded in `updated_by`).

## Limitations & next steps

- **No real authentication** — the `X-User-Id` mechanism is demo-only.
- **No note ownership or per-note permissions** — any team member may edit or
  delete any note in the team.
- **No restore/purge** for soft-deleted notes, and no unique constraints on note
  fields.
- **No rate limiting, caching, or structured logging/metrics.**
- **Concurrency is optimistic only** — there is no locking around long edits.
- **`:memory:` databases** are per-connection; use a file path for multi-process
  setups.

## Project layout

```
migrations/          Plain-SQL schema migrations (applied on startup)
src/auth/            Demo identity guard + current-user decorator
src/common/          Error envelope, pagination types
src/config.ts        Environment parsing (PORT, DATABASE_PATH, BODY_LIMIT)
src/database/        SQLite connection, migration runner
src/notes/           Notes controller, service, repository, DTOs
src/teams/           Teams controller, service, repository
src/users/           Users controller, service, repository
test/                App harness and end-to-end specs
```
