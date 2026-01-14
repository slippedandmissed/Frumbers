import Elysia, { t } from "elysia";
import { requirePlayer, requirePlayerGuard } from "../core/player";
import {
  createGame,
  createGuess,
  editGame,
  getAllGuessesForGame,
  getGame,
  getGameBySlug,
  getNonHostGame,
  NonHostGame,
} from "../core/game";
import { Game } from "../db/schema";
import { HttpError } from "../errors/http_error";

export default new Elysia({ prefix: "/game" }).guard(
  requirePlayerGuard,
  (app) =>
    app
      .use(requirePlayer)
      .post(
        "/",
        async ({ player, body }) => {
          return await createGame({
            host: player,
            question: body.question,
            answer: body.answer,
          });
        },
        {
          body: t.Object({
            question: t.String(),
            answer: t.Number(),
          }),
          response: Game,
        },
      )
      .get(
        "/gameId",
        async ({ query: { slug } }) => {
          const game = await getGameBySlug({ slug });
          if (!game) {
            throw new HttpError(404, "Game not found");
          }
          return { gameId: game.id };
        },
        {
          query: t.Object({
            slug: t.String(),
          }),
          response: t.Object({
            gameId: t.String(),
          }),
        },
      )
      .group("/:gameId", (app) =>
        app
          .resolve(
            async ({
              params: { gameId },
            }): Promise<{
              nonHostGame: NonHostGame | null;
            }> => {
              return { nonHostGame: await getNonHostGame({ id: gameId }) };
            },
          )
          .onBeforeHandle({ as: "global" }, async ({ nonHostGame }) => {
            if (!nonHostGame) {
              throw new HttpError(404, "Game not founds");
            }
          })
          .resolve({ as: "global" }, ({ nonHostGame }) => {
            return { nonHostGame: nonHostGame! };
          })
          .get(
            "/",
            async ({ nonHostGame }) => {
              return nonHostGame;
            },
            { response: NonHostGame },
          )
          .group("/guesses", (app) =>
            app
              .get(
                "/",
                async ({ nonHostGame, player }) => {
                  return await getAllGuessesForGame({
                    game: nonHostGame,
                    requestingPlayer: player,
                  }).then((guesses) =>
                    guesses.map((guess) => ({
                      ...guess,
                      created: guess.created.toISOString(),
                    })),
                  );
                },
                {
                  response: t.Array(
                    t.Object({
                      created: t.String(),
                      guess: t.Number(),
                      playerId: t.String(),
                    }),
                  ),
                },
              )
              .post(
                "/",
                async ({ nonHostGame, player, body }) => {
                  await createGuess({
                    game: nonHostGame,
                    player,
                    guess: body.guess,
                  });
                  return "Ok";
                },
                {
                  body: t.Object({
                    guess: t.Number(),
                  }),
                  response: t.String(),
                },
              ),
          )
          .group("/admin", (app) =>
            app
              .resolve(
                async ({
                  params: { gameId },
                  player,
                }): Promise<{
                  game: Game | null;
                }> => {
                  return { game: await getGame({ id: gameId, host: player }) };
                },
              )
              .onBeforeHandle({ as: "global" }, async ({ game }) => {
                if (!game) {
                  throw new HttpError(403, "Forbidden");
                }
              })
              .resolve({ as: "global" }, ({ game }) => {
                return { game: game! };
              })
              .get("/", ({ game }) => game, { response: Game })
              .patch(
                "/",
                async ({ game, body }) => {
                  await editGame({
                    game,
                    data: body,
                  });
                  return "Ok";
                },
                {
                  body: t.Partial(
                    t.Pick(Game, ["question", "answer", "isOver"]),
                  ),
                  response: t.String(),
                },
              ),
          ),
      ),
);
