CREATE TYPE "public"."job_application_status" AS ENUM('NEW', 'IN_REVIEW', 'SHORTLISTED', 'HIRED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(255),
	"age" integer NOT NULL,
	"gender" "gender" NOT NULL,
	"residence" varchar(150) NOT NULL,
	"education_level" varchar(100) NOT NULL,
	"training" varchar(100) NOT NULL,
	"preferred_station" varchar(100) NOT NULL,
	"notes" text,
	"letter_url" text NOT NULL,
	"certificates_url" text NOT NULL,
	"cv_url" text NOT NULL,
	"referees_url" text NOT NULL,
	"health_url" text NOT NULL,
	"conduct_url" text NOT NULL,
	"source" varchar(100) DEFAULT 'jobs-page' NOT NULL,
	"status" "job_application_status" DEFAULT 'NEW' NOT NULL,
	"internal_notes" text,
	"handled_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_applications_status_idx" ON "job_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_applications_created_at_idx" ON "job_applications" USING btree ("created_at");