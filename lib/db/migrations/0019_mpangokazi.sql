CREATE TYPE "public"."work_plan_status" AS ENUM('PRESENT', 'OFF', 'PERMITTED', 'SICK', 'ABSENT');--> statement-breakpoint
CREATE TABLE "work_plan_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_plan_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"guard_id" uuid,
	"guard_name" varchar(255) NOT NULL,
	"point" varchar(255) NOT NULL,
	"status" "work_plan_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"branch_id" uuid,
	"prepared_by_id" uuid NOT NULL,
	"prepared_by_name" varchar(255) NOT NULL,
	"job_position" varchar(150) NOT NULL,
	"signature_data_url" text NOT NULL,
	"total_guards" integer NOT NULL,
	"present_count" integer NOT NULL,
	"off_count" integer NOT NULL,
	"permitted_count" integer NOT NULL,
	"sick_count" integer NOT NULL,
	"absent_count" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_plan_entries" ADD CONSTRAINT "work_plan_entries_work_plan_id_work_plans_id_fk" FOREIGN KEY ("work_plan_id") REFERENCES "public"."work_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_plan_entries" ADD CONSTRAINT "work_plan_entries_guard_id_guard_profiles_id_fk" FOREIGN KEY ("guard_id") REFERENCES "public"."guard_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_plans" ADD CONSTRAINT "work_plans_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_plans" ADD CONSTRAINT "work_plans_prepared_by_id_users_id_fk" FOREIGN KEY ("prepared_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_plan_entries_plan_idx" ON "work_plan_entries" USING btree ("work_plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_plans_preparer_date_unique" ON "work_plans" USING btree ("prepared_by_id","date");--> statement-breakpoint
CREATE INDEX "work_plans_date_branch_idx" ON "work_plans" USING btree ("date","branch_id");