"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { Role } from "@/lib/db/schema";

export function DashboardShell({
  role,
  name,
  email,
  children,
}: {
  role: Role;
  name: string;
  email: string;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex min-h-screen w-full bg-paper text-ink">
      <Sidebar
        role={role}
        name={name}
        email={email}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={name}
          role={role}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
