ALTER TABLE "job_applications" ALTER COLUMN "certificates_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "referees_url" DROP NOT NULL;--> statement-breakpoint
-- Mdhamini 1 / Mdhamini 2 documents. IF NOT EXISTS keeps this migration
-- re-runnable (a previous attempt stopped half-way on a live database).
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "mdhamini1_local_gov_url" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "mdhamini1_local_gov_url" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "mdhamini1_nida_url" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "mdhamini1_nida_url" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "mdhamini1_sponsor_url" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "mdhamini1_sponsor_url" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "mdhamini2_local_gov_url" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "mdhamini2_local_gov_url" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "mdhamini2_nida_url" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "mdhamini2_nida_url" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "mdhamini2_sponsor_url" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "mdhamini2_sponsor_url" DROP DEFAULT;
