# Team Notes API

A small REST service for capturing and sharing notes within teams.

> **Status:** early scaffold. Only `GET /health` exists today; the notes API is
> built up in the stories described in the README's roadmap.

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

## Quality checks

```sh
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # jest (unit + e2e)
npm run build        # compile to dist/
```

## Endpoints

| Method | Path      | Description                        |
| ------ | --------- | ---------------------------------- |
| GET    | `/health` | Liveness check, returns `status`.  |

```sh
curl http://localhost:3000/health
# {"status":"ok","uptime":12.34}
```
