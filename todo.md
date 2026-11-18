# HKB Portal — Role Re-classification & User Guide Fix Plan

Status: `pending` | `finished` · Effort: `small` | `medium` | `hard`

---

## A. Audit findings (done before any code change)

| # | Task | Status | Effort |
|---|------|--------|--------|
| A1 | Audit role definitions (`lib/db/schema.ts` enum, `lib/auth/rbac.ts`) | finished | small |
| A2 | Audit sidebar vs. page guards (`components/layouts/Sidebar.tsx`, `app/(dashboard)/**/page.tsx`) | finished | small |
| A3 | Audit `USER_GUIDE.md` against code | finished | small |

### A-findings: role classification problems

1. **Role list is copied in ~10 places.** Adding a role means editing all of them:
   `schema.ts` enum, `rbac.ts` PERMISSIONS + ROLE_LABELS, `Sidebar.tsx`, `UserForm.tsx`,
   `users.actions.ts` (CSV validRoles), `UserManager.tsx` (badge switch),
   `StaffAttendanceView.tsx` (2 dropdowns + badge switch), `StaffAttendanceCharts.tsx`,
   `features/hr/queries/guards.ts` and `guards.actions.ts` (SUPERVISOR_ROLES).
2. **Sidebar has its own role lists, separate from `PERMISSIONS`.** They have drifted:
   - `STOREKEEPER` is missing from the **Dashboard** link.
   - `SECRETARY` sees **Guard Registry** and **Clients** links, but both pages require `GUARD_MANAGE` (SUPER_ADMIN, HR only), so Secretary gets denied.
3. **Scoping is hard-coded on `role === "SUPERVISOR"`** (attendance, dashboard, reports). All other field roles see every guard. No hierarchy (manager → in-charge → supervisor).
4. **Users have no branch / region.** HQ vs. remote branch cannot be expressed, so a remote "office assistant" cannot be limited to their branch.
5. `jobs.actions.ts:175` uses an inline role array instead of a permission.
6. `SICKNESS_DOC_AUDIT` permission exists but no screen uses it.

### A-findings: USER_GUIDE.md errors

1. Section 3 table has no columns for **Operations Officer** and **Secretary**, though both roles exist.
2. Storekeeper **Dashboard ✅** is wrong: the link is hidden for Storekeeper.
3. Pages missing from the guide: **Staff Attendance**, **Clients**, **Job Applications**, **News**, **Auto Print**.
4. Sign-in: guide says Google only. Code also supports **username + password** (`auth.ts` Credentials provider).
5. 6.2 says corrections are made in **Attendance Records**. Code: corrections are made by re-marking on the **Shift Sheet** (`ATTENDANCE_EDIT` check in `attendance.actions.ts`).
6. 5.4 sick-document audit: permission not wired to any UI.
7. 7.4 "stock for your area": no area scoping exists; Supervisors see all stock.
8. Guard Debts / Business Tracking / Coverage / Reports rows omit Secretary access.
9. 10.1 says the Guard dashboard shows the guard's own shift status. It does not (it showed org-wide numbers; now hidden — see C23).

---

## B. New role model (owner answers 2026-11-18)

| Role | Enum | Change |
|---|---|---|
| System Administrator | `SUPER_ADMIN` | label only → "System Administrator" |
| HR Office | `HR` | label only → "HR Office" |
| Accountancy | `BURSAR` | label only → "Accountant" (enum kept, no migration) |
| Security Guard | `GUARD` | label only → "Security Guard" |
| Operations Manager | `OPERATIONS_MANAGER` | **new**, above Senior Supervisor |
| Senior Supervisor | `SENIOR_SUPERVISOR` | kept |
| Operations Officer | `OPERATION_OFFICER` | kept |
| Supervisor | `SUPERVISOR` | kept |
| In-Charge | `IN_CHARGE` | **new**, under Supervisor; one station/site; marks attendance for that station's guards only |
| Storekeeper | `STOREKEEPER` | kept, no rename |
| Secretary | `SECRETARY` | kept, HQ only |
| Office Assistant | `OFFICE_ASSISTANT` | **new**, remote branches only, scoped to own branch |

Hierarchy (field): Operations Manager → Senior Supervisor → Operations Officer → Supervisor → In-Charge → Guard.

---

## B2. Branches (owner answer 2026-11-18)

One unified system. Branches: **Dar es Salaam (HQ)**, **Tabora**, **Dodoma** (more can be added).
- New `branches` table (`name`, `is_hq`). Every user gets `branch_id` (existing users → HQ).
- Regions belong to a branch (`regions.branch_id`), so stations/sites inherit their branch.
- **Office Assistants own a branch**: they work in the same system, limited to their own branch.
- Secretary stays at HQ.

## B3. Approved permissions for new roles

- **Operations Manager** = Senior Supervisor permissions + approve guard transfers + full PDF reports + payroll export + view all incidents and act on them.
- **Office Assistant** = Secretary permissions, limited to own branch. Until branch scoping (C6) exists for a module, that module stays hidden from Office Assistant (no cross-branch data leak).
- **In-Charge** = Supervisor limited to one station (`stations.in_charge_id`). Until C8b is done, In-Charge gets Dashboard + incident reporting only.

## B4. Incident management (new)

| Field | Detail |
|---|---|
| Site | station (`station_id`) |
| Client | client (`client_id`, optional) |
| Branch | from the site's region, else reporter's branch |
| Emergency level | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| Reported by | logged-in user (auto) |
| Status | `OPEN` (not solved) / `RESOLVED` (solved), with resolved by + resolved at |
| Actions | log table `incident_actions` (note, who, when); many per incident |
| Other | title, description, occurred at |

Access:
- **Report**: Super Admin, Operations Manager, Senior Supervisor, Operations Officer, Supervisor, In-Charge, Office Assistant, Secretary, HR.
- **View all + add actions + mark solved/reopen**: Super Admin, Operations Manager.
- **Office Assistant**: view + act on incidents of own branch only.
- **Other reporters**: see only incidents they reported.

---

## C. Implementation tasks

| # | Task | Status | Effort |
|---|------|--------|--------|
| C1 | Confirm role mapping with owner | finished | small |
| C2 | Create single role registry `lib/auth/roles.ts` (value, label, badge colour, group, isFieldRole, isStaff) and use it in every place from finding 1 | finished | medium |
| C3 | Drive sidebar from `PERMISSIONS` (each nav item names a permission, not a role list) — fixes drift in finding 2 | finished | medium |
| C4 | DB migration: add enum values `OPERATIONS_MANAGER`, `IN_CHARGE`, `OFFICE_ASSISTANT` (additive only, no renames) | finished | small |
| C5 | (merged into C14) | finished | small |
| C6 | Branch scoping: Office Assistant (and others as decided) only see data for their branch | pending | hard |
| C7 | Replace `role === "SUPERVISOR"` checks with a scope helper (own guards / own branch / all) | pending | medium |
| C8 | RBAC for new roles + new labels. Operations Manager and labels finished; Office Assistant / In-Charge get only incidents + dashboard until C6 / C8b | pending | medium |
| C8b | In-Charge: add `stations.in_charge_id` (or user→station link) so In-Charge sees only their station guards | pending | medium |
| C9 | Update CSV bulk import + user form for new roles and branch | finished | small |
| C10 | Replace inline role check in `jobs.actions.ts` with permission | finished | small |
| C11 | Wire `SICKNESS_DOC_AUDIT` to records UI, or drop from guide | pending | medium |
| C12 | Typecheck + lint + manual login test per role | pending | medium |
| C14 | Schema + migration: `branches`, `users.branch_id`, `regions.branch_id`, `stations.in_charge_id`, seed Dar es Salaam (HQ) / Tabora / Dodoma | finished | medium |
| C15 | Branch management page (Super Admin): list/add branches, show owners (Office Assistants) | finished | small |
| C16 | User form + CSV import: branch field | finished | small |
| C17 | Incidents schema + migration (`incidents`, `incident_actions`, level/status enums) | finished | small |
| C18 | Incidents permissions in `rbac.ts` + scoping helper (all / own branch / own reports) | finished | small |
| C19 | Incidents page `/incidents`: report form, filter by status/level/branch, table, detail modal with action log + solve/reopen | finished | medium |
| C20 | Dashboard: open incidents count (critical highlighted) for incident managers | finished | small |
| C24 | **Apply migrations 0021 (employees, contracts) + 0022 (leave) to production** — tested on branch; must run BEFORE deploying this branch | pending | small |
| C21 | Apply migrations 0018 + 0019 + 0020. Tested on branch, **applied to production 2026-11-18**. Backup branch: `backup-before-0018-0020` | finished | small |
| C22 | Regions page: choose a region's branch (new regions currently have no branch; incidents then use the reporter's branch) | pending | small |
| C23 | Guard dashboard: show the guard's own shift status (guide promises it; not built) | pending | medium |
| C25 | **Bug: promoted user still treated as Guard.** Cause: JWT kept sign-in role for up to 30 days. Fix: role re-read from DB on every session check (deleted user → signed out). Also guard profile deactivated on promotion / reactivated on demotion | finished | small |
| C13 | Rewrite `USER_GUIDE.md` for new roles and fix all A-findings errors | pending | medium |

---

## D. Request 2026-11-18 (b): HR suite, Swahili, Mpangokazi

### D-decisions
- **IT Department = System Administrators.** Keep `SUPER_ADMIN`; label → "IT / Msimamizi wa Mfumo". No new role.
- **Mpangokazi region = branch** (Dar es Salaam, Tabora, Dodoma).
- **Swahili:** Swahili becomes the default UI language. Strings move to one dictionary (`lib/i18n/sw.ts`) so an English switch stays possible later. New screens are built in Swahili from day one.

### D1. Fomu ya Mpangokazi (daily region report) — build first

Every day a Supervisor / Senior Supervisor sends the day's report for their region.

| Field | Source |
|---|---|
| Mkoa (region/branch) | user's branch |
| Tarehe (date) | chosen, default today |
| Msimamizi (supervisor) | logged-in user |
| Jumla ya walinzi (total) | guards in scope |
| Waliopo (present) | prefilled from Shift Sheet (PRESENT/LATE) |
| Off | guards with no attendance record that day (editable) |
| Ruhusa (permitted) | absence = PERMITTED_REASON |
| Wagonjwa (sick) | absence = SICK |
| Hawapo bila sababu (absent) | absence = NOT_PERMITTED |
| List: Na., Jina la mlinzi, Point (site), Hali | guards in scope |
| Imeandaliwa na, Cheo, Sahihi | user name, role label, drawn signature |

Scope of guards: Supervisor → own assigned guards. Senior Supervisor / Ops Officer / Ops Manager / Super Admin → all active guards of the chosen branch.

| # | Task | Status | Effort |
|---|------|--------|--------|
| D1.1 | Schema: `work_plans` (one per preparer per date) + `work_plan_entries`; migration | finished | small |
| D1.2 | Permissions: `MPANGOKAZI_SUBMIT`, `MPANGOKAZI_VIEW_ALL`, `MPANGOKAZI_VIEW_BRANCH` (Office Assistant) | finished | small |
| D1.3 | Prefill query: guards in scope + their status from attendance for the date | finished | medium |
| D1.4 | Form page `/mpangokazi`: date, editable status per guard, live totals, signature pad, save | finished | medium |
| D1.5 | PDF (Swahili) `/api/mpangokazi/[id]/pdf` | finished | medium |
| D1.6 | Share button: phone share sheet (WhatsApp office group) with the PDF; download fallback | finished | small |
| D1.7 | History list (filter by date / branch) | finished | small |

### D2. Leave management (Likizo)

| # | Task | Status | Effort |
|---|------|--------|--------|
| D2.1 | Leave types (annual, sick, maternity/paternity, compassionate, unpaid) + yearly balance per employee | finished | medium |
| D2.2 | Request → approve/reject flow (staff request; HR approves HQ; Office Assistant forwards branch requests) | finished | medium |
| D2.3 | Approved leave → Mpangokazi prefill shows Ruhusa (Mgonjwa for sick leave) when no Shift Sheet record. Shift Sheet badge still TODO | finished | medium |
| D2.4 | Leave calendar + PDF letter | pending | medium |

### D3. Employees & contracts (Wafanyakazi na Mikataba)

| # | Task | Status | Effort |
|---|------|--------|--------|
| D3.1 | Employee profile for ALL staff (not only guards): employee no., department (IT, HR, Accounts, Operations, Store, Office), job title, branch, hire date, phone, NIDA, next of kin | finished | hard |
| D3.2 | Contracts: type (permanent, fixed-term, casual), start/end, salary, uploaded signed PDF | finished | medium |
| D3.3 | Contract expiry alerts (30/60 days) on HR dashboard | finished | small |
| D3.4 | Employee documents (certificates, IDs) storage | pending | medium |

### D4. Training sessions (Mafunzo)

| # | Task | Status | Effort |
|---|------|--------|--------|
| D4.1 | Training sessions: title, trainer, date, venue, branch | pending | small |
| D4.2 | Attendees + attendance + certificate/completion record per employee | pending | medium |

### D5. Meetings calendar (Kalenda ya Vikao)

| # | Task | Status | Effort |
|---|------|--------|--------|
| D5.1 | Meetings: title, date/time, venue/online link, branch, invitees, agenda | pending | medium |
| D5.2 | Month calendar view (meetings + trainings + approved leave) | pending | medium |
| D5.3 | Minutes (kumbukumbu) upload / text after meeting | pending | small |

### D6. Office access (HR / Secretary / Office Assistant)

| # | Task | Status | Effort |
|---|------|--------|--------|
| D6.1 | HR: full access D2–D5 for all branches | pending | small |
| D6.2 | Secretary (HQ): meetings, trainings, employee view, leave requests intake | pending | small |
| D6.3 | Office Assistant: same as Secretary but own branch only (needs C6 branch scoping) | pending | hard |

### D7. Swahili (whole system)

| # | Task | Status | Effort |
|---|------|--------|--------|
| D7.1 | `lib/i18n/sw.ts` dictionary + `t()` helper | finished | small |
| D7.2 | Translate sidebar, top bar, login, access-denied, role labels | finished | small |
| D7.3 | Translate every page and form (~25 pages) | pending | hard |
| D7.4 | Translate PDFs and status badges | pending | medium |
| D7.5 | Rewrite USER_GUIDE.md in Swahili | pending | medium |

### D-order
D1 now → D7.1/D7.2 → D3 → D2 → D5 → D4 → D7.3 rest.

---

## Open Questions

1. ~~Operations Manager vs Senior Supervisor~~ — keep both.
2. ~~In-Charge scope~~ — one station/site.
3. ~~Shop Keeper~~ — typo; Storekeeper unchanged.
4. ~~Office Assistant vs Secretary~~ — Secretary stays at HQ; Office Assistant new, remote branches.
5. ~~Branch vs Region~~ — new Branch table; HQ Dar es Salaam, branches Tabora, Dodoma; Office Assistants own branches.
6. ~~New role permissions~~ — suggestions accepted (see B3).
7. ~~Tanga~~ — region closed; removed by migration 0020 (only if it has no stations). Tested on branch.
8. ~~Mpangokazi "Off"~~ — confirmed: guard with no Shift Sheet record that day (already built that way).

---

## Change log

- **2026-11-18** — Roles registry (`lib/auth/roles.ts`), new roles, branches, incidents, permission-driven sidebar. Typecheck, lint and `next build` pass. Migration 0018 not applied yet.
  - Behaviour change: dashboard attendance stats now show only for roles with `ATTENDANCE_VIEW_ALL` (Guard and Storekeeper no longer see org-wide guard numbers).
  - Behaviour change: Storekeeper now sees Dashboard link; Secretary no longer sees dead Guard Registry / Clients links.
- **2026-11-18 (f)** — Leave (D2.1–D2.3): /leave request (self or on behalf), statutory balances, approve/reject/cancel, overlap + balance checks, Mpangokazi uses approved leave. Migration 0022 tested on branch. Note: local test server had repeated Neon `fetch failed` (network); leave queries verified directly instead of over HTTP.
- **2026-11-18 (e)** — Swahili base (dictionary, sidebar, topbar, login, access-denied, role names). Employees & contracts (D3.1–D3.3): /employees, /employees/[id], contract PDF upload, expiry alerts. Migration 0021 tested on branch, not on production.
- **2026-11-18 (d)** — Production migrated (22 migrations). Branches: Dar es Salaam (HQ), Dodoma, Tabora. Tanga removed. 184/184 users have a branch.
- **2026-11-18 (c)** — Migrations tested on Neon branch: 21 migrations, 3 branches seeded, all 184 users + 4 regions get a branch (Tabora/Dodoma regions → own branches, fix added to 0018). Built app run against branch: all new pages 200 for Super Admin / Supervisor / Guard / Storekeeper; PDF route 200 for allowed users, 404 for others.
- **2026-11-18 (b)** — Fomu ya Mpangokazi (D1) built: form prefilled from Shift Sheet, drawn signature, Swahili PDF, share-to-WhatsApp button, history. SUPER_ADMIN label → "IT / System Administrator". Migration 0019 not applied yet. Typecheck, lint, build and sample PDF render pass.
