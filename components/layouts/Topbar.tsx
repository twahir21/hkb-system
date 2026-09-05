import { LogOut, Menu } from "lucide-react";
import { logout } from "@/app/actions/auth.actions";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { Role } from "@/lib/db/schema";

export function Topbar({
  name,
  role,
  onMenuToggle,
}: {
  name: string;
  role: Role;
  onMenuToggle?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-slate-900">HKB Attendance</h1>
          <p className="truncate text-xs text-slate-400 sm:hidden">{ROLE_LABELS[role]}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-800">{name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[role]}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}