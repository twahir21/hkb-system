import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listJobApplications } from "@/features/jobs/queries/jobs";
import { JobApplicationsView } from "@/features/jobs/components/JobApplicationsView";

export default async function JobApplicationsPage() {
  const user = await getCurrentUser();
  const canView = hasPermission(user?.role, "JOB_APPLICATIONS_VIEW");

  if (!user || !canView) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view job applications.
      </div>
    );
  }

  const canManage = hasPermission(user.role, "JOB_APPLICATIONS_MANAGE");
  const applications = await listJobApplications();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Job Applications</h2>
        <p className="mt-1 text-sm text-slate-500">
          {canManage
            ? "Applications from the public /jobs page (guard recruitment). Review documents, update status, add internal notes or delete."
            : "Applications from the public /jobs page (read-only). Contact HR or the Super Admin for changes."}
        </p>
      </div>
      <JobApplicationsView applications={applications} canManage={canManage} />
    </div>
  );
}
