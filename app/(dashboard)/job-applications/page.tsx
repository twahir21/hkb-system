import { t } from "@/lib/i18n";
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
        {t.denied.jobs}
      </div>
    );
  }

  const canManage = hasPermission(user.role, "JOB_APPLICATIONS_MANAGE");
  const applications = await listJobApplications();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t.jobsPage.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {canManage
            ? t.jobsPage.subtitleManage
            : t.jobsPage.subtitleRead}
        </p>
      </div>
      <JobApplicationsView applications={applications} canManage={canManage} />
    </div>
  );
}
