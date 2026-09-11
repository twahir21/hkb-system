# HKB Attendance Management Portal — User Guide (All Roles)

Welcome to the **HKB Attendance Management Portal**. This manual walks every user — from Askari (Guard) to Super Admin — through signing in and using the system step by step.

> **Roles covered:** Super Admin · HR Personnel · Senior Supervisor · Supervisor · Bursar / Finance · Storekeeper · Askari (Guard)
>
> Screens you can open are controlled by your role — the sidebar only shows what you are allowed to use. If a step below does not appear for you, your role does not include it.

---

## Table of Contents

1. [Getting Started (Sign In & Sign Out)](#1-getting-started-sign-in--sign-out)
2. [Understanding the Interface](#2-understanding-the-interface)
3. [What Each Role Can See (Quick Map)](#3-what-each-role-can-see-quick-map)
4. [Super Admin — Step by Step](#4-super-admin--step-by-step)
5. [HR Personnel — Step by Step](#5-hr-personnel--step-by-step)
6. [Senior Supervisor — Step by Step](#6-senior-supervisor--step-by-step)
7. [Supervisor — Step by Step](#7-supervisor--step-by-step)
8. [Bursar / Finance — Step by Step](#8-bursar--finance--step-by-step)
9. [Storekeeper — Step by Step](#9-storekeeper--step-by-step)
10. [Askari / Guard — Step by Step](#10-askari--guard--step-by-step)
11. [Common Workflows (Detailed)](#11-common-workflows-detailed)
12. [Status Badge Legend](#12-status-badge-legend)
13. [Troubleshooting & FAQ](#13-troubleshooting--faq)
14. [Getting Help / Requesting Access](#14-getting-help--requesting-access)

---

## 1. Getting Started (Sign In & Sign Out)

### Step 1 — Open the portal
Open your web browser (Chrome, Edge, Firefox, or Safari) and go to the portal address provided by the IT & Technical Department. You will land on the **Login** page.

### Step 2 — Sign in with Google
1. Click **Sign in with Google**.
2. Choose the **Google account your employer registered for you** (the exact work email given to IT).
3. Approve the Google permission prompt if shown.

> ⚠️ **Important:** You cannot create your own account. Only users pre-registered in the system (by the Super Admin) can sign in. Personal or unregistered Google accounts will be blocked.

### Step 3 — You arrive at your Dashboard
After signing in you are taken straight to your **role-specific Dashboard**. What you see there depends on your role (see [Section 3](#3-what-each-role-can-see-quick-map)).

### Step 4 — Sign out when done
- Click your profile area in the **top bar** and choose **Sign out**, or use the sign-out control provided in the top-right corner.
- Always sign out, especially on shared or public computers.

### If you are denied access
If Google signs you in but the portal shows **"Access Denied"**, your account is not yet registered with the right role. The page includes a pre-written email link to request access from the IT & Technical Department. Include:
- Your full official name & employee ID
- Your designated role (e.g., Guard, Supervisor, HR, Bursar)
- Your assigned work location / station

## 2. Understanding the Interface

Once signed in, every screen uses the same layout:

```
┌──────────────┬──────────────────────────────────────────┐
│              │  TOP BAR (menu button, date, profile)    │
│  SIDEBAR     ├──────────────────────────────────────────┤
│  (left)      │                                          │
│  • Operate   │            PAGE CONTENT                  │
│  • Store     │   (tables, cards, forms, modals)         │
│  • Office    │                                          │
│  • Manage    │                                          │
│              │  SIDEBAR FOOTER (your name/role/email)   │
└──────────────┴──────────────────────────────────────────┘
```

- **Sidebar (left):** grouped links — *Operate*, *Store*, *Office*, *Manage*. Only links your role permits are shown.
- **Top bar:** on phones/tablets, tap the **menu (☰) button** to slide the sidebar open; tap outside it to close.
- **Sidebar footer:** shows your name, role label, and work email — confirm this if you share a device.
- **Tables:** most tables support searching/filtering and column sorting.
- **Modals:** actions like "Mark Absent", "Register Guard", or "Approve Transfer" open a dialog — complete the fields and press the confirm button. Close with ✕ or Cancel.
- **Toasts:** success/error pop-ups appear briefly after you save something. Wait for the confirmation before moving on.
- **Current page highlight:** the active sidebar link is highlighted in blue.

## 3. What Each Role Can See (Quick Map)

✅ = full use · 👁 = view only · — = not visible

| Page (sidebar label) | Super Admin | HR | Senior Sup. | Supervisor | Bursar | Storekeeper | Guard |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Shift Sheet** (`/attendance`) | ✅ edit | 👁 | ✅ record+edit | ✅ record | 👁 | — | — |
| **Attendance Records** (`/records`) | ✅ | ✅ | ✅ | ✅ | ✅ | — | 👁 own |
| **My Summary** (`/my-summary`) | — | — | — | — | — | — | ✅ |
| **Stock Holdings** (`/store`) | ✅ | 👁 | 👁 | 👁 | 👁 | ✅ | — |
| **Stock Ledger** (`/store/ledger`) | ✅ | 👁 | 👁 | 👁 | 👁 | ✅ | — |
| **Stock Transfers** (`/store/transfers`) | ✅ approve | — | initiate | initiate | — | ✅ approve | — |
| **Stock Reports** (`/store/reports`) | ✅ | 👁 | 👁 | 👁 | 👁 | ✅ | — |
| **Store Items** (`/store/items`) | ✅ | — | — | — | — | ✅ | — |
| **Regions & Stations** (`/store/locations`) | ✅ | — | — | — | — | ✅ | — |
| **Guard Debts** (`/office/credit`) | ✅ | 👁 | — | — | ✅ | ✅ | — |
| **Salary Deductions** (`/office/credit/settlement`) | ✅ | — | — | — | ✅ | — | — |
| **Business Tracking** (`/office/business`) | ✅ | 👁 | — | — | ✅ | ✅ | — |
| **My Debts** (`/my-credits`) | — | — | — | — | — | — | ✅ |
| **User Accounts** (`/users`) | ✅ | — | — | — | — | — | — |
| **Guard Registry** (`/guards`) | ✅ | ✅ | — | — | — | — | — |
| **Transfers** (`/transfers`) | ✅ approve | ✅ approve | initiate | initiate | — | — | — |
| **Coverage Requests** (`/coverage-requests`) | ✅ manage | 👁 | — | — | 👁 | — | — |
| **Reports** (`/reports`) | ✅ PDF | ✅ PDF | summary | — | ✅ PDF | — | — |

## 4. Super Admin — Step by Step

The Super Admin has **every permission** in the system and is responsible for setting it up and overseeing all activity.

### 4.1 Register system users
1. In the sidebar go to **Manage → User Accounts**.
2. Click **Add User** (or similar "Register User" button).
3. Fill in the person's **full name**, **work email**, **username**, and select their **role**: `SUPER_ADMIN`, `SENIOR_SUPERVISOR`, `OPERATION_OFFICER`, `SUPERVISOR`, `HR`, `BURSAR`, `STOREKEEPER`, `SECRETARY`, or `GUARD`.
4. Save. The person can now sign in with that Google email.
5. To add many users at once, use the **bulk CSV import** in the same page and follow the on-screen CSV format instructions (email, full name, username, role — one row per user).

### 4.2 Manage the guard registry
1. Go to **Manage → Guard Registry**.
2. Click **Register Guard**; fill employee ID, personal details, and assign a **Supervisor** (this decides which shift sheet the guard appears on).
3. You can also see and edit sensitive PII (next of kin, home address) and import guards in bulk via CSV.

### 4.3 Record / correct attendance
1. Go to **Operate → Shift Sheet**.
2. Pick the **date** and the **Day** or **Night** shift.
3. Mark each assigned guard **Present** or **Absent** (absence opens the branch form — see [Workflow 11.1](#111-record-attendance-and-handle-absences)).
4. As Super Admin you may also **edit existing records** (a permission no one below Senior Supervisor has).

### 4.4 Approve staff transfers
1. Go to **Manage → Transfers**.
2. Review **Pending** requests; open the details and read the reason.
3. Click **Approve** (guard moves to the requesting supervisor) or **Reject** and write **reviewer notes** explaining why.

### 4.5 Store operations
- Use **Store → Store Items** and **Regions & Stations** to define what stock exists and where.
- Record stock movements, approve **Stock Transfers**, and monitor **Stock Holdings / Ledger / Reports**.

### 4.6 Office finances
- **Office → Guard Debts**: record guard credit (fish, maize flour, medical).
- **Office → Salary Deductions**: settle debts against salary.
- **Office → Business Tracking**: record daily fish & maize-flour business figures (with history view).

### 4.7 Reports and oversight
- **Operate → Dashboard** shows today's present/absent counts, pending transfers, and recent activity.
- **Manage → Reports**: pick a date range (and filters), then **Generate PDF** to download official reports (attendance ledger, absence breakdown, payroll deductions).
- **Manage → Coverage Requests**: view public coverage submissions; as Super Admin you can also manage/resolve them (a red badge shows how many are new).

---

## 5. HR Personnel — Step by Step

HR owns **people administration**: guards, transfers, sick-note audits, and full PDF reporting.

### 5.1 Register and manage guards
1. Go to **Manage → Guard Registry**.
2. Click **Register Guard** and complete the form (employee ID, contact, next of kin, home details).
3. **Assign each guard to a Supervisor** — this is what puts them on a supervisor's shift sheet.
4. Edit any guard's record as their situation changes. HR has full PII visibility.
5. Use **bulk CSV import** to onboard many guards at once.

### 5.2 Monitor attendance (read-only)
- **Operate → Shift Sheet** and **Attendance Records** let you view everyone's attendance. HR cannot record or edit attendance — that is done by supervisors.

### 5.3 Approve transfers
1. Go to **Manage → Transfers**.
2. Open each **Pending** request, then **Approve** or **Reject** with reviewer notes. The guard's assigned supervisor updates automatically on approval.

### 5.4 Audit sick documents
- Where a guard was marked **Sick** with a doctor's note, HR can open/download the uploaded document from the attendance records to verify authenticity (Sickness Document Audit permission).

### 5.5 Debts and reports
- **Office → Guard Debts** and **Business Tracking** are visible to HR for reference.
- **Manage → Reports**: generate full PDF reports (attendance, absences, payroll deduction list) for any date range.

## 6. Senior Supervisor — Step by Step

The Senior Supervisor runs attendance **across supervisors** and can correct records and request guard transfers.

### 6.1 Record daily attendance
1. Go to **Operate → Shift Sheet**.
2. Select the **date** with the date picker.
3. Toggle **Day** or **Night** — the assigned guards for that shift load automatically.
4. Click **Mark Present** for guards who reported, **Mark Absent** for those who did not.
5. Absent guards open the **absence form** — choose the correct branch (Sick / Permitted / Not Permitted) as explained in [Workflow 11.1](#111-record-attendance-and-handle-absences).

### 6.2 Correct earlier records
- Unlike plain Supervisors, the Senior Supervisor has **attendance edit** rights: open **Operate → Attendance Records**, locate the record, and correct it (e.g., fix a wrongly marked absence). All changes are audit-logged.

### 6.3 Request a transfer
1. Go to **Manage → Transfers**.
2. Click **Request Transfer**, pick the guard and the target supervisor/post, and give a clear reason.
3. The request goes to HR / Super Admin as **Pending**; you'll see the outcome (Approved/Rejected) on the same page.

### 6.4 Reports
- **Manage → Reports** gives you **summary** reports (totals and breakdowns) for your date range. Full payroll PDFs are restricted to Bursar/HR/Super Admin.

---

## 7. Supervisor — Step by Step

The Supervisor marks attendance for **their own assigned guards** each shift.

### 7.1 Take the shift attendance (your main daily task)
1. Go to **Operate → Shift Sheet**.
2. Choose the **date**, then switch between **Day** and **Night** tabs.
3. The table lists **only guards assigned to you** for that shift.
4. For each guard click **Mark Present** or **Mark Absent**:
   - **Present** — saved instantly with your name and timestamp.
   - **Absent** — the absence form opens (see [Workflow 11.1](#111-record-attendance-and-handle-absences)).
5. Finish before the end of the shift; a lock prevents accidental duplicate submissions for the same guard/date/shift.

### 7.2 Check your records
- **Operate → Attendance Records** shows attendance so you can confirm what you submitted.

### 7.3 Request a transfer
1. **Manage → Transfers → Request Transfer**.
2. Select the guard, new supervisor/post, and reason; submit.
3. Track its status (Pending / Approved / Rejected with reviewer notes) on the same page.

### 7.4 Store visibility
- You can **view** Stock Holdings, Ledger, and Reports for your area, and **initiate stock transfer requests** from **Store → Stock Transfers** (a Storekeeper or Super Admin approves them).

> ❌ As Supervisor you cannot edit attendance (only Senior Supervisor/Super Admin can), register guards, or approve transfers.

---

## 8. Bursar / Finance — Step by Step

The Bursar handles **money**: guard debts, salary deductions, payroll exports, and official PDF reports.

### 8.1 Record guard debts (credit)
1. Go to **Office → Guard Debts**.
2. Click the button to record a new debt; select the **guard**, choose the type (**fish**, **maize flour**, **medical**, etc.), enter the **amount/date**, and save.
3. The running balance per guard updates immediately.

### 8.2 Settle debts from salary
1. Go to **Office → Salary Deductions**.
2. Choose the guard and the amount to deduct for the pay period; the outstanding balance reduces accordingly.
3. Keep a deduction history per guard for payroll review.

### 8.3 Track the office businesses
- **Office → Business Tracking**: enter daily figures for the fish and maize-flour business; open **History** to review past entries.

### 8.4 Produce payroll and attendance reports
1. Go to **Manage → Reports**.
2. Set the **start/end dates** (and optional supervisor/guard filters).
3. Click **Generate PDF** — the server prepares an official PDF (attendance ledger, absence breakdown, and the **payroll deduction list**) and downloads it.
4. You can also open a specific guard's report page from the records list to review their history.
5. Use **Operate → Shift Sheet / Attendance Records** in view-only mode to verify figures before paying.

### 8.5 Stock and coverage visibility
- **Store** pages are view-only for the Bursar — useful for reconciling stock values.
- **Manage → Coverage Requests** shows new public coverage submissions so you're aware of extra deployment costs.

## 9. Storekeeper — Step by Step

The Storekeeper controls **inventory**: items, locations, stock levels, and stock transfers.

### 9.1 Set up items and locations (first-time setup)
1. Go to **Store → Store Items**; add every item the company handles (name, unit, etc.).
2. Go to **Store → Regions & Stations**; add the regions and stations/stores where stock is held.

### 9.2 Record stock movements
1. Go to **Store → Stock Holdings** to see current quantities at each location.
2. Record receipts and issues for each item/location — every entry is written to the **Stock Ledger**.

### 9.3 Review the ledger
- **Store → Stock Ledger** is the full movement history (in/out, who recorded it, when). Use it to investigate discrepancies.

### 9.4 Handle stock transfers
1. **Store → Stock Transfers** lists transfer requests.
2. Requests initiated by Supervisors/Senior Supervisors arrive as **Pending**.
3. **Approve** to release the stock to the requesting station, or **Reject** with a reason. You can also initiate your own transfers.

### 9.5 Reports and office duties
- **Store → Stock Reports**: summaries of holdings and movements for your date range.
- **Office → Guard Debts** and **Business Tracking**: the Storekeeper also records guard credit purchases and business figures alongside the Bursar.

---

## 10. Askari / Guard — Step by Step

Guards have the simplest view: **their own attendance and their own debts**.

### 10.1 Check your attendance
1. Sign in — you land on the **Dashboard** showing your **current shift status** (e.g., whether you were marked present today).
2. Go to **Operate → My Summary** to see your attendance history: days present, sick days (with permitted days noted), and any not-permitted absences.
3. **Operate → Attendance Records** also shows your own records only.

> ℹ️ You do **not** mark your own attendance — your **Supervisor** does it for you on the shift sheet. If a record is wrong, tell your supervisor immediately so HR/Senior Supervisor can correct it.

### 10.2 Check your debts
1. Go to **Office → My Debts**.
2. You'll see any credit you took (fish, maize flour, medical), amounts already deducted from salary, and your outstanding balance.

### 10.3 If you can't report for work
- Notify your **Supervisor** as early as possible. For sickness, provide a **doctor's note** — your supervisor uploads it with the absence record so the day counts as *Sick* rather than *Not Permitted* (which affects pay).

---

## 11. Common Workflows (Detailed)

### 11.1 Record attendance and handle absences
*(Supervisor, Senior Supervisor, Super Admin)*

1. **Operate → Shift Sheet** → pick **date** → toggle **Day/Night** → the assigned guards load.
2. Click **Mark Present** — done (green status saved with audit trail).
3. Click **Mark Absent** — a modal opens with **three options**:
   - **Sick** — select the sick dates and **upload the doctor's note** (a progress bar shows the upload; the file is stored securely). The day is flagged as sick leave, not a pay deduction.
   - **Permitted Reason** — choose the reason (e.g., leave, duty elsewhere) and the allowed days. Validated against the guard's permitted allowance.
   - **Not Permitted** — no valid reason. The absence is flagged for **salary deduction** and appears in the Bursar's payroll report.
4. Save. Status badges update everywhere (records, dashboard, reports).

### 11.2 Transfer a guard between supervisors/posts
1. **Initiate** (Supervisor / Senior Supervisor / Super Admin): *Manage → Transfers → Request Transfer* → guard + destination + reason → submit.
2. **Review** (HR / Super Admin): the request appears as **Pending**; the system also notifies Admin/HR of the new event.
3. **Decide**: **Approve** (the guard's assigned supervisor is updated automatically) or **Reject** with written notes. The requester sees the decision and notes.

### 11.3 Generate an official PDF report
*(Super Admin, HR, Bursar; summary-only for Senior Supervisor)*
1. **Manage → Reports**.
2. Choose **start date**, **end date**, and optional filters (supervisor, guard, shift).
3. Click **Generate PDF** — the report is built on the server and downloads as a file (attendance ledger, absence breakdown by category, and payroll deductions where authorized).

### 11.4 Stock transfer request → approval
1. **Request** (Supervisor/Senior Supervisor/Storekeeper/Super Admin): *Store → Stock Transfers* → item, quantity, from/to location → submit.
2. **Approve** (Storekeeper / Super Admin): review pending requests and approve or reject.

### 11.5 Deduct a guard's debt from salary
1. Bursar (or Super Admin): **Office → Guard Debts** — confirm outstanding balance.
2. **Office → Salary Deductions** — record the deduction for the period.
3. Guard sees the updated balance on **My Debts**.

## 12. Status Badge Legend

| Badge | Meaning | Colour | Why it matters |
|---|---|---|---|
| **PRESENT** | Guard reported for the shift | Green (emerald) | Attendance & reports |
| **SICK** | Absent with sickness + doctor's note | Amber | HR audits the document |
| **PERMITTED** | Absent with an allowed reason | Amber | Checked against allowed days |
| **NOT PERMITTED** | Absence without valid reason | Red (rose) | Flagged for salary deduction |
| **PENDING** | Transfer/stock transfer awaiting decision | Amber | Reviewer action needed |
| **APPROVED** | Request accepted | Green | Change applied automatically |
| **REJECTED** | Request refused (with notes) | Red | Reviewer notes explain why |

---

## 13. Troubleshooting & FAQ

**Q: "Sign in with Google" succeeds but I get Access Denied.**
Your email isn't registered, or your role changed. Contact the IT & Technical Department (use the email link on the Access Denied page) or ask the Super Admin to register/fix your account in **User Accounts**.

**Q: I signed in with the wrong Google account.**
Sign out, then sign in again with the work email that was registered for you.

**Q: My guard list on the Shift Sheet is empty.**
Check the **date** and **Day/Night** toggle first. If still empty, no guards are assigned to you for that shift — ask HR to assign guards to you in the **Guard Registry**.

**Q: I can't click "Mark Present/Absent".**
The record may already be locked for that shift (duplicate submissions are blocked), or your role only has view access (HR/Bursar view; only Supervisors/Senior Supervisor/Super Admin record).

**Q: I marked someone absent by mistake.**
Ask a **Senior Supervisor or Super Admin** to correct the record — they hold the attendance-edit permission. All edits are audit-logged.

**Q: The doctor's note upload fails or hangs.**
Check your internet connection and file size/type, then retry. If it keeps failing, record the absence and hand the physical note to HR, who can follow up.

**Q: The PDF report doesn't download.**
Only Super Admin/HR/Bursar can generate full PDFs, and Senior Supervisors get summaries. Confirm your role, your date range, then retry. If the button spins for a long time, reduce the date range.

**Q: My debt balance looks wrong.**
Deductions are entered per pay period by the Bursar. Raise it with the Bursar/office; they review the **Guard Debts** and **Salary Deductions** history.

**Q: My transfer was rejected.**
Open **Manage → Transfers**, read the reviewer notes, and submit a new request if circumstances changed.

**Q: The system looks different from the screenshots in this guide.**
Buttons/labels may be refined over time. What never changes: your **role decides your menu**, and each page keeps the same purpose described here.

---

## 14. Getting Help / Requesting Access

- **New user / lost access:** Email the **IT & Technical Department** (or use the pre-filled link on the Access Denied page) with:
  1. Full official name & employee ID
  2. Designated role (Guard / Supervisor / HR / Bursar / Storekeeper)
  3. Assigned work location / station
- **Wrong role permissions:** Contact the **Super Admin** — roles are changed only in **Manage → User Accounts**.
- **Data corrections (attendance):** Supervisor → Senior Supervisor → Super Admin, in that order.
- **Pay & deductions:** Contact the **Bursar**.
- **Stock issues:** Contact the **Storekeeper**.

---

*HKB Protection & Management — Attendance Management Portal · User Guide v1.0*






