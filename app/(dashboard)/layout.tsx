import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { Sidebar } from "@/components/layouts/Sidebar";
import { Topbar } from "@/components/layouts/Topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar role={user.role} name={user.name} email={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name} role={user.role} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}