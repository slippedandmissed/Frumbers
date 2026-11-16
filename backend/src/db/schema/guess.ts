import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { games } from "./game";
import { players } from "./player";
import { rounds } from "./round";
import { createSelectSchema } from "drizzle-typebox";
import type { Static } from "elysia";
import { relations } from "drizzle-orm";
import { numericCasted } from "./numericCasted";

export const guesses = pgTable(
  "guesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    created: timestamp("created").notNull().defaultNow(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    guess: numericCasted("guess").notNull(),
  },
  (table) => [
    unique("guesses_round_player_unique").on(table.roundId, table.playerId),
  ],
);
export const Guess = createSelectSchema(guesses);
export type Guess = Static<typeof Guess>;
export const guessRelations = relations(guesses, ({ one }) => ({
  game: one(games, {
    fields: [guesses.gameId],
    references: [games.id],
  }),
  round: one(rounds, {
    fields: [guesses.roundId],
    references: [rounds.id],
  }),
  player: one(players, {
    fields: [guesses.playerId],
    references: [players.id],
  }),
}));
