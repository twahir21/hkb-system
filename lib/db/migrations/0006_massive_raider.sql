CREATE TYPE "public"."coverage_request_status" AS ENUM('NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "coverage_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"service" varchar(150) NOT NULL,
	"message" text NOT NULL,
	"source" varchar(100) DEFAULT 'website-contacts-page' NOT NULL,
	"status" "coverage_request_status" DEFAULT 'NEW' NOT NULL,
	"internal_notes" text,
	"handled_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "coverage_requests_last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coverage_requests_status_idx" ON "coverage_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coverage_requests_created_at_idx" ON "coverage_requests" USING btree ("created_at");