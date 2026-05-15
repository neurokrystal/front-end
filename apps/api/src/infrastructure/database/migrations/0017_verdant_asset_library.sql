-- Assets table — non-destructive migration

CREATE TABLE IF NOT EXISTS "assets" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_extension" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "environment" text NOT NULL DEFAULT 'production',
  "storage_path" text NOT NULL,
  "public_url" text NOT NULL,
  "category" text,
  "uploaded_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
---> statement-breakpoint

-- If table already existed, add any missing columns without dropping data
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "filename" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "mime_type" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "file_extension" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "environment" text DEFAULT 'production';
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "storage_path" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "public_url" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "uploaded_by" text;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
---> statement-breakpoint

-- Add FK if not present (safe to run repeatedly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'assets'
      AND tc.constraint_name = 'assets_uploaded_by_user_id_fk'
  ) THEN
    ALTER TABLE "assets"
      ADD CONSTRAINT "assets_uploaded_by_user_id_fk"
      FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END$$;
---> statement-breakpoint

-- Indexes for searching
CREATE INDEX IF NOT EXISTS "assets_name_idx" ON "assets" ("name");
CREATE INDEX IF NOT EXISTS "assets_environment_idx" ON "assets" ("environment");
CREATE INDEX IF NOT EXISTS "assets_mime_type_idx" ON "assets" ("mime_type");
