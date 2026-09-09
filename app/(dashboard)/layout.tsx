import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { countNewCoverageRequests } from "@/features/coverage/queries/coverage";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/layouts/Sidebar";
import { Topbar } from "@/components/layouts/Topbar";

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
    <div className="flex min-h-screen w-full">
      <Sidebar role={user.role} name={user.name} email={user.email} newCoverageCount={newCoverageCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name} role={user.role} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}