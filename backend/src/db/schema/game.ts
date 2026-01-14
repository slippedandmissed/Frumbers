import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-typebox";
import type { Static } from "elysia";
import { players } from "./player";
import { guesses } from "./guess";
import { numericCasted } from "./numericCasted";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  created: timestamp("created").notNull().defaultNow(),
  slug: text("slug").notNull().unique(),
  question: text("question").notNull(),
  answer: numericCasted("answer").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  isOver: boolean("is_over").notNull().default(false),
});
export const Game = createSelectSchema(games);
export type Game = Static<typeof Game>;
export const gameRelations = relations(games, ({ many, one }) => ({
  players: many(players),
  owner: one(players, {
    fields: [games.ownerId],
    references: [players.id],
  }),
  guesses: many(guesses),
}));
