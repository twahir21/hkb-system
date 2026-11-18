-- Tanga region is officially closed. Remove it only while it has no stations,
-- so no stations / stock history can be cascade-deleted with it.
DELETE FROM "regions" r
WHERE lower(r."name") = 'tanga'
  AND NOT EXISTS (SELECT 1 FROM "stations" s WHERE s."region_id" = r."id");
