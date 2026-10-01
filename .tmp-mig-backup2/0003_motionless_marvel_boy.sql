DROP INDEX "attendance_logs_date_shift_idx";--> statement-breakpoint
CREATE INDEX "attendance_logs_date_shift_idx" ON "attendance_logs" USING btree ("date","shift");