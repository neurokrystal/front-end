CREATE TABLE "report_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"report_type" text NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"template_json" jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"thumbnail_url" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
