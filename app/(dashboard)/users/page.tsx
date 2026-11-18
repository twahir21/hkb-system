import { t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listUsers } from "@/features/hr/queries/users";
import { UserManager } from "@/features/hr/components/UserManager";
import { listBranches } from "@/features/branches/queries/branches";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "USER_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        {t.denied.users}
      </div>
    );
  }

  const [users, branches] = await Promise.all([listUsers(), listBranches()]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {t.usersPage.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {t.usersPage.subtitle}
        </p>
      </div>
      <UserManager users={users} branches={branches} currentUserId={user.userId} />
    </div>
  );
}
