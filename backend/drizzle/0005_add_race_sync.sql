ALTER TABLE "games" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "race_skipped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "race_skipped" boolean DEFAULT false NOT NULL;