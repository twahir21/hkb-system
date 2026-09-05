/**
 * Database Seed Script
 * Run with: bun run db:seed  or  npm run db:seed
 *
 * Seeds a default SUPER_ADMIN user with hashed password credentials,
 * plus sample accounts for each RBAC role for testing.
 */
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db } from "./index";
import { users, type Role } from "./schema";

const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || "admin";
const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL || "admin@hkb.co").toLowerCase();
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "AdminPassword123!";
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || "System Administrator";

interface SeedAccount {
  username: string;
  email: string;
  fullName: string;
  role: Role;
  password: string;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    username: SUPERADMIN_USERNAME,
    email: SUPERADMIN_EMAIL,
    fullName: SUPERADMIN_NAME,
    role: "SUPER_ADMIN",
    password: SUPERADMIN_PASSWORD,
  },
  {
    username: "snr_supervisor",
    email: "snr.supervisor@hkb.co",
    fullName: "Senior Supervisor Alpha",
    role: "SENIOR_SUPERVISOR",
    password: "Password123!",
  },
  {
    username: "supervisor",
    email: "supervisor@hkb.co",
    fullName: "Supervisor Bravo",
    role: "SUPERVISOR",
    password: "Password123!",
  },
  {
    username: "hr",
    email: "hr@hkb.co",
    fullName: "HR Officer Charlie",
    role: "HR",
    password: "Password123!",
  },
  {
    username: "bursar",
    email: "bursar@hkb.co",
    fullName: "Finance Bursar Delta",
    role: "BURSAR",
    password: "Password123!",
  },
  {
    username: "storekeeper",
    email: "storekeeper@hkb.co",
    fullName: "Storekeeper Foxtrot",
    role: "STOREKEEPER",
    password: "Password123!",
  },
  {
    username: "guard",
    email: "guard@hkb.co",
    fullName: "Officer Echo",
    role: "GUARD",
    password: "Password123!",
  },
];

async function main() {
  console.log("\n🌱 Starting HKB Database Seed...\n");

  const results: { username: string; email: string; role: string; password: string; status: string }[] = [];

  for (const account of SEED_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 10);

    const existing = await db.query.users.findFirst({
      where: or(
        eq(users.username, account.username),
        eq(users.email, account.email)
      ),
    });

    if (!existing) {
      await db.insert(users).values({
        username: account.username,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
        passwordHash,
      });
      results.push({
        username: account.username,
        email: account.email,
        role: account.role,
        password: account.password,
        status: "CREATED",
      });
    } else {
      await db
        .update(users)
        .set({
          username: account.username,
          fullName: account.fullName,
          role: account.role,
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));

      results.push({
        username: account.username,
        email: account.email,
        role: account.role,
        password: account.password,
        status: "UPDATED",
      });
    }
  }

  // Also handle any additional comma-separated ADMIN_EMAILS in env
  const extraAdminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => Boolean(e) && e !== SUPERADMIN_EMAIL);

  for (const email of extraAdminEmails) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    const defaultPassword = "AdminPassword123!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");

    if (!existing) {
      await db.insert(users).values({
        username,
        email,
        fullName: email.split("@")[0],
        role: "SUPER_ADMIN",
        passwordHash,
      });
      results.push({
        username,
        email,
        role: "SUPER_ADMIN",
        password: defaultPassword,
        status: "CREATED (ENV)",
      });
    } else {
      await db
        .update(users)
        .set({ role: "SUPER_ADMIN", passwordHash })
        .where(eq(users.id, existing.id));
      results.push({
        username: existing.username ?? username,
        email,
        role: "SUPER_ADMIN",
        password: defaultPassword,
        status: "PROMOTED (ENV)",
      });
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("                     HKB SYSTEM SEED ACCOUNTS READY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.table(results);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ You can now sign in with either Username or Email and the corresponding password.\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
