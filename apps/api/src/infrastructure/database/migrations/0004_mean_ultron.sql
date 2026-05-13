CREATE TYPE "public"."report_audience" AS ENUM('subject_facing', 'viewer_facing', 'aggregate');--> statement-breakpoint
CREATE TABLE "report_content_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"report_type" text NOT NULL,
	"section_key" text NOT NULL,
	"domain" text,
	"dimension" text,
	"score_band" text,
	"alignment_direction" text,
	"alignment_severity" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"content_text" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_content_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"report_type" text NOT NULL,
	"version_number" integer NOT NULL,
	"change_description" text,
	"published_by" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"report_type" text NOT NULL,
	"audience" "report_audience" NOT NULL,
	"subject_user_id" text NOT NULL,
	"viewer_user_id" text,
	"primary_scored_profile_id" text NOT NULL,
	"secondary_scored_profile_id" text,
	"content_version_id" text,
	"rendered_payload" jsonb,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_viewer_user_id_user_id_fk" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_primary_scored_profile_id_scored_profiles_id_fk" FOREIGN KEY ("primary_scored_profile_id") REFERENCES "public"."scored_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_secondary_scored_profile_id_scored_profiles_id_fk" FOREIGN KEY ("secondary_scored_profile_id") REFERENCES "public"."scored_profiles"("id") ON DELETE no action ON UPDATE no action;