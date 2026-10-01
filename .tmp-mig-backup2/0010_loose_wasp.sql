CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
ALTER TABLE "guard_profiles" ADD COLUMN "gender" "gender" DEFAULT 'MALE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" "gender" DEFAULT 'MALE' NOT NULL;