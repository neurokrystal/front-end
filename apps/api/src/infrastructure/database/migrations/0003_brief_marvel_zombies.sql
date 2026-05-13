CREATE TYPE "public"."alignment_direction" AS ENUM('masking_upward', 'masking_downward', 'aligned');--> statement-breakpoint
CREATE TYPE "public"."alignment_severity" AS ENUM('aligned', 'mild_divergence', 'significant_divergence', 'severe_divergence');--> statement-breakpoint
CREATE TYPE "public"."dimension_type" AS ENUM('self', 'others', 'past', 'future', 'senses', 'perception');--> statement-breakpoint
CREATE TYPE "public"."domain_type" AS ENUM('safety', 'challenge', 'play');--> statement-breakpoint
CREATE TYPE "public"."score_band" AS ENUM('very_low', 'low', 'almost_balanced', 'balanced', 'high_excessive');--> statement-breakpoint
CREATE TABLE "scored_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instrument_run_id" text NOT NULL,
	"scoring_strategy_key" text NOT NULL,
	"scoring_strategy_version" integer NOT NULL,
	"safety_band" text NOT NULL,
	"challenge_band" text NOT NULL,
	"play_band" text NOT NULL,
	"profile_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scored_profiles_instrument_run_id_unique" UNIQUE("instrument_run_id")
);
--> statement-breakpoint
ALTER TABLE "scored_profiles" ADD CONSTRAINT "scored_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scored_profiles" ADD CONSTRAINT "scored_profiles_instrument_run_id_instrument_runs_id_fk" FOREIGN KEY ("instrument_run_id") REFERENCES "public"."instrument_runs"("id") ON DELETE no action ON UPDATE no action;