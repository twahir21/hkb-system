"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  ArrowLeftRight,
  FileText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/db/schema";
import { ROLE_LABELS } from "@/lib/auth/rbac";

type NavItem = { href: string; label: string; icon: LucideIcon; roles: Role[] };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operate",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["SUPER_ADMIN", "SENIOR_SUPERVISOR", "SUPERVISOR", "HR", "BURSAR", "GUARD"],
      },
      {
        href: "/attendance",
        label: "Shift Sheet",
        icon: ClipboardCheck,
        roles: ["SUPER_ADMIN", "SENIOR_SUPERVISOR", "SUPERVISOR", "HR", "BURSAR"],
      },
      {
        href: "/records",
        label: "Attendance Records",
        icon: FileText,
        roles: ["SUPER_ADMIN", "SENIOR_SUPERVISOR", "SUPERVISOR", "HR", "BURSAR", "GUARD"],
      },
    ],
  },
  {
    title: "Manage",
    items: [
      {
        href: "/transfers",
        label: "Transfers",
        icon: ArrowLeftRight,
        roles: ["SUPER_ADMIN", "SENIOR_SUPERVISOR", "SUPERVISOR", "HR"],
      },
      {
        href: "/guards",
        label: "Guard Registry",
        icon: Users,
        roles: ["SUPER_ADMIN", "HR"],
      },
      {
        href: "/reports",
        label: "Reports",
        icon: ShieldCheck,
        roles: ["SUPER_ADMIN", "SENIOR_SUPERVISOR", "HR", "BURSAR"],
      },
    ],
  },
];

export function Sidebar({ role, name, email }: { role: Role; name: string; email: string }) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          HKB
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-900">Attendance System</p>
          <p className="text-[11px] text-slate-400">Protection & Management Co.</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        <p className="truncate text-xs text-slate-400">
          {ROLE_LABELS[role]} · {email}
        </p>
      </div>
    </aside>
  );
}