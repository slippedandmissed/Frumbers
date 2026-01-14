import { and, asc, eq } from "drizzle-orm";
import { db, type Transactable } from "../db/db";
import { games, Game, type Player, guesses } from "../db/schema";
import randomName from "@scaleway/random-name";
import type { Prettify } from "../prettify";
import { pusher } from "../pusher";
import { t, type Static } from "elysia";

export async function createGame({
  host,
  question,
  answer,
  tx = db,
}: {
  host: Player;
  question: string;
  answer: number;
  tx?: Transactable;
}): Promise<Game> {
  const slug = `${randomName()}-${randomName()}`;
  return await tx
    .insert(games)
    .values({ ownerId: host.id, slug, question, answer })
    .returning()
    .then((res) => res[0]!);
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

export const NonHostGame = t.Pick(Game, [
  "id",
  "question",
  "answer",
  "isOver",
  "ownerId",
]);
export type NonHostGame = Static<typeof NonHostGame>;

function redactGame(game: Game): NonHostGame {
  return {
    id: game.id,
    ownerId: game.ownerId,
    question: game.question,
    answer: game.isOver ? game.answer : 0,
    isOver: game.isOver,
  };
}

export async function getNonHostGame({
  id,
  tx = db,
}: {
  id: string;
  tx?: Transactable;
}): Promise<NonHostGame | null> {
  return await tx.query.games
    .findFirst({
      where: (games) => eq(games.id, id),
    })
    .then((res) => (res ? redactGame(res) : null));
}

export async function getGameBySlug({
  slug,
  tx = db,
}: {
  slug: string;
  tx?: Transactable;
}): Promise<NonHostGame | null> {
  return await tx.query.games
    .findFirst({
      where: (games) => eq(games.slug, slug),
    })
    .then((res) => (res ? redactGame(res) : null));
}

export async function editGame({
  game,
  data,
  tx = db,
}: {
  game: Game;
  data: Prettify<Partial<Pick<Game, "question" | "answer" | "isOver">>>;
  tx?: Transactable;
}) {
  await tx
    .update(games)
    .set({
      ...data,
    })
    .where(eq(games.id, game.id));
  void pusher.trigger(`game-${game.id}`, "game-updated", {});
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
  await tx.insert(guesses).values({
    gameId: game.id,
    playerId: player.id,
    guess,
  });
  void pusher.trigger(`game-${game.id}`, "new-guess", {});
}

export async function getAllGuessesForGame({
  game,
  requestingPlayer,
  tx = db,
}: {
  game: NonHostGame;
  requestingPlayer: Player;
  tx?: Transactable;
}) {
  const canSeeAllAnswers = game.isOver || game.ownerId === requestingPlayer.id;
  return await tx.query.guesses
    .findMany({
      where: eq(guesses.gameId, game.id),
      columns: {
        created: true,
        guess: true,
        playerId: true,
      },
      orderBy: (guesses) => [asc(guesses.created)],
    })
    .then((guesses) =>
      guesses.map((guess) => ({
        ...guess,
        guess:
          guess.playerId === requestingPlayer.id || canSeeAllAnswers
            ? guess.guess
            : 0,
      })),
    );
}
