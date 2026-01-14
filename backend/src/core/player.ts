import { eq } from "drizzle-orm";
import { db, type Transactable } from "../db/db";
import { Player, players } from "../db/schema";
import randomName from "node-random-name";
import { v4 as uuidv4 } from "uuid";
import Elysia, { t } from "elysia";
import { HttpError } from "../errors/http_error";
import { pusher } from "../pusher";

export async function register({
  tx = db,
}: {
  tx?: Transactable;
} = {}): Promise<Player> {
  const name = randomName();
  const pin = uuidv4().replaceAll("-", "");
  return await tx
    .insert(players)
    .values({
      name,
      pin,
    })
    .returning()
    .then((res) => res[0]!);
}

export async function getPlayer({
  playerId,
  tx = db,
}: {
  playerId: string;
  tx?: Transactable;
}): Promise<Player | null> {
  return await tx.query.players
    .findFirst({
      where: (players) => eq(players.id, playerId),
    })
    .then((res) => res ?? null);
}

export async function setPlayerName({
  player,
  name,
  tx = db,
}: {
  player: Player;
  name: string;
  tx?: Transactable;
}) {
  await tx.update(players).set({ name }).where(eq(players.id, player.id));
  pusher.trigger(`player-${player.id}`, "name-updated", { name });
}

export const PLAYER_ID_HEADER = "x-frumbers-player-id";
export const PLAYER_PIN_HEADER = "x-frumbers-player-pin";

export const requirePlayerGuard = {
  headers: t.Object({
    [PLAYER_ID_HEADER]: t.String(),
    [PLAYER_PIN_HEADER]: t.String(),
  }),
  response: {
    401: t.String(),
  },
} as const;

export const requirePlayer = new Elysia({
  name: "requirePlayer",
})
  .resolve(
    { as: "global" },
    async ({ headers }): Promise<{ player: Player | null }> => {
      return await db.transaction(async (tx) => {
        const playerId = headers[PLAYER_ID_HEADER.toLowerCase()];
        const playerPin = headers[PLAYER_PIN_HEADER.toLowerCase()];

        if (!playerId || !playerPin) {
          return { player: null };
        }

        const player = await getPlayer({ playerId, tx });
        if (!player || player.pin !== playerPin) {
          return { player: null };
        }

        return { player };
      });
    },
  )
  .onBeforeHandle({ as: "global" }, async ({ player }) => {
    if (!player) {
      throw new HttpError(401, "Unauthorized");
    }
  })
  .resolve({ as: "global" }, ({ player }): { player: Player } => {
    return { player: player! };
  });
