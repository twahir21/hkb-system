"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  UserCog,
  ArrowLeftRight,
  FileText,
  ShieldCheck,
  CalendarCheck,
  Boxes,
  ScrollText,
  Package,
  MapPin,
  Building2,
  HandCoins,
  CalendarX,
  Store,
  Wallet,
  BellRing,
  Newspaper,
  UserCheck,
  Briefcase,
  Siren,
  Landmark,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/db/schema";
import { ROLE_LABELS, hasPermission, type Permission } from "@/lib/auth/rbac";
import { AutoPrintButton } from "./AutoPrintModal";

/** A link is shown when the role holds ANY of the listed permissions ("ALL" = every signed-in user). */
type NavItem = { href: string; label: string; icon: LucideIcon; anyOf: Permission[] | "ALL" };

function canSee(role: Role, item: NavItem) {
  return item.anyOf === "ALL" || item.anyOf.some((p) => hasPermission(role, p));
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operate",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        anyOf: "ALL",
      },
      {
        href: "/attendance",
        label: "Shift Sheet",
        icon: ClipboardCheck,
        anyOf: ["ATTENDANCE_VIEW_ALL"],
      },
      {
        href: "/staff-attendance",
        label: "Staff Attendance",
        icon: UserCheck,
        anyOf: ["STAFF_ATTENDANCE_VIEW"],
      },

      {
        href: "/records",
        label: "Attendance Records",
        icon: FileText,
        anyOf: ["ATTENDANCE_VIEW_ALL", "ATTENDANCE_VIEW_OWN"],
      },
      {
        href: "/mpangokazi",
        label: "Mpangokazi",
        icon: ClipboardList,
        anyOf: ["MPANGOKAZI_SUBMIT", "MPANGOKAZI_VIEW_ALL", "MPANGOKAZI_VIEW_BRANCH"],
      },
      {
        href: "/incidents",
        label: "Incidents",
        icon: Siren,
        anyOf: ["INCIDENT_REPORT", "INCIDENT_MANAGE_ALL", "INCIDENT_MANAGE_BRANCH"],
      },
      {
        href: "/my-summary",
        label: "My Summary",
        icon: CalendarCheck,
        anyOf: ["ATTENDANCE_VIEW_OWN"],
      },
    ],
  },
  {
    title: "Store",
    items: [
      {
        href: "/store",
        label: "Stock Holdings",
        icon: Boxes,
        anyOf: ["STOCK_VIEW"],
      },
      {
        href: "/store/ledger",
        label: "Stock Ledger",
        icon: ScrollText,
        anyOf: ["STOCK_VIEW"],
      },
      {
        href: "/store/transfers",
        label: "Stock Transfers",
        icon: ArrowLeftRight,
        anyOf: ["STOCK_TRANSFER_INITIATE", "STOCK_TRANSFER_APPROVE"],
      },
      {
        href: "/store/reports",
        label: "Stock Reports",
        icon: FileText,
        anyOf: ["STOCK_VIEW"],
      },
      {
        href: "/store/items",
        label: "Store Items",
        icon: Package,
        anyOf: ["STORE_MANAGE_ITEMS"],
      },
      {
        href: "/store/locations",
        label: "Regions & Stations",
        icon: MapPin,
        anyOf: ["STORE_LOCATIONS_MANAGE"],
      },
    ],
  },
  {
    title: "Office",
    items: [
      {
        href: "/office/credit",
        label: "Guard Debts",
        icon: HandCoins,
        anyOf: ["CREDIT_RECORD", "BUSINESS_VIEW"],
      },
      {
        href: "/office/credit/settlement",
        label: "Salary Deductions",
        icon: CalendarX,
        anyOf: ["CREDIT_SETTLE"],
      },
      {
        href: "/office/business",
        label: "Business Tracking",
        icon: Store,
        anyOf: ["BUSINESS_VIEW"],
      },
      {
        href: "/my-credits",
        label: "My Debts",
        icon: Wallet,
        anyOf: ["CREDIT_VIEW_OWN"],
      },
    ],
  },
  {
    title: "Manage",
    items: [
      {
        href: "/users",
        label: "User Accounts",
        icon: UserCog,
        anyOf: ["USER_MANAGE"],
      },
      {
        href: "/branches",
        label: "Branches",
        icon: Landmark,
        anyOf: ["BRANCH_MANAGE"],
      },
      {
        href: "/guards",
        label: "Guard Registry",
        icon: Users,
        anyOf: ["GUARD_MANAGE"],
      },
      {
        href: "/clients",
        label: "Clients",
        icon: Building2,
        anyOf: ["GUARD_MANAGE"],
      },
      {
        href: "/transfers",
        label: "Transfers",
        icon: ArrowLeftRight,
        anyOf: ["TRANSFER_INITIATE", "TRANSFER_APPROVE"],
      },
      {
        href: "/coverage-requests",
        label: "Coverage Requests",
        icon: BellRing,
        anyOf: ["COVERAGE_VIEW"],
      },
      {
        href: "/job-applications",
        label: "Job Applications",
        icon: Briefcase,
        anyOf: ["JOB_APPLICATIONS_VIEW"],
      },
      {
        href: "/news",
        label: "News",
        icon: Newspaper,
        anyOf: ["NEWS_VIEW"],
      },
      {
        href: "/reports",
        label: "Reports",
        icon: ShieldCheck,
        anyOf: ["REPORTS_FULL_PDF", "REPORTS_SUMMARY"],
      },
    ],
  },
];

export function Sidebar({
  role,
  name,
  email,
  mobileOpen = false,
  onMobileClose,
  newCoverageCount = 0,
  onAutoPrintOpen,
}: {
  role: Role;
  name: string;
  email: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  newCoverageCount?: number;
  onAutoPrintOpen?: () => void;
}) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => canSee(role, i)),
  })).filter((g) => g.items.length > 0);

  const nav = (onNavigate?: () => void) => (
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
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400")} />
                  {item.label}
                  {item.href === "/coverage-requests" && newCoverageCount > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                      {newCoverageCount > 99 ? "99+" : newCoverageCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const header = (
    <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-500/20 bg-slate-950 p-1 shadow-sm">
        <Image
          src="/logo.jpg"
          alt="HKB Logo"
          width={36}
          height={36}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-slate-900">HKB Attendance</p>
        <p className="text-[11px] text-slate-400">Protection &amp; Management</p>
      </div>
    </div>
  );

  const footer = (
    <div className="border-t border-slate-200 p-4 space-y-3">
      <AutoPrintButton variant="sidebar" onOpen={onAutoPrintOpen} />
      <div>
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        <p className="truncate text-xs text-slate-400">
          {ROLE_LABELS[role]} · {email}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {header}
        {nav()}
        {footer}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          onClick={onMobileClose}
          className={cn(
            "absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        />
        {/* Panel */}
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {header}
          {nav(onMobileClose)}
          {footer}
        </aside>
      </div>
    </>
  );
}