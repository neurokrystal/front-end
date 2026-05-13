-- Migration to move data from consent_records to share_grants
INSERT INTO "share_grants" (
    "id",
    "subject_user_id",
    "target_type",
    "target_user_id",
    "resource_types",
    "status",
    "granted_at",
    "expires_at",
    "grant_context",
    "created_at"
)
SELECT
    "id",
    "subject_user_id",
    'user',
    "viewer_user_id",
    CASE 
        WHEN "report_type" IS NOT NULL THEN jsonb_build_array("report_type")
        ELSE '[]'::jsonb
    END,
    'active',
    "granted_at",
    "expires_at",
    "purpose",
    "created_at"
FROM "consent_records";

-- Rename the old table
ALTER TABLE "consent_records" RENAME TO "consent_records_deprecated";
