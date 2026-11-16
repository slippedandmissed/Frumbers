import Elysia, { t } from "elysia";
import { requirePlayer, requirePlayerGuard } from "../core/player";
import {
  addRound,
  createGame,
  createGuess,
  deleteRound,
  editGameSettings,
  editRound,
  finishCurrentRound,
  finishGame,
  getAllGuessesForGame,
  getGame,
  getGameBySlug,
  getNonHostGame,
  getRounds,
  getStandings,
  NonHostGame,
  reorderUpcomingRounds,
  startNextRound,
} from "../core/game";
import { Standings } from "../core/scoring";
import { Game, Round } from "../db/schema";
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
            rounds: body.rounds,
            showRoundIndicator: body.showRoundIndicator ?? true,
          });
        },
        {
          body: t.Object({
            rounds: t.Array(
              t.Object({ question: t.String(), answer: t.Number() }),
              { minItems: 1 },
            ),
            showRoundIndicator: t.Optional(t.Boolean()),
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
                      roundId: t.String(),
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
          .get(
            "/standings",
            async ({ nonHostGame }) => getStandings({ game: nonHostGame }),
            {
              response: Standings,
            },
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
              .get(
                "/",
                async ({ game }) => ({
                  game,
                  rounds: await getRounds({ game }),
                }),
                {
                  response: t.Object({
                    game: Game,
                    rounds: t.Array(Round),
                  }),
                },
              )
              .patch(
                "/",
                async ({ game, body }) => {
                  await editGameSettings({ game, data: body });
                  return "Ok";
                },
                {
                  body: t.Object({
                    showRoundIndicator: t.Optional(t.Boolean()),
                  }),
                  response: t.String(),
                },
              )
              .post(
                "/finish",
                async ({ game }) => {
                  await finishGame({ game });
                  return "Ok";
                },
                { response: t.String() },
              )
              .group("/rounds", (app) =>
                app
                  .post(
                    "/",
                    async ({ game, body }) => {
                      await addRound({ game, round: body });
                      return "Ok";
                    },
                    {
                      body: t.Object({
                        question: t.String(),
                        answer: t.Number(),
                      }),
                      response: t.String(),
                    },
                  )
                  .put(
                    "/order",
                    async ({ game, body }) => {
                      await reorderUpcomingRounds({
                        game,
                        roundIds: body.roundIds,
                      });
                      return "Ok";
                    },
                    {
                      body: t.Object({ roundIds: t.Array(t.String()) }),
                      response: t.String(),
                    },
                  )
                  .post(
                    "/current/finish",
                    async ({ game }) => {
                      await finishCurrentRound({ game });
                      return "Ok";
                    },
                    { response: t.String() },
                  )
                  .post(
                    "/next",
                    async ({ game }) => {
                      await startNextRound({ game });
                      return "Ok";
                    },
                    { response: t.String() },
                  )
                  .patch(
                    "/:roundId",
                    async ({ game, params: { roundId }, body }) => {
                      await editRound({ game, roundId, data: body });
                      return "Ok";
                    },
                    {
                      body: t.Partial(
                        t.Object({ question: t.String(), answer: t.Number() }),
                      ),
                      response: t.String(),
                    },
                  )
                  .delete(
                    "/:roundId",
                    async ({ game, params: { roundId } }) => {
                      await deleteRound({ game, roundId });
                      return "Ok";
                    },
                    { response: t.String() },
                  ),
              ),
          ),
      ),
);
