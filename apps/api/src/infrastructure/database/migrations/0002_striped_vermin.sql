CREATE TYPE "public"."run_status" AS ENUM('in_progress', 'completed', 'abandoned', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."instrument_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."item_response_format" AS ENUM('likert_5', 'likert_7', 'binary', 'free_text');--> statement-breakpoint
CREATE TABLE "instrument_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"item_id" text NOT NULL,
	"response_value" integer,
	"response_text" text,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "run_item_unique" UNIQUE("run_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "instrument_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instrument_version_id" text NOT NULL,
	"status" "run_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"scored_profile_id" text,
	"consistency_score" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_items" (
	"id" text PRIMARY KEY NOT NULL,
	"instrument_version_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"item_text" text NOT NULL,
	"response_format" "item_response_format" DEFAULT 'likert_5' NOT NULL,
	"domain_tag" text,
	"dimension_tag" text,
	"state_tag" text,
	"config_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"instrument_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"item_count" integer NOT NULL,
	"scoring_strategy_key" text NOT NULL,
	"config_json" jsonb,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "instrument_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "instrument_responses" ADD CONSTRAINT "instrument_responses_run_id_instrument_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."instrument_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_responses" ADD CONSTRAINT "instrument_responses_item_id_instrument_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."instrument_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_runs" ADD CONSTRAINT "instrument_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_runs" ADD CONSTRAINT "instrument_runs_instrument_version_id_instrument_versions_id_fk" FOREIGN KEY ("instrument_version_id") REFERENCES "public"."instrument_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_items" ADD CONSTRAINT "instrument_items_instrument_version_id_instrument_versions_id_fk" FOREIGN KEY ("instrument_version_id") REFERENCES "public"."instrument_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_versions" ADD CONSTRAINT "instrument_versions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;