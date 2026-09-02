/**
 * Optional bootstrap seed. Run with: bun run db:seed
 * Creates an allow-listed SUPER_ADMIN (from ADMIN_EMAILS) and a couple of
 * supervisors so the system is usable right after the first migration.
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  for (const email of ADMIN_EMAILS) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!existing) {
      await db.insert(users).values({
        googleId: "",
        email,
        fullName: email.split("@")[0],
        role: "SUPER_ADMIN",
      });
      console.log(`Seeded SUPER_ADMIN: ${email}`);
    } else if (existing.role !== "SUPER_ADMIN") {
      await db.update(users).set({ role: "SUPER_ADMIN" }).where(eq(users.id, existing.id));
      console.log(`Promoted ${email} to SUPER_ADMIN`);
    }
  }

  const existing = await db.select({ id: users.id }).from(users);
  if (existing.length === 0) {
    console.log("No users yet — create supervisors/via the Guard Registry UI after first login.");
  }
  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
