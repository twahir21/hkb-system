"use client";

import { useEffect } from "react";

/** Clears the sidebar "new coverage requests" badge for the current viewer. */
export function MarkCoverageSeen() {
  useEffect(() => {
    void fetch("/api/coverage-seen", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}