import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-typebox";
import type { Static } from "elysia";
import { players } from "./player";
import { guesses } from "./guess";
import { rounds } from "./round";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  created: timestamp("created").notNull().defaultNow(),
  slug: text("slug").notNull().unique(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  // Whole game finished (individual rounds have their own isOver).
  isOver: boolean("is_over").notNull().default(false),
  currentRoundPosition: integer("current_round_position").notNull().default(0),
  showRoundIndicator: boolean("show_round_indicator").notNull().default(true),
});
export const Game = createSelectSchema(games);
export type Game = Static<typeof Game>;
export const gameRelations = relations(games, ({ many, one }) => ({
  players: many(players),
  owner: one(players, {
    fields: [games.ownerId],
    references: [players.id],
  }),
  rounds: many(rounds),
  guesses: many(guesses),
}));
