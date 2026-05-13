CREATE TYPE "public"."share_grant_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."share_target_type" AS ENUM('user', 'team', 'organisation', 'coach', 'public');--> statement-breakpoint
CREATE TABLE "share_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_user_id" text NOT NULL,
	"target_type" "share_target_type" NOT NULL,
	"target_user_id" text,
	"target_team_id" text,
	"target_org_id" text,
	"resource_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "share_grant_status" DEFAULT 'active' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"grant_context" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_target_org_id_organization_id_fk" FOREIGN KEY ("target_org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;