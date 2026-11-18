CREATE TYPE "public"."contract_status" AS ENUM('ACTIVE', 'ENDED', 'TERMINATED');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('PERMANENT', 'FIXED_TERM', 'PROBATION', 'CASUAL');--> statement-breakpoint
CREATE TYPE "public"."department" AS ENUM('IT', 'HR', 'ACCOUNTS', 'OPERATIONS', 'STORE', 'OFFICE', 'SECURITY');--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "contract_type" NOT NULL,
	"status" "contract_status" DEFAULT 'ACTIVE' NOT NULL,
	"position" varchar(150) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"monthly_salary" numeric(12, 2),
	"document_url" text,
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"employee_no" varchar(50),
	"department" "department" NOT NULL,
	"job_title" varchar(150) NOT NULL,
	"hire_date" date,
	"phone" varchar(20),
	"nida_no" varchar(30),
	"address" varchar(255),
	"kin_name" varchar(255),
	"kin_phone" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employee_profiles_employee_no_unique" UNIQUE("employee_no")
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_user_idx" ON "contracts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contracts_status_end_idx" ON "contracts" USING btree ("status","end_date");