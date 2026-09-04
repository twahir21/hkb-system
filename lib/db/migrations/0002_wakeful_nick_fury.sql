ALTER TYPE "public"."attendance_status" ADD VALUE 'LATE';--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD COLUMN "minutes_late" integer;