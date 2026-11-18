CREATE TYPE "public"."incident_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'OPERATIONS_MANAGER' BEFORE 'SENIOR_SUPERVISOR';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'IN_CHARGE' BEFORE 'HR';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'OFFICE_ASSISTANT' BEFORE 'GUARD';--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_hq" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branches_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "incident_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"note" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"level" "incident_level" DEFAULT 'MEDIUM' NOT NULL,
	"status" "incident_status" DEFAULT 'OPEN' NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"station_id" uuid,
	"client_id" uuid,
	"branch_id" uuid,
	"reported_by_id" uuid NOT NULL,
	"resolved_by_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "in_charge_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "incident_actions" ADD CONSTRAINT "incident_actions_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_actions" ADD CONSTRAINT "incident_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incident_actions_incident_idx" ON "incident_actions" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "incidents_status_level_idx" ON "incidents" USING btree ("status","level");--> statement-breakpoint
CREATE INDEX "incidents_branch_idx" ON "incidents" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "incidents_occurred_at_idx" ON "incidents" USING btree ("occurred_at");--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_in_charge_id_users_id_fk" FOREIGN KEY ("in_charge_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Seed branches: HQ in Dar es Salaam plus remote branches Tabora and Dodoma.
INSERT INTO "branches" ("name", "is_hq") VALUES
	('Dar es Salaam (HQ)', true),
	('Tabora', false),
	('Dodoma', false)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
-- Existing staff and regions belong to HQ until reassigned.
UPDATE "users" SET "branch_id" = (SELECT "id" FROM "branches" WHERE "is_hq" = true LIMIT 1) WHERE "branch_id" IS NULL;--> statement-breakpoint
-- Regions named after a branch (e.g. "Tabora", "Dodoma") belong to that branch.
UPDATE "regions" r SET "branch_id" = b."id" FROM "branches" b WHERE r."branch_id" IS NULL AND lower(b."name") = lower(r."name");--> statement-breakpoint
UPDATE "regions" SET "branch_id" = (SELECT "id" FROM "branches" WHERE "is_hq" = true LIMIT 1) WHERE "branch_id" IS NULL;
