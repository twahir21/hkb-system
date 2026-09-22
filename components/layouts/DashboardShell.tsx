"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AutoPrintModal } from "./AutoPrintModal";
import type { Role } from "@/lib/db/schema";

export function DashboardShell({
  role,
  name,
  email,
  newCoverageCount = 0,
  children,
}: {
  role: Role;
  name: string;
  email: string;
  newCoverageCount?: number;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [autoPrintOpen, setAutoPrintOpen] = useState(false);

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
        newCoverageCount={newCoverageCount}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onAutoPrintOpen={() => setAutoPrintOpen(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={name}
          role={role}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
          onAutoPrintOpen={() => setAutoPrintOpen(true)}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-x-auto">{children}</main>
      </div>
      <AutoPrintModal open={autoPrintOpen} onClose={() => setAutoPrintOpen(false)} />
    </div>
  );
}
