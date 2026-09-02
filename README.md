# HKB Protection & Management Co. — Attendance Management System (AMS)

A centralized, shift-based attendance system for security operations. Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Auth.js (Google OAuth)**, **Drizzle ORM + Neon Postgres**, **Upstash Redis**, **Firebase Storage** and **React-PDF**.

This implementation follows the finalized blueprint in [`system.html`](./system.html) (SRS v1.1).

---

## Features

- **Google OAuth** for 100% of accounts; JWT sessions; DB-backed roles.
- **RBAC** across 6 roles (Super Admin, HR, Senior Supervisor, Supervisor, Bursar, Guard) per the SRS access matrix.
- **Per-shift (Day/Night) clock-in** — supervisors mark guards **Present** or **Absent**, with absence branching to **Sick** (doctor's note upload → Firebase), **Permitted Reason** (allowed days), or **Not Permitted** (payroll flag).
- **Guard registry** — employee ID, PII (kin, home), supervisor assignment (role-gated).
- **Transfers** — request → Redis event → Admin/HR approve/reject with reviewer notes + audit trail.
- **PDF reports** — strict, server-rendered via `@react-pdf/renderer`, streamed from `/api/reports/pdf` (Bursar / HR / Super Admin).
- **Audit logging** for every privileged mutation.

> Built on a custom Next.js 16 that renamed `middleware.ts` → `proxy.ts`. Auth gating lives in `proxy.ts` (lightweight) with **all real authorization re-verified server-side** in `lib/auth/dal.ts`.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Styling | Tailwind CSS v4 |
| Auth | Auth.js (`next-auth@beta`) + Google OAuth, JWT strategy |
| ORM / DB | Drizzle ORM + Neon Serverless Postgres |
| Validation | zod v4 |
| Cache / locks | Upstash Redis |
| Files | Firebase Admin Storage (sick-note uploads) |
| PDF | `@react-pdf/renderer` (server-side) |
| Icons | lucide-react |

---

## Getting started

```bash
bun install
cp .env.example .env   # then fill in real values
bun run db:generate    # generate migrations
bun run db:migrate     # apply migrations to Neon
bun run db:seed        # bootstrap SUPER_ADMIN from ADMIN_EMAILS
bun run dev
```

### Environment variables (`.env`)

| Variable | Required | Notes |
|---|---|---|
| `AUTH_SECRET` | ✅ | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ✅ | Google OAuth 2.0 credentials |
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional | rate limiting + shift locks (graceful if absent) |
| `FIREBASE_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` / `FIREBASE_STORAGE_BUCKET` | optional | sick-note uploads (graceful if absent) |
| `ADMIN_EMAILS` | optional | comma-separated; promoted to Super Admin on login/seed |
| `AUTH_URL` | optional | app base URL (defaults per deployment) |

---

## Scripts

```bash
bun run dev          # development server
bun run build        # production build
bun run start        # production server
bun run lint         # eslint
bun run db:generate  # create a new migration
bun run db:migrate   # apply migrations
bun run db:push      # push schema directly (dev)
bun run db:seed      # bootstrap admin
bun run db:studio    # Drizzle Studio (visualize data)
```

---

## Project structure (highlights)

```
app/
  proxy.ts                        # Next 16 auth gate (was middleware.ts)
  (dashboard)/                    # authenticated app shell
    dashboard/ attendance/ records/ guards/ transfers/ reports/
  api/
    auth/[...nextauth]/route.ts   # Auth.js handler
    reports/pdf/route.ts          # server-rendered PDF streaming
  actions/                        # Server Actions (attendance, guards, transfers)
  login/
components/
  ui/                             # Button, Card, Badge, DataTable, Modal
  attendance/ transfers/ guards/ records/ reports/
lib/
  auth/                           # auth config, dal.ts, rbac.ts, audit.ts
  db/                             # schema.ts, index.ts, migrations, seed.ts
  queries/                        # server-side reads (guards, attendance, transfers)
  redis/ storage/ pdf/ validators/ env.ts utils.ts
```

---

## Security model

- **Proxy** only blocks unauthenticated navigation (UX).
- **DAL** (`requirePermission`) re-checks on every Server Action / page render.
- PII (kin, home, contact) is returned masked unless the caller has `PII_VIEW`.
- Rate limiting + per-shift lock via Upstash Redis prevent duplicate clock-ins.
- All privileged writes append an `audit_logs` row.

## Roadmap notes

- Email notifications: `submitTransfer` publishes a `transfer-events` Redis message; wire a worker (e.g. Upstash Workflow) to send in-app/email alerts to Admin/HR.
- Mobile PWA shell can be layered on the existing responsive layout.

I have everything I need. Here is the complete design plan from UI to backend, grounded in the actual SRS (`system.html`) and the version-specific Next.js documentation bundled in this repo.

---

# HKB Attendance Management System — Design Plan

## 0. Current state & key constraints I verified

**Repo baseline (fresh scaffold):**
- Next.js **16.3.4** (App Router), React **19.2.8**, Tailwind **4** (`@tailwindcss/postcss`), TypeScript strict, bun 1.4.
- Only `next/react/react-dom` installed — **all infra deps are missing** and must be added.
- `.env` is present but empty; `/.gitignore` already ignores `.env*`.
- `package.json` scripts: `dev`, `build`, `start`, `lint`.

**Critical Next.js 16 breaking changes I confirmed from `node_modules/next/dist/docs/`** (the AGENTS.md warning is real — plan must respect these):
1. `middleware.ts` is **deprecated → renamed `proxy.ts`**; exports a function named `proxy` (or default), runs on the **Node.js runtime** (not Edge). `main` is the wrong name.
2. `cookies()` / `headers()` are **async — must be awaited** (`(await cookies())`).
3. **Server Actions** exist with the single-roundtrip model; use `<form action>`, `useActionState`, and `revalidatePath`/`updateTag`/`refresh`. Mutations should go through Server Actions, not bespoke client fetch wiring.
4. No-cache / dynamic rendering: data reads in Server Components with `cache()` memoization via a **Data Access Layer (DAL)** (as the bundled auth guide recommends).

The SRS spec (`Google OAuth`, 6 RBAC roles, per-shift attendance, Firebase doc upload, transfer approvals, PDF-only reports, Neon + Drizzle + Upstash + Firebase) is the functional contract I'm designing to.

---

## 1. Confirmed technology stack (to install)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.x (present) | App Router, RSC, Server Actions |
| UI | Tailwind v4 + TSX | Present; define `brand` palette from SRS header |
| Forms | React `useActionState` + Server Actions | Native, no client library needed |
| Auth | **Auth.js v5 (NextAuth v5)** — Google OAuth provider | Best fit for Next 16; or `oslo`/custom. Decision noted in §3 |
| ORM | **Drizzle ORM** + `drizzle-kit` | Matches SRS schema exactly |
| DB | Neon Serverless Postgres | via `DATABASE_URL` |
| Cache/rate-limit | **Upstash Redis** (`@upstash/redis`) | shift-session lock, rate limiting |
| Files | **Firebase Admin Storage** (`firebase-admin`) | sick-note PDFs |
| PDF | **`@react-pdf/renderer`** | server-side stream, per SRS §8 |
| Email/queue | **Upstash Workflow** or `resend` + a `transfer_requests` poll | SRS says "Redis queue event + email alert" |
| Validation | **`zod`** + Drizzle `createInsertSchema` | shared server/client types |
| Icons | `lucide-react` | matches SRS aesthetic |
| Env parsing | `@t3-oss/env-nextjs` / `zod` | fail fast on misconfig |

> No UI component library — the SRS is custom-tailwind styled. Keep it dependency-light.

---

## 2. Project folder structure

```
app/
  layout.tsx                 # root layout, fonts (Inter + JetBrains Mono), shell
  page.tsx                   # post-login role-aware landing / redirect
  globals.css                # tailwind v4 + @theme brand tokens
  login/page.tsx             # unauthenticated gate + Google sign-in
  (dashboard)/
    layout.tsx               # authenticated sidebar/topbar shell
    dashboard/page.tsx        # role-filtered overview cards
    attendance/
      page.tsx               # shift sheet grid (Day/Night, date picker)
      guards/page.tsx        # guard registry CRUD (admin/HR)
    records/
      page.tsx               # search/filter all attendance logs
    transfers/
      page.tsx               # initiate/approve/reject transfer flow
    reports/
      page.tsx               # report builder (PDF trigger)
    profile/[guardId]/page.tsx  # guard detail (PII gated)
  api/
    auth/[...nextauth]/route.ts   # NextAuth handler
    storage/upload/route.ts        # Firebase signed upload (server-only)
    reports/pdf/route.ts           # @react-pdf/renderer streaming
  proxy.ts                   # Next 16 auth gate (NOT middleware.ts)
  actions/                   # server actions (mutation layer)
    attendance.actions.ts
    transfers.actions.ts
    guards.actions.ts
    reports.actions.ts
  components/
    ui/                     # Button, Card, Badge, Table, Modal, Toast...
    forms/                  # AbsenceForm, TransferForm, GuardForm
    attendance/             # ShiftSheetTable, StatusBadge
    layouts/                # Sidebar, Topbar, RoleNav
  lib/
    db/(schema.ts, index.ts, migrations)  # Drizzle
    auth/(auth.ts, dal.ts, rbac.ts, roles.ts)
    storage/(firebase-admin.ts)
    redis/(index.ts, rate-limit.ts)
    pdf/(report-document.tsx)
    validators/(*.ts, zod)
  types/ (shared, from drizzle)
```

---

## 3. Authentication & RBAC (backend-first)

**Flow:** Google OAuth (100% of accounts) → Auth.js v5.
- **Provider:** `GoogleProvider`. On first successful sign-in, `events.signIn` upserts `users` row (default `role='GUARD'`), linking `googleId` + `email`.
- **Session strategy:** `jwt` (JWT in cookie) — simplest for Vercel/Edge, and avoids DB hit per request; keep `role` and `userId` on the token.
- **Migrations:** Roles are not self-assignable — ADMIN/HR/SUPERVISOR/SUPERVISOR_SENIOR/BURSAR are seeded/managed via `drizzle-kit seed` + a guarded admin action.
- **`lib/auth/rbac.ts`:** centralized permission map per SRS §2:
  - `SUPER_ADMIN`: everything + audit override.
  - `HR`: attendance read, sickness docs audit, transfer approve/reject, PII + PDF full.
  - `SENIOR_SUPERVISOR`: edit/review attendance, transfers **initiate** only, restricted PII, summaries only.
  - `SUPERVISOR`: record/edit shift logs, transfers **request** only, shift reports only.
  - `BURSAR`: attendance read-only, **no** transfers, payroll PDF export.
  - `GUARD`: view own logs + own profile only.
- **`lib/auth/dal.ts`:** `verifySession()` (awaits cookies, decrypts JWT, memoized via `cache()`), then `requireRole(...roles)` helpers used in every server action + layout.
- **`app/proxy.ts` (Not middleware.ts):** Next 16 proxy gate — redirects unauthenticated users to `/login`, blocks role-guarded route groups early. All **authority checks still re-verified server-side** in actions/DAL (proxy is only a UX shortcut).

---

## 4. Database schema (Drizzle, Neon Postgres)

I'll implement exactly the SRS §6 tables with enhancements:

- `users` — `googleId`(unique), `email`(unique), `fullName`, `role` enum, timestamps. (SRS baseline)
- `guardProfiles` — `userId`, `employeeId`(unique), `age`, `phone`, `homeLocation`, `workLocation`, `kinName/Relation/Phone` (PII), `registrationDate`, `assignedSupervisorId`.
- `attendanceLogs` — `guardId`, `supervisorId`, `date`, `shift`(DAY|NIGHT), `status`(PRESENT|ABSENT), `absenceCategory`, `allowedDays`, `reason`, `documentUrl`, timestamps. **Add a unique constraint** `(guardId, date, shift)` to enforce one log per shift.
- `transferRequests` — `guardId`, `fromSupervisorId`, `toSupervisorId`, `requestedBy`, `approvedBy`, `status`(PENDING|APPROVED|REJECTED), `reason`, `createdAt`. **Add `reviewerNotes`** for reject reason (SRS audit).
- **Add `auditLog` table** to satisfy SRS §2 "Audit Override / Audit Log" for every create/update/transfer action.

> Enums: `user_role`, `shift_type`, `attendance_status`, `absence_category`, `transfer_status`. Migrations via `drizzle-kit` (`migrate.ts` + generated SQL). A `db/index.ts` instantiates `neon-http` driver + `drizzle()`.

---

## 5. Backend layer: Server Actions + Route Handlers

**Mutations → Server Actions** (`'use server'`) — respect Next 16 single-roundtrip + `revalidatePath`:

| Action | Guard (DAL) | Behavior |
|---|---|---|
| `markAttendance` | SUPERVISOR + | Records PRESENT/ABSENT; for ABSENT branches to SICK/PERMITTED/NOT_PERMITTED; upserts on `(guardId,date,shift)`; appends audit row |
| `uploadSickNote` | SUPERVISOR + | Obtains Firebase signed upload URL, ties returned `documentUrl` to the log |
| `submitTransfer` | SUPERVISOR/SENIOR | Creates PENDING record, sets Redis event, triggers email to Admin/HR |
| `approveOrRejectTransfer` | SUPER_ADMIN/HR only | Validates status, updates `assignedSupervisorId`, writes reject `reviewerNotes`, notifies requester |
| `createGuard` / `updateGuard` / `assignSupervisor` | SUPER_ADMIN/HR | CRUD on `guardProfiles` w/ Drizzle insert schema |
| `downloadReport` | BURSAR/HR/ADMIN | Streams PDF buffer |

**Route Handlers** (`app/api/.../route.ts`) — used only where a real HTTP boundary is needed (uploads, PDF stream, next-auth callback):
- `POST /api/storage/upload` — server-side Firebase upload (never expose admin creds to client).
- `GET /api/reports/pdf?startDate&endDate&supervisorId&format=pdf` — SRS §7, streams `@react-pdf/renderer`.
- `api/auth/[...nextauth]/route.ts` — Auth.js handler.

**Rate limiting / session lock (Upstash Redis):** guard duplicate attendance submissions per shift with a short TTL lock keyed on `(guardId,date,shift)`; SRS §3 callout.

---

## 6. UI design (mapping SRS → screens)

**Global shell:** dark slate + `brand` blue (the exact palette in `system.html`), Inter font, sticky header, role-aware left sidebar mirroring the SRS sidebar (Overview, Attendance, Transfers, Reports, Guard Registry). Responsive; `GUARD` sees only Attendance-my + Profile.

**Screens:**
1. `/login` — brand panel + "Sign in with Google" (OAuth only).
2. **Dashboard** — role-filtered stat cards (today PRESENT/ABSENT, pending transfers, my-shift state for guards).
3. **Shift Sheet** (`/attendance`) — *"Select Day/Night ➔ fetch assigned guards"*: date selector + shift toggle (client state), read-only table per supervisor; row actions **Mark PRESENT / Mark ABSENT**.
4. **Absence modal** — on ABSENT, three-way branch per SRS §4: *Sick* (dates + doctor's note upload w/ progress bar), *Permitted Reason* (reason + allowed-days validation), *Not Permitted* (deduction flag). Server-rendered status badges (emerald/amber/rose per SRS).
5. **Guards registry** (`/guards`) — table of `guardProfiles`; PII columns (kin/home) **hidden** unless SUPER_ADMIN/HR; create/edit modal; assign supervisor.
6. **Transfers** (`/transfers`) — requester view (submit w/ reason) + Admin/HR approve/reject panel with `reviewerNotes`; state-based badge (PENDING/APPROVED/REJECTED).
7. **Reports** (`/reports`) — date-range + supervisor filter builder; "Generate PDF" triggers `GET /api/reports/pdf`; access split per §2 (Bursar=payroll, supervisors=summary only).
8. **Guard profile** — own-profile only for GUARD; full PII for HR/ADMIN.

**Shared UI atoms** (`components/ui`): `Button`, `Card`, `Badge`, `DataTable` (sort/filter), `Modal`, `Toast`, `Field/Select/DatePicker`, `FileUpload` (Firebase progress), `StatusPill`, `RoleGate` (client-side render guard on top of DAL).

---

## 7. PDF reporting (SRS §8), storage, and caching

- **PDF:** `lib/pdf/report-document.tsx` — a `@react-pdf/renderer` document (attendance ledger, absence breakdown by category, payroll deduction list for Bursar). Rendered **server-side** and streamed as `application/pdf` via `Response`. Never client `window.print()`.
- **Storage (Firebase Admin):** hidden backend config, signed upload URLs, `documentUrl` column stores public/readable URL; only HR/ADMIN can fetch the file from UI.
- **Upstash Redis:** live shift-session lock (prevent double clock-in), rate-limit on submission/report endpoints.

---

## 8. Implementation phases (in act mode)

**Phase 1 — Foundation:** add deps; env var schema; Drizzle `schema.ts` + migrations + `db/index.ts`; seed script; globals theme tokens.
**Phase 2 — Auth:** Auth.js Google config, `dal.ts`, `rbac.ts`, `proxy.ts`, `/login`, layout shell.
**Phase 3 — Attendance:** guard registry + shift sheet server actions + absence branching + Firebase upload.
**Phase 4 — Transfers:** request/approve/reject + Redis event + email + notifications.
**Phase 5 — Reporting:** `@react-pdf/renderer` document + API route + role-gated report screens.
**Phase 6 — Polish:** audit logging, rate limiting, PII gating sweep, responsive pass, `next build` green.

Each phase ends with a runnable `next dev`/`next build` validation.

---

## 9. Assumptions / decisions to confirm before I implement

1. **Auth library:** I plan **Auth.js (NextAuth v5)** with the Google provider (best-maintained for Next 16). Alternatively a custom `oslo`-based Google OAuth flow if you prefer zero magic. I'll go with Auth.js unless you object.
2. **Supervisor-assignment basis:** Shift sheets are scoped to the guard's `assignedSupervisorId`. Confirmed that's the intent of §6.
3. **Redis email queue:** For the "queue event + email" in §5, I'll use **Upstash Redis as the bus + Resend for email** (both lightweight serverless). If you have a preferred email provider, tell me.
4. **Seed roles:** Initial SUPER_ADMIN is seeded from a `.env` mail/email allowlist (no self-registration of privileged roles).
5. **Next.js 16 note:** I will use `proxy.ts` (not `middleware.ts`), awaited `cookies()`, and Server Actions for all mutations — these are the confirmed non-negotiable version constraints.

This plan is ready. To start implementing, **toggle to Act mode** and I'll begin with Phase 1 (foundation + schema). If you want to adjust any decision above (auth lib, email provider, or scope), let me know and I'll fold it into the plan.