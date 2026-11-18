CREATE TYPE "public"."training_status" AS ENUM('SCHEDULED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"trainer" varchar(200) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"venue" varchar(255) NOT NULL,
	"branch_id" uuid,
	"description" text,
	"status" "training_status" DEFAULT 'SCHEDULED' NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trainings_dates_idx" ON "trainings" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "trainings_branch_idx" ON "trainings" USING btree ("branch_id");