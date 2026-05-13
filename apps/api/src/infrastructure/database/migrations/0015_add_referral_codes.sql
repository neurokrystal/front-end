-- Migration to add referral_codes table
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

-- Foreign keys
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_reseller_user_id_user_id_fk" FOREIGN KEY ("reseller_user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_partner_org_id_partner_orgs_id_fk" FOREIGN KEY ("partner_org_id") REFERENCES "partner_orgs"("id") ON DELETE no action ON UPDATE no action;
