# HKB Portal — Open Tasks

Status: `pending` · Effort: `small` | `medium` | `hard`

Done work (roles registry, branches, incidents, Mpangokazi, leave D2.1–D2.3, employees & contracts D3.1–D3.3, Swahili base) is in git history up to `6534082`. Production DB is at migration 0024.

---

## Reference: role model (for guide rewrite + new screens)

Field hierarchy: Operations Manager → Senior Supervisor (region) → Operations Officer → Supervisor (several sites) → In-Charge (one site, treated as guard) → Guard.
Office: IT / System Administrator (`SUPER_ADMIN`), CEO (`CEO`, department Management; view all + approvals, no IT controls), HR Office, Accountant (`BURSAR`), Storekeeper, Secretary (HQ only), Office Assistant (remote branch, own branch only).
Combined roles: IT + Supervisor, Secretary + Supervisor.
Branches: Dar es Salaam (HQ), Tabora, Dodoma. Regions belong to a branch.
Single source of truth: `lib/auth/roles.ts` + `lib/auth/rbac.ts`. Scoping: `lib/auth/guard-scope.ts`.

---

## 1. Roles follow-up

| # | Task | Status | Effort |
|---|------|--------|--------|
| C12 | Manual login test per role (incl. In-Charge, Office Assistant, CEO, combined roles) against a Neon branch | pending | medium |
| C22 | Regions page: choose a region's branch (new regions have no branch; incidents then use reporter's branch) | done | small |
| C11 | Wire `SICKNESS_DOC_AUDIT` to records UI, or drop it from the guide | done | medium |
| C23 | Guard dashboard: show the guard's own shift status | done | medium |
| C13 | Rewrite `USER_GUIDE.md` for new roles | done | medium |

---

## 2. HR suite

| # | Task | Status | Effort |
|---|------|--------|--------|
| D2.3b | Shift Sheet badge for guards on approved leave | done | small |
| D2.4 | Leave calendar + PDF letter | done | medium |
| D3.4 | Employee documents (certificates, IDs) storage | done | medium |
| D5.1 | Meetings: title, date/time, venue/online link, branch, invitees, agenda | done | medium |
| D5.2 | Month calendar view (meetings + trainings + approved leave) | done | medium |
| D5.3 | Minutes (kumbukumbu) upload / text after meeting | done | small |
| D4.1 | Training sessions: title, trainer, date, venue, branch (also add them to `/calendar`, tone "violet") | done | small |
| D4.2 | Attendees + attendance + certificate/completion record per employee | done | medium |
| D6.1 | HR: full access D2–D5 for all branches | done | small |
| D6.2 | Secretary (HQ): meetings, trainings, employee view, leave intake | done | small |
| D6.3 | Office Assistant: same as Secretary, own branch only (C6 scoping exists) | done | medium |

## 3. Swahili

| # | Task | Status | Effort |
|---|------|--------|--------|
| D7.3 | Translate every page and form (~25 pages). New screens built in Swahili from day one | pending | hard |
| D7.4 | Translate PDFs and status badges | done | medium |
| D7.5 | Rewrite USER_GUIDE.md in Swahili (after C13) | pending | medium |

---

## Order

C12 → C22 → D2.4 → D5 → D4 → D6 → D3.4 → D7.3/D7.4 → C11, C23 → C13 → D7.5.
