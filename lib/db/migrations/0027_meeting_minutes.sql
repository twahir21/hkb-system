ALTER TABLE "meetings" ADD COLUMN "minutes_text" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "minutes_file_url" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "minutes_file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "minutes_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "minutes_updated_by_id" uuid;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_minutes_updated_by_id_users_id_fk" FOREIGN KEY ("minutes_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;