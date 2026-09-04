import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listGuards, getSupervisors } from "@/features/hr/queries/guards";
import { GuardManager } from "@/features/hr/components/GuardManager";

export default async function GuardsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "GUARD_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to manage the guard registry.
      </div>
    );
  }

  const canPii = hasPermission(user.role, "PII_VIEW");
  const guards = await listGuards(canPii);
  const supervisors = await getSupervisors();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Guard Registry</h2>
        <p className="mt-1 text-sm text-slate-500">
          Register guards, manage profiles and supervisor assignments.
        </p>
      </div>
      <GuardManager
        guards={guards}
        supervisors={supervisors.map((s) => ({
          id: s.id,
          name: s.fullName,
          role: s.role,
        }))}
      />
    </div>
  );
}
