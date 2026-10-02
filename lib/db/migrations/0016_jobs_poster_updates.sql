ALTER TABLE "job_applications" ALTER COLUMN "training" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "preferred_station" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "passport_url" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "passport_url" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "local_gov_letter_url" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "local_gov_letter_url" DROP DEFAULT;