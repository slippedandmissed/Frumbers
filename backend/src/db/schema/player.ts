import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-typebox";
import type { Static } from "elysia";
import { games } from "./game";
import { guesses } from "./guess";

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  created: timestamp("created").notNull().defaultNow(),
  pin: text("pin").notNull(),
  name: text("name").notNull(),
});
export const Player = createSelectSchema(players);
export type Player = Static<typeof Player>;
export const playerRelations = relations(players, ({ many }) => ({
  games: many(games),
  guesses: many(guesses),
}));
