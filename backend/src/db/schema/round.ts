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
import { games } from "./game";
import { guesses } from "./guess";
import { numericCasted } from "./numericCasted";

export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  created: timestamp("created").notNull().defaultNow(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  // Zero-based. Finished rounds always occupy the lowest positions.
  position: integer("position").notNull(),
  question: text("question").notNull(),
  answer: numericCasted("answer").notNull(),
  isOver: boolean("is_over").notNull().default(false),
});
export const Round = createSelectSchema(rounds);
export type Round = Static<typeof Round>;
export const roundRelations = relations(rounds, ({ many, one }) => ({
  game: one(games, {
    fields: [rounds.gameId],
    references: [games.id],
  }),
  guesses: many(guesses),
}));
