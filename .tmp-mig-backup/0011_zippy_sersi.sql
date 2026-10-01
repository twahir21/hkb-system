CREATE TABLE "staff_attendance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" NOT NULL,
	"check_in_time" varchar(20),
	"absence_category" "absence_category",
	"allowed_days" integer,
	"minutes_late" integer,
	"reason" text,
	"document_url" text,
	"recorded_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_attendance_logs" ADD CONSTRAINT "staff_attendance_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance_logs" ADD CONSTRAINT "staff_attendance_logs_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_attendance_logs_user_date_unique" ON "staff_attendance_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "staff_attendance_logs_date_idx" ON "staff_attendance_logs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "staff_attendance_logs_user_idx" ON "staff_attendance_logs" USING btree ("user_id");