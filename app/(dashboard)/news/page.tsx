import { t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listNews } from "@/features/news/queries/news";
import { NewsManager } from "@/features/news";

export default async function NewsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "NEWS_VIEW")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        {t.denied.news}
      </div>
    );
  }

  const canManage = hasPermission(user.role, "NEWS_MANAGE");
  const items = await listNews();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t.newsPage.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {canManage
            ? t.newsPage.subtitleManage
            : t.newsPage.subtitleRead}
        </p>
      </div>
      <NewsManager items={items} canManage={canManage} />
    </div>
  );
}
