ALTER TABLE "guard_profiles" ADD COLUMN "station_id" uuid;--> statement-breakpoint
ALTER TABLE "guard_profiles" ADD CONSTRAINT "guard_profiles_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Backfill: link legacy guards to stations by matching work_location text
-- against "<station> — <region>" or a bare station name (case-insensitive).
UPDATE "guard_profiles" gp
SET "station_id" = s."id",
    "work_location" = s."name" || ' — ' || r."name"
FROM "stations" s
JOIN "regions" r ON r."id" = s."region_id"
WHERE gp."station_id" IS NULL
  AND (
    LOWER(gp."work_location") = LOWER(s."name" || ' — ' || r."name")
    OR LOWER(gp."work_location") = LOWER(s."name")
  );