import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listUsers } from "@/modules/hr/queries/users";
import { UserManager } from "@/modules/hr/components/UserManager";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "USER_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to manage user accounts. Only Super Administrators can manage system access.
      </div>
    );
  }

  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Accounts &amp; Access Control</h2>
        <p className="mt-1 text-sm text-slate-500">
          Authorize and register system users, set roles, and manage credentials. Only users registered here can sign in.
        </p>
      </div>
      <UserManager users={users} currentUserId={user.userId} />
    </div>
  );
}
