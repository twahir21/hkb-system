import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listNews } from "@/features/news/queries/news";
import { NewsManager } from "@/features/news";

export default async function NewsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "NEWS_VIEW")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to manage news.
      </div>
    );
  }

  const canManage = hasPermission(user.role, "NEWS_MANAGE");
  const items = await listNews();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">News</h2>
        <p className="mt-1 text-sm text-slate-500">
          {canManage
            ? "Create, edit, publish or delete articles shown on the public website."
            : "Website articles (read-only). Contact the Super Admin for changes."}
        </p>
      </div>
      <NewsManager items={items} canManage={canManage} />
    </div>
  );
}
