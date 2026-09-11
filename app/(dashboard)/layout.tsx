import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { countNewCoverageRequests } from "@/features/coverage/queries/coverage";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/layouts/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Notification badge: NEW coverage requests since the viewer last checked.
  let newCoverageCount = 0;
  if (hasPermission(user.role, "COVERAGE_VIEW")) {
    const row = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { coverageRequestsLastSeenAt: true },
    });
    newCoverageCount = await countNewCoverageRequests(row?.coverageRequestsLastSeenAt ?? null);
  }

  return (
    <DashboardShell
      role={user.role}
      name={user.name}
      email={user.email}
      newCoverageCount={newCoverageCount}
    >
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </DashboardShell>
  );
}