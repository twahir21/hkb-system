# Auto Print Button — Implementation Plan

## Goal
Add a global "Auto Print" button visible to all authenticated users that opens a modal with the print service code (tap-to-copy) and a direct link to the HKB HQ private printer service.

## Context
- App: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Current global authenticated UI: `DashboardShell` → `Topbar` + `Sidebar`
- Existing UI primitives: `Button`, `Modal` in `components/ui/`
- Icons: `lucide-react`
- Clipboard precedent: `app/access-denied/page.tsx` uses `navigator.clipboard.writeText`

## Decision
Place the button in `Topbar.tsx` (rightmost action group, next to Sign out). Wrap interactive logic in a new client component `components/ui/PrintButton.tsx` so `Topbar` does not need to become a client component.

## Changes

### 1. Create `components/ui/PrintButton.tsx`
- `"use client"`
- State: `open` (boolean), `copied` (boolean)
- Render:
  - Ghost/outline button with `Printer` icon, label "Auto Print" (hidden on small screens if needed)
  - `Modal` (existing component) containing:
    - Heading: "Auto Print"
    - Instruction paragraph: "Make sure you are connected to the HKB HQ office WiFi to print directly to the printer on the private network."
    - Code display block with `hkb-print-2026` and a copy button (using `navigator.clipboard.writeText`)
    - Primary action button: "Open Print Service" → `window.open("http://192.168.1.120:8686/send", "_blank")`
    - Close button (handled by Modal's X)

### 2. Modify `components/layouts/Topbar.tsx`
- Import `PrintButton` from `@/components/ui/PrintButton`
- Insert `<PrintButton />` inside the `flex items-center gap-3` container, before the logout form

## Notes
- No new API routes or server-side changes required.
- No role gating — visible to all authenticated users.
- The private IP (`192.168.1.120`) is only accessible on the HKB HQ LAN; the modal text instructs users to connect to the correct WiFi.

## Validation
- Run `bun run dev` and log in as any role.
- Confirm the button appears in the topbar on every authenticated page.
- Click the button → modal opens.
- Click "Copy Code" → clipboard contains `hkb-print-2026`.
- Click "Open Print Service" → new tab opens to `http://192.168.1.120:8686/send`.
