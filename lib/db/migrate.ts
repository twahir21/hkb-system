import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "./index";

async function main() {
  console.log("🚀 Applying database migrations...");
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  console.log("✅ All migrations applied successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  });
