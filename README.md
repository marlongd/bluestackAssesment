# Team Notes API

A small REST service for capturing and sharing notes within teams.

> **Status:** early scaffold. `GET /health` and the database layer exist today;
> the notes API is built up in the stories described in the README's roadmap.

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

## Quality checks

```sh
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # jest (unit + e2e)
npm run build        # compile to dist/
```

## Endpoints

| Method | Path      | Description                                     |
| ------ | --------- | ----------------------------------------------- |
| GET    | `/health` | Liveness check; reports process and database.   |

```sh
curl http://localhost:3000/health
# {"status":"ok","uptime":12.34,"db":"ok"}
```
