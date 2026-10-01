CREATE TYPE "public"."credit_status" AS ENUM('OUTSTANDING', 'DEDUCTED', 'WRITTEN_OFF');--> statement-breakpoint
CREATE TYPE "public"."credit_type" AS ENUM('FISH', 'MAIZE_FLOUR', 'MEDICAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('RESTOCK', 'TRANSPORT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."sale_type" AS ENUM('CASH', 'CREDIT_GUARD');--> statement-breakpoint
CREATE TABLE "business_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"date" date NOT NULL,
	"category" "expense_category" NOT NULL,
	"description" varchar(500) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"quantity" numeric(12, 2),
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"date" date NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"sale_type" "sale_type" DEFAULT 'CASH' NOT NULL,
	"guard_credit_id" uuid,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"unit" varchar(50) DEFAULT 'pcs' NOT NULL,
	"buy_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sell_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "guard_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guard_id" uuid NOT NULL,
	"type" "credit_type" NOT NULL,
	"description" varchar(500) NOT NULL,
	"quantity" numeric(12, 2),
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	"status" "credit_status" DEFAULT 'OUTSTANDING' NOT NULL,
	"deduction_month" varchar(7),
	"deducted_by" uuid,
	"deducted_at" timestamp,
	"notes" text,
	"document_url" text,
	"business_id" uuid,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_sales" ADD CONSTRAINT "business_sales_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_sales" ADD CONSTRAINT "business_sales_guard_credit_id_guard_credits_id_fk" FOREIGN KEY ("guard_credit_id") REFERENCES "public"."guard_credits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_sales" ADD CONSTRAINT "business_sales_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_stock" ADD CONSTRAINT "business_stock_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_credits" ADD CONSTRAINT "guard_credits_guard_id_guard_profiles_id_fk" FOREIGN KEY ("guard_id") REFERENCES "public"."guard_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_credits" ADD CONSTRAINT "guard_credits_deducted_by_users_id_fk" FOREIGN KEY ("deducted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_credits" ADD CONSTRAINT "guard_credits_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_credits" ADD CONSTRAINT "guard_credits_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_expenses_business_date_idx" ON "business_expenses" USING btree ("business_id","date");--> statement-breakpoint
CREATE INDEX "business_sales_business_date_idx" ON "business_sales" USING btree ("business_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "business_stock_business_unique" ON "business_stock" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "guard_credits_guard_status_idx" ON "guard_credits" USING btree ("guard_id","status");--> statement-breakpoint
CREATE INDEX "guard_credits_status_idx" ON "guard_credits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "guard_credits_deduction_month_idx" ON "guard_credits" USING btree ("deduction_month");