-- Migration to add secondary_score_band to report_content_blocks
ALTER TABLE "report_content_blocks" ADD COLUMN "secondary_score_band" text;
