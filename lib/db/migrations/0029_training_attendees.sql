CREATE TYPE "public"."training_attendance" AS ENUM('PENDING', 'PRESENT', 'ABSENT');--> statement-breakpoint
CREATE TABLE "training_attendees" (
	"training_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attendance" "training_attendance" DEFAULT 'PENDING' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_on" date,
	"certificate_no" varchar(100),
	"certificate_file_url" text,
	"certificate_file_name" varchar(255),
	"added_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "training_attendees_training_id_user_id_pk" PRIMARY KEY("training_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "training_attendees" ADD CONSTRAINT "training_attendees_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_attendees" ADD CONSTRAINT "training_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_attendees" ADD CONSTRAINT "training_attendees_added_by_id_users_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_attendees_user_idx" ON "training_attendees" USING btree ("user_id");