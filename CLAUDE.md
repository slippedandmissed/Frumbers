# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Frumbers is a multiplayer number-guessing game. A host creates a game made of one or more rounds, each a question with a numeric answer; players guess once per round, and answers/guesses stay hidden from non-hosts until that round is over. Two independent Bun projects live side by side: `backend/` (Elysia + Drizzle + Postgres + Pusher) and `frontend/` (React 19 + Vite + Mantine + TanStack Router/Query). There is no root `package.json`; run commands inside each directory.

## Commands

Backend (`cd backend`; first time: `bun install && cp template.env .env`):
- `bun run dev:up` / `dev:down` / `dev:tail`: run the whole dev stack in Docker Compose (backend with `--watch`, Postgres, soketi as a Pusher stand-in, adminer, nginx on :3000). The backend is not run directly on the host in dev.
- API docs (Swagger): http://frumbers.localhost:3000/swagger; DB UI: http://db.frumbers.localhost:3000/
- `bun run db:generate` / `bun run db:migrate`: drizzle-kit, run inside the compose container. Schema is in `src/db/schema/`, migrations in `drizzle/`.
- `bun run lint`, `bun run fmt`, `bun run fmt:check`

Frontend (`cd frontend`; first time: `bun install && cp template.env .env`, after installing backend deps):
- `bun run dev` (backend must be running), `bun run build` (`tsc -b && vite build`), `bun run lint`, `bun run fmt:check`

There is no test suite. CI (`.github/workflows/publish.yml`) only deploys on push to `main`: backend Docker image to Cloud Run, frontend to Cloudflare Pages. It doesn't run lint or tests.

## Architecture

**End-to-end types via a linked package.** The frontend imports the backend's `App` type (`frontend/src/utils/api.ts`) through the `frumbers-backend` link dependency (the backend's `postinstall` runs `bun link`) and uses Eden Treaty for a typed client. So backend dependencies must be installed before the frontend type-checks, and changes to Elysia route signatures/response schemas flow straight into frontend types.

**Backend layering.** `src/api/*` holds thin Elysia route modules (mounted under `/api` in `api/index.ts`); `src/core/*` holds the logic and DB access. Core functions take an optional `tx` (`Transactable`) param defaulting to `db`. Drizzle tables in `src/db/schema/` double as TypeBox schemas via `drizzle-typebox` (e.g. `Game`), used for route response validation. Errors go through `HttpError` and `errors/error_handler.ts`.

**Auth.** There are no accounts. `POST /api/player/register` creates a player with a random name and pin; the client keeps `playerId`/`playerPin` in `localStorage` and sends them as `x-frumbers-player-id` / `x-frumbers-player-pin` headers (see `frontend/src/hooks/useAuth.ts`). Backend routes are protected by `requirePlayerGuard` / `requirePlayer` in `core/player.ts`.

**Rounds.** A game has ordered `rounds` (`position`, `question`, `answer`, `isOver`); `games.currentRoundPosition` points at the live one, and `games.isOver` means the whole game is finished. Finished rounds occupy the lowest positions and are immutable. The host can edit the live round and edit/delete/reorder upcoming ones. Transitions (`finishCurrentRound` -> `startNextRound` / `addRound` -> `finishGame`) live in `core/game.ts` and run under a row lock via `withLockedGame`. The game's `phase` (`playing` | `round-over` | `game-over`) is derived from those flags. To end early the host deletes upcoming rounds and finishes the game. Guesses are unique per `(roundId, playerId)`, and a round can't be finished until it has `MIN_GUESSES_TO_FINISH_ROUND` (2) guesses (mirrored by a constant in `GamePage.tsx`). Scoring is in `core/scoring.ts`: percentile points per round (percentage of other guessers beaten, ties split), summed into running totals and served by `GET /game/:id/standings`, which only includes finished rounds.

**Information hiding.** The host sees everything. Non-hosts only ever receive the *current* round (`NonHostGame.currentRound`): its `answer` is zeroed until the round is over, and upcoming questions are never sent. `totalRounds` is null unless the host enabled `showRoundIndicator`, so the toggle is enforced server-side. `getAllGuessesForGame` zeroes other players' guesses only for rounds still in progress. Preserve this when adding endpoints that return game, round or guess data. Host-only routes use `getGame`, which checks `ownerId`; non-host routes use `getNonHostGame`.

**Realtime.** Mutations in `core/game.ts` fire `pusher.trigger("game-<id>", "game-updated" | "new-guess", {})` with empty payloads. The frontend subscribes (`hooks/usePusher.ts`, `PusherContext`) and refetches via React Query. The Pusher config is either `host`/`port` (local soketi) or `cluster` (production), selected by which env vars are set (`backend/src/config.ts`, which validates env at import time and throws if required vars are missing).

**Frontend routing.** TanStack Router file-based routes in `src/routes/` (`_game/$gameSlug.tsx` for games). `src/routeTree.gen.ts` is generated by the Vite plugin; don't edit it by hand. Games are addressed by a human-readable slug (two random names) that is resolved to a game id through `GET /api/game/gameId?slug=`.

**Host preferences.** The host's last `showRoundIndicator` choice is kept in `localStorage` (`frontend/src/utils/preferences.ts`) as the default for new games.

**Env.** Backend vars are in `backend/template.env`. Frontend vars are `VITE_*` in `frontend/template.env`. The `VITE_PUSHER_*` vars include the secret, which the CI build also passes.
