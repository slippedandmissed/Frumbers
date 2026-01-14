import Elysia, { t } from "elysia";
import {
  getPlayer,
  register,
  requirePlayer,
  requirePlayerGuard,
  setPlayerName,
} from "../core/player";
import { Player } from "../db/schema";
import { HttpError } from "../errors/http_error";

export default new Elysia({ prefix: "/player" })
  .post(
    "/register",
    async () => {
      const player = await register();
      return { player };
    },
    {
      response: t.Object({
        player: Player,
      }),
    },
  )
  .get(
    "/:playerId",
    async ({ params: { playerId } }) => {
      const player = await getPlayer({ playerId });
      if (!player) {
        throw new HttpError(404, "Player not found");
      }
      return { name: player.name };
    },
    {
      response: t.Object({
        name: t.String(),
      }),
    },
  )
  .group("/me", requirePlayerGuard, (app) =>
    app
      .use(requirePlayer)
      .get(
        "/name",
        ({ player }) => {
          return { name: player.name };
        },
        {
          response: t.Object({ name: t.String() }),
        },
      )
      .put(
        "/name",
        async ({ player, body }) => {
          setPlayerName({ player, name: body.name });
          return "Ok";
        },
        {
          body: t.Object({ name: t.String() }),
          response: t.String(),
        },
      ),
  );
