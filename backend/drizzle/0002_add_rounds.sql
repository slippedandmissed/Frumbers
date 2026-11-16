CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created" timestamp DEFAULT now() NOT NULL,
	"game_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question" text NOT NULL,
	"answer" numeric NOT NULL,
	"is_over" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "current_round_position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "show_round_indicator" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "guesses" ADD COLUMN "round_id" uuid;--> statement-breakpoint
-- Backfill: each existing game becomes a one-round game.
INSERT INTO "rounds" ("game_id", "position", "question", "answer", "is_over", "created")
SELECT "id", 0, "question", "answer", "is_over", "created" FROM "games";--> statement-breakpoint
UPDATE "guesses" SET "round_id" = "rounds"."id" FROM "rounds" WHERE "rounds"."game_id" = "guesses"."game_id";--> statement-breakpoint
-- Guesses were never constrained, so keep only each player's first guess per round.
DELETE FROM "guesses" a USING "guesses" b WHERE a."round_id" = b."round_id" AND a."player_id" = b."player_id" AND (a."created", a."id") > (b."created", b."id");--> statement-breakpoint
ALTER TABLE "guesses" ALTER COLUMN "round_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_round_player_unique" UNIQUE("round_id","player_id");