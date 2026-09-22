ALTER TABLE "guard_profiles" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "guard_profiles" ADD COLUMN "disabled_at" timestamp;