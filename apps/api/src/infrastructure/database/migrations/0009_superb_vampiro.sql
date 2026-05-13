ALTER TABLE "reports" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "is_revoked";