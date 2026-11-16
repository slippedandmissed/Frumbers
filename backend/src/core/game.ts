import { and, asc, count, eq, gt, sql } from "drizzle-orm";
import { db, type Transactable } from "../db/db";
import { games, Game, type Player, guesses, rounds, Round } from "../db/schema";
import randomName from "@scaleway/random-name";
import { pusher } from "../pusher";
import { t, type Static } from "elysia";
import { HttpError } from "../errors/http_error";
import {
  scoreRound,
  totalUp,
  type RoundResult,
  type Standings,
} from "./scoring";

/** A round needs at least this many guesses before it can be finished. */
export const MIN_GUESSES_TO_FINISH_ROUND = 2;

export type RoundInput = { question: string; answer: number };

function notifyGameUpdated(gameId: string) {
  void pusher.trigger(`game-${gameId}`, "game-updated", {});
}

/**
 * Runs `fn` in a transaction holding a row lock on the game, so concurrent
 * round transitions (finish / next / delete / ...) can't interleave.
 */
async function withLockedGame<T>(
  gameId: string,
  fn: (tx: Transactable, game: Game) => Promise<T>,
): Promise<T> {
  const result = await db.transaction(async (tx) => {
    const [game] = await tx
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .for("update");
    if (!game) {
      throw new HttpError(404, "Game not found");
    }
    return await fn(tx, game);
  });
  notifyGameUpdated(gameId);
  return result;
}

async function getRoundsForGame(
  gameId: string,
  tx: Transactable,
): Promise<Round[]> {
  return await tx.query.rounds.findMany({
    where: eq(rounds.gameId, gameId),
    orderBy: [asc(rounds.position)],
  });
}

function requireGameInProgress(game: Game) {
  if (game.isOver) {
    throw new HttpError(409, "The game is already over");
  }
}

export async function createGame({
  host,
  rounds: roundInputs,
  showRoundIndicator,
  showRunningTotals,
  tx,
}: {
  host: Player;
  rounds: RoundInput[];
  showRoundIndicator: boolean;
  showRunningTotals: boolean;
  tx?: Transactable;
}): Promise<Game> {
  if (roundInputs.length === 0) {
    throw new HttpError(400, "A game needs at least one round");
  }
  const run = async (tx: Transactable) => {
    const slug = `${randomName()}-${randomName()}`;
    const game = await tx
      .insert(games)
      .values({ ownerId: host.id, slug, showRoundIndicator, showRunningTotals })
      .returning()
      .then((res) => res[0]!);
    await tx.insert(rounds).values(
      roundInputs.map((round, position) => ({
        gameId: game.id,
        position,
        question: round.question,
        answer: round.answer,
      })),
    );
    return game;
  };
  return tx ? await run(tx) : await db.transaction(run);
}

export async function getGame({
  id,
  host,
  tx = db,
}: {
  id: string;
  host: Player;
  tx?: Transactable;
}): Promise<Game | null> {
  return await tx.query.games
    .findFirst({
      where: (games) => and(eq(games.id, id), eq(games.ownerId, host.id)),
    })
    .then((res) => res ?? null);
}

/** Host-only: the game plus every round, including upcoming ones. */
export async function getRounds({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<Round[]> {
  return await getRoundsForGame(game.id, tx);
}

export const NonHostGame = t.Object({
  id: t.String(),
  ownerId: t.String(),
  isOver: t.Boolean(),
  showRoundIndicator: t.Boolean(),
  showRunningTotals: t.Boolean(),
  /**
   * Shared clock for the results races. `finishedAt` is when the whole game
   * ended; `serverTime` lets clients correct for their own clock being off.
   */
  finishedAt: t.Union([t.String(), t.Null()]),
  raceSkipped: t.Boolean(),
  serverTime: t.String(),
  phase: t.Union([
    t.Literal("playing"),
    t.Literal("round-over"),
    t.Literal("game-over"),
  ]),
  /** Only the current round is ever exposed; upcoming rounds stay hidden. */
  currentRound: t.Object({
    id: t.String(),
    position: t.Number(),
    question: t.String(),
    answer: t.Number(),
    isOver: t.Boolean(),
    finishedAt: t.Union([t.String(), t.Null()]),
    raceSkipped: t.Boolean(),
  }),
  /** Null unless the host has turned the round indicator on. */
  totalRounds: t.Union([t.Number(), t.Null()]),
});
export type NonHostGame = Static<typeof NonHostGame>;

async function loadNonHostGame(
  game: Game | undefined,
  tx: Transactable,
): Promise<NonHostGame | null> {
  if (!game) return null;
  const allRounds = await getRoundsForGame(game.id, tx);
  const current = allRounds.find(
    (round) => round.position === game.currentRoundPosition,
  );
  if (!current) {
    throw new Error(`Game ${game.id} has no round at its current position`);
  }
  return {
    id: game.id,
    ownerId: game.ownerId,
    isOver: game.isOver,
    showRoundIndicator: game.showRoundIndicator,
    showRunningTotals: game.showRunningTotals,
    finishedAt: game.finishedAt?.toISOString() ?? null,
    raceSkipped: game.raceSkipped,
    serverTime: new Date().toISOString(),
    phase: game.isOver
      ? "game-over"
      : current.isOver
        ? "round-over"
        : "playing",
    currentRound: {
      id: current.id,
      position: current.position,
      question: current.question,
      answer: current.isOver ? current.answer : 0,
      isOver: current.isOver,
      finishedAt: current.finishedAt?.toISOString() ?? null,
      raceSkipped: current.raceSkipped,
    },
    totalRounds: game.showRoundIndicator ? allRounds.length : null,
  };
}

export async function getNonHostGame({
  id,
  tx = db,
}: {
  id: string;
  tx?: Transactable;
}): Promise<NonHostGame | null> {
  const game = await tx.query.games.findFirst({
    where: (games) => eq(games.id, id),
  });
  return await loadNonHostGame(game, tx);
}

export async function getGameBySlug({
  slug,
  tx = db,
}: {
  slug: string;
  tx?: Transactable;
}): Promise<NonHostGame | null> {
  const game = await tx.query.games.findFirst({
    where: (games) => eq(games.slug, slug),
  });
  return await loadNonHostGame(game, tx);
}

export async function editGameSettings({
  game,
  data,
}: {
  game: Game;
  data: { showRoundIndicator?: boolean; showRunningTotals?: boolean };
}) {
  await withLockedGame(game.id, async (tx) => {
    await tx.update(games).set(data).where(eq(games.id, game.id));
  });
}

export async function addRound({
  game,
  round,
}: {
  game: Game;
  round: RoundInput;
}) {
  await withLockedGame(game.id, async (tx, game) => {
    requireGameInProgress(game);
    const existing = await getRoundsForGame(game.id, tx);
    await tx.insert(rounds).values({
      gameId: game.id,
      position: existing.length,
      question: round.question,
      answer: round.answer,
    });
  });
}

async function requireRound(
  gameId: string,
  roundId: string,
  tx: Transactable,
): Promise<Round> {
  const round = await tx.query.rounds.findFirst({
    where: and(eq(rounds.id, roundId), eq(rounds.gameId, gameId)),
  });
  if (!round) {
    throw new HttpError(404, "Round not found");
  }
  return round;
}

export async function editRound({
  game,
  roundId,
  data,
}: {
  game: Game;
  roundId: string;
  data: Partial<RoundInput>;
}) {
  await withLockedGame(game.id, async (tx, game) => {
    requireGameInProgress(game);
    const round = await requireRound(game.id, roundId, tx);
    if (round.isOver) {
      throw new HttpError(409, "Finished rounds can't be edited");
    }
    await tx.update(rounds).set(data).where(eq(rounds.id, round.id));
  });
}

export async function deleteRound({
  game,
  roundId,
}: {
  game: Game;
  roundId: string;
}) {
  await withLockedGame(game.id, async (tx, game) => {
    requireGameInProgress(game);
    const round = await requireRound(game.id, roundId, tx);
    if (round.position <= game.currentRoundPosition) {
      throw new HttpError(409, "Only upcoming rounds can be deleted");
    }
    await tx.delete(rounds).where(eq(rounds.id, round.id));
    await tx
      .update(rounds)
      .set({ position: sql`${rounds.position} - 1` })
      .where(
        and(eq(rounds.gameId, game.id), gt(rounds.position, round.position)),
      );
  });
}

/** `roundIds` must be exactly the upcoming rounds, in their new order. */
export async function reorderUpcomingRounds({
  game,
  roundIds,
}: {
  game: Game;
  roundIds: string[];
}) {
  await withLockedGame(game.id, async (tx, game) => {
    requireGameInProgress(game);
    const upcoming = (await getRoundsForGame(game.id, tx)).filter(
      (round) => round.position > game.currentRoundPosition,
    );
    const sameSet =
      roundIds.length === upcoming.length &&
      new Set(roundIds).size === roundIds.length &&
      upcoming.every((round) => roundIds.includes(round.id));
    if (!sameSet) {
      throw new HttpError(
        409,
        "The order must list exactly the upcoming rounds",
      );
    }
    for (const [index, id] of roundIds.entries()) {
      await tx
        .update(rounds)
        .set({ position: game.currentRoundPosition + 1 + index })
        .where(eq(rounds.id, id));
    }
  });
}

async function getCurrentRound(game: Game, tx: Transactable): Promise<Round> {
  const round = await tx.query.rounds.findFirst({
    where: and(
      eq(rounds.gameId, game.id),
      eq(rounds.position, game.currentRoundPosition),
    ),
  });
  if (!round) {
    throw new Error(`Game ${game.id} has no round at its current position`);
  }
  return round;
}

export async function finishCurrentRound({ game }: { game: Game }) {
  await withLockedGame(game.id, async (tx, game) => {
    requireGameInProgress(game);
    const round = await getCurrentRound(game, tx);
    if (round.isOver) {
      throw new HttpError(409, "This round is already finished");
    }
    const [{ guessCount } = { guessCount: 0 }] = await tx
      .select({ guessCount: count() })
      .from(guesses)
      .where(eq(guesses.roundId, round.id));
    if (guessCount < MIN_GUESSES_TO_FINISH_ROUND) {
      throw new HttpError(
        409,
        `A round needs at least ${MIN_GUESSES_TO_FINISH_ROUND} guesses before it can be finished`,
      );
    }
    await tx
      .update(rounds)
      .set({ isOver: true, finishedAt: new Date() })
      .where(eq(rounds.id, round.id));
  });
}

export async function startNextRound({ game }: { game: Game }) {
  await withLockedGame(game.id, async (tx, game) => {
    requireGameInProgress(game);
    const round = await getCurrentRound(game, tx);
    if (!round.isOver) {
      throw new HttpError(409, "Finish the current round first");
    }
    const next = await tx.query.rounds.findFirst({
      where: and(
        eq(rounds.gameId, game.id),
        eq(rounds.position, game.currentRoundPosition + 1),
      ),
    });
    if (!next) {
      throw new HttpError(409, "There is no next round. Add one first");
    }
    await tx
      .update(games)
      .set({ currentRoundPosition: next.position })
      .where(eq(games.id, game.id));
  });
}

/** Ends the whole game. Only possible once the last round is finished. */
export async function finishGame({ game }: { game: Game }) {
  await withLockedGame(game.id, async (tx, game) => {
    requireGameInProgress(game);
    const round = await getCurrentRound(game, tx);
    const upcoming = await tx.query.rounds.findFirst({
      where: and(
        eq(rounds.gameId, game.id),
        gt(rounds.position, game.currentRoundPosition),
      ),
    });
    if (!round.isOver || upcoming) {
      throw new HttpError(
        409,
        "The game can only be finished after its last round is finished",
      );
    }
    await tx
      .update(games)
      .set({ isOver: true, finishedAt: new Date() })
      .where(eq(games.id, game.id));
  });
}

/**
 * Host-only: skips the results race that is currently showing (the grand
 * final once the game is over, otherwise the current round's). The flag is
 * shared, so every player's screen jumps to the podium.
 */
export async function skipRace({ game }: { game: Game }) {
  await withLockedGame(game.id, async (tx, game) => {
    if (game.isOver) {
      await tx
        .update(games)
        .set({ raceSkipped: true })
        .where(eq(games.id, game.id));
      return;
    }
    const round = await getCurrentRound(game, tx);
    if (!round.isOver) {
      throw new HttpError(409, "There's no race to skip yet");
    }
    await tx
      .update(rounds)
      .set({ raceSkipped: true })
      .where(eq(rounds.id, round.id));
  });
}

export async function createGuess({
  game,
  player,
  guess,
  tx = db,
}: {
  game: NonHostGame;
  player: Player;
  guess: number;
  tx?: Transactable;
}) {
  if (game.phase !== "playing") {
    throw new HttpError(409, "This round isn't accepting guesses");
  }
  const inserted = await tx
    .insert(guesses)
    .values({
      gameId: game.id,
      roundId: game.currentRound.id,
      playerId: player.id,
      guess,
    })
    .onConflictDoNothing()
    .returning({ id: guesses.id });
  if (inserted.length === 0) {
    throw new HttpError(409, "You've already guessed in this round");
  }
  void pusher.trigger(`game-${game.id}`, "new-guess", {});
}

/**
 * Everyone's guesses for every round so far. Other players' guesses are zeroed
 * while their round is still live; finished rounds are public.
 */
export async function getAllGuessesForGame({
  game,
  requestingPlayer,
  tx = db,
}: {
  game: NonHostGame;
  requestingPlayer: Player;
  tx?: Transactable;
}) {
  const isHost = game.ownerId === requestingPlayer.id;
  return await tx
    .select({
      created: guesses.created,
      guess: guesses.guess,
      playerId: guesses.playerId,
      roundId: guesses.roundId,
      roundIsOver: rounds.isOver,
    })
    .from(guesses)
    .innerJoin(rounds, eq(rounds.id, guesses.roundId))
    .where(eq(guesses.gameId, game.id))
    .orderBy(asc(guesses.created))
    .then((rows) =>
      rows.map(({ roundIsOver, ...guess }) => ({
        ...guess,
        guess:
          isHost || roundIsOver || guess.playerId === requestingPlayer.id
            ? guess.guess
            : 0,
      })),
    );
}

/**
 * Results and running totals, built only from finished rounds. Totals are
 * withheld mid-game when the host turned running totals off, and after the
 * last round until the game is over, so the final reveal stays a surprise.
 */
export async function getStandings({
  game,
  tx = db,
}: {
  game: NonHostGame;
  tx?: Transactable;
}): Promise<Standings> {
  const finishedRounds = await tx.query.rounds.findMany({
    where: and(eq(rounds.gameId, game.id), eq(rounds.isOver, true)),
    orderBy: [asc(rounds.position)],
  });
  const roundResults: RoundResult[] = [];
  for (const round of finishedRounds) {
    const roundGuesses = await tx.query.guesses.findMany({
      where: eq(guesses.roundId, round.id),
      columns: { playerId: true, guess: true },
    });
    roundResults.push({
      roundId: round.id,
      position: round.position,
      question: round.question,
      answer: round.answer,
      results: scoreRound(round.answer, roundGuesses),
    });
  }
  const upcoming = await tx.query.rounds.findFirst({
    where: and(
      eq(rounds.gameId, game.id),
      gt(rounds.position, game.currentRound.position),
    ),
    columns: { id: true },
  });
  const showTotals =
    game.isOver || (game.showRunningTotals && upcoming !== undefined);
  return {
    rounds: roundResults,
    totals: showTotals ? totalUp(roundResults) : [],
  };
}
