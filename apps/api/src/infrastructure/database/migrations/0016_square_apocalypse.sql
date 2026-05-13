ALTER TYPE "public"."coach_client_link_status" ADD VALUE 'pending' BEFORE 'active';--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"reseller_user_id" text NOT NULL,
	"partner_org_id" text,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "community_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tier" text DEFAULT 'standard' NOT NULL,
	"subscription_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "purchase_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."purchase_type";--> statement-breakpoint
CREATE TYPE "public"."purchase_type" AS ENUM('individual_assessment', 'org_seat_bundle', 'leader_adapted_report', 'professional_self', 'under_pressure', 'relationship_patterns', 'career_alignment', 'parenting_patterns', 'wellbeing', 'relational_compass', 'collaboration_compass', 'family_compass');--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "purchase_type" SET DATA TYPE "public"."purchase_type" USING "purchase_type"::"public"."purchase_type";--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "resource_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_client_links" ALTER COLUMN "client_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_client_links" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "coach_client_links" ADD COLUMN "client_email" text;--> statement-breakpoint
ALTER TABLE "coach_client_links" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "coach_client_links" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "instrument_runs" ADD COLUMN "rated_by_user_id" text;--> statement-breakpoint
ALTER TABLE "instrument_items" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "instrument_items" ADD COLUMN "category_tag" text;--> statement-breakpoint
ALTER TABLE "instrument_items" ADD COLUMN "score_group_tag" text;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_reseller_user_id_user_id_fk" FOREIGN KEY ("reseller_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_partner_org_id_partner_orgs_id_fk" FOREIGN KEY ("partner_org_id") REFERENCES "public"."partner_orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_runs" ADD CONSTRAINT "instrument_runs_rated_by_user_id_user_id_fk" FOREIGN KEY ("rated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;