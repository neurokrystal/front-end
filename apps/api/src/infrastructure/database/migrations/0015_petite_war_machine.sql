ALTER TABLE "peer_shares" ALTER COLUMN "recipient_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_content_blocks" ADD COLUMN "secondary_score_band" text;--> statement-breakpoint
ALTER TABLE "peer_shares" ADD COLUMN "recipient_email" text;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_subject_user_id_idx" ON "audit_logs" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "instrument_runs_user_id_idx" ON "instrument_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "instrument_runs_status_idx" ON "instrument_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "team_memberships_team_id_idx" ON "team_memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_memberships_user_id_idx" ON "team_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_subject_user_id_idx" ON "reports" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scored_profiles_user_id_idx" ON "scored_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "share_grants_subject_user_id_idx" ON "share_grants" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "share_grants_target_user_id_idx" ON "share_grants" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "share_grants_target_team_id_idx" ON "share_grants" USING btree ("target_team_id");--> statement-breakpoint
CREATE INDEX "share_grants_status_idx" ON "share_grants" USING btree ("status");