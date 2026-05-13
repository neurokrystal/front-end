CREATE TYPE "public"."certification_status" AS ENUM('active', 'lapsed', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."coach_client_link_status" AS ENUM('active', 'paused', 'ended', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."referral_attribution_type" AS ENUM('first_purchase', 'twelve_month_window', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."programme_enrolment_status" AS ENUM('enrolled', 'in_progress', 'completed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."programme_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."peer_share_direction" AS ENUM('one_way', 'mutual');--> statement-breakpoint
CREATE TYPE "public"."peer_share_status" AS ENUM('pending', 'active', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "certification_records" (
	"id" text PRIMARY KEY NOT NULL,
	"coach_user_id" text NOT NULL,
	"programme_name" text NOT NULL,
	"status" "certification_status" DEFAULT 'active' NOT NULL,
	"certified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"qualifying_assessment_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_client_links" (
	"id" text PRIMARY KEY NOT NULL,
	"coach_user_id" text NOT NULL,
	"client_user_id" text NOT NULL,
	"status" "coach_client_link_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaching_firm_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'coach' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coaching_firms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"firm_admin_user_id" text NOT NULL,
	"billing_email" text,
	"config_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_orgs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"admin_user_id" text NOT NULL,
	"commission_rate_bps" integer DEFAULT 1000 NOT NULL,
	"billing_email" text,
	"config_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_attributions" (
	"id" text PRIMARY KEY NOT NULL,
	"reseller_user_id" text NOT NULL,
	"partner_org_id" text,
	"purchase_id" text NOT NULL,
	"attribution_type" "referral_attribution_type" DEFAULT 'first_purchase' NOT NULL,
	"referral_code" text,
	"commission_amount_cents" integer,
	"commission_paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_enrolments" (
	"id" text PRIMARY KEY NOT NULL,
	"programme_id" text NOT NULL,
	"user_id" text,
	"team_id" text,
	"status" "programme_enrolment_status" DEFAULT 'enrolled' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"progress_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_domain" text,
	"status" "programme_status" DEFAULT 'draft' NOT NULL,
	"duration_weeks" integer,
	"modules_json" jsonb,
	"config_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"initiator_user_id" text NOT NULL,
	"recipient_user_id" text NOT NULL,
	"direction" "peer_share_direction" DEFAULT 'one_way' NOT NULL,
	"status" "peer_share_status" DEFAULT 'pending' NOT NULL,
	"invite_token" text,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peer_shares_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "certification_records" ADD CONSTRAINT "certification_records_coach_user_id_user_id_fk" FOREIGN KEY ("coach_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_client_links" ADD CONSTRAINT "coach_client_links_coach_user_id_user_id_fk" FOREIGN KEY ("coach_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_client_links" ADD CONSTRAINT "coach_client_links_client_user_id_user_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_firm_memberships" ADD CONSTRAINT "coaching_firm_memberships_firm_id_coaching_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."coaching_firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_firm_memberships" ADD CONSTRAINT "coaching_firm_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_firms" ADD CONSTRAINT "coaching_firms_firm_admin_user_id_user_id_fk" FOREIGN KEY ("firm_admin_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_orgs" ADD CONSTRAINT "partner_orgs_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_reseller_user_id_user_id_fk" FOREIGN KEY ("reseller_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_partner_org_id_partner_orgs_id_fk" FOREIGN KEY ("partner_org_id") REFERENCES "public"."partner_orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_enrolments" ADD CONSTRAINT "programme_enrolments_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_enrolments" ADD CONSTRAINT "programme_enrolments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_enrolments" ADD CONSTRAINT "programme_enrolments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_shares" ADD CONSTRAINT "peer_shares_initiator_user_id_user_id_fk" FOREIGN KEY ("initiator_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_shares" ADD CONSTRAINT "peer_shares_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_shares" ADD CONSTRAINT "peer_shares_revoked_by_user_id_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;