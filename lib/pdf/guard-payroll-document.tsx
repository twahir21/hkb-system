import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

/** A guard row as it appears in the payroll export (PII already blanked by the caller if unauthorized). */
export type GuardPayrollPdfRow = {
  employeeId: string;
  fullName: string;
  gender: string;
  age: number;
  phone: string;
  email: string;
  homeLocation: string;
  workLocation: string;
  clientName: string | null;
  supervisorName: string | null;
  registrationDate: string;
  kinName: string;
  kinRelation: string;
  kinPhone: string;
  isActive: boolean;
  disabledAtLabel: string | null;
  totalShifts: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  sickCount: number;
  permittedCount: number;
  notPermittedCount: number;
  totalMinutesLate: number;
  attendancePercentage: number;
  onTimePercentage: number;
  outstandingDebt: number;
  outstandingCount: number;
  deductedThisPeriod: number;
};

export type GuardPayrollPdfTotals = {
  guards: number;
  activeGuards: number;
  disabledGuards: number;
  totalShifts: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  sickCount: number;
  permittedCount: number;
  notPermittedCount: number;
  totalMinutesLate: number;
  outstandingDebt: number;
  deductedThisPeriod: number;
  attendancePercentage: number;
};

export type GuardPayrollClientGroup = {
  clientId: string | null;
  clientName: string;
  totals: GuardPayrollPdfTotals;
  rows: GuardPayrollPdfRow[];
};

export type GuardPayrollPdfData = {
  title: string;
  company: string;
  companySubtitle: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  generatedBy: string;
  /** e.g. ["All guards (active + those disabled during the period)", "Client: ABC Logistics"] */
  scopeLines: string[];
  piiIncluded: boolean;
  includeDetails: boolean;
  totals: GuardPayrollPdfTotals;
  clientGroups: GuardPayrollClientGroup[];
};

const GOLD = "#9f7223";
const GOLD_LIGHT = "#fef8ec";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ALT = "#f8fafc";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const money = (n: number) => `TZS ${fmt(Math.round(n))}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: INK,
    paddingBottom: 44,
  },
  masthead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    marginBottom: 8,
  },
  company: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: INK,
  },
  companySub: {
    fontSize: 7,
    color: MUTED,
    marginTop: 1,
  },
  title: {
    fontSize: 10.5,
    fontWeight: 700,
    color: GOLD,
    textAlign: "right",
  },
  meta: {
    fontSize: 6.5,
    color: MUTED,
    textAlign: "right",
    marginTop: 2,
  },
  scope: {
    fontSize: 7,
    color: "#334155",
    marginBottom: 8,
  },
  scopeLabel: {
    fontWeight: 700,
    color: INK,
  },
  clientBanner: {
    backgroundColor: "#f1f5f9",
    borderLeftWidth: 3.5,
    borderLeftColor: GOLD,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientBannerTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: INK,
  },
  clientBannerMeta: {
    fontSize: 7,
    color: MUTED,
    fontWeight: 600,
  },
  sectionHeading: {
    fontSize: 9,
    fontWeight: 700,
    color: GOLD,
    marginBottom: 6,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiStrip: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  kpi: {
    flexGrow: 1,
    backgroundColor: ALT,
    borderWidth: 0.75,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 4,
  },
  kpiValue: {
    fontSize: 9.5,
    fontWeight: 700,
    color: INK,
  },
  kpiLabel: {
    fontSize: 5.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: INK,
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 6.5,
    paddingVertical: 3.5,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  rowAlt: {
    backgroundColor: ALT,
  },
  rowDisabled: {
    color: MUTED,
    backgroundColor: "#fff7f7",
  },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 2,
    backgroundColor: GOLD_LIGHT,
    borderTopWidth: 1.2,
    borderTopColor: GOLD,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingHorizontal: 8,
  },
  sigBox: {
    width: "30%",
  },
  sigLine: {
    borderTopWidth: 0.75,
    borderTopColor: INK,
    marginBottom: 4,
  },
  sigLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: INK,
  },
  sigSub: {
    fontSize: 5.5,
    color: MUTED,
  },
  detailBlock: {
    borderWidth: 0.75,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 6,
    marginTop: 6,
    backgroundColor: "#ffffff",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingBottom: 3,
    marginBottom: 4,
  },
  detailName: {
    fontSize: 8.5,
    fontWeight: 700,
    color: GOLD,
  },
  detailEmp: {
    fontSize: 7,
    color: MUTED,
    fontWeight: 700,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  detailItem: {
    width: "24%",
    fontSize: 6.5,
    marginBottom: 2.5,
  },
  detailLabel: {
    color: MUTED,
    fontSize: 5.5,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  detailValue: {
    color: INK,
    fontWeight: 600,
  },
  badgeActive: {
    fontSize: 5.5,
    fontWeight: 700,
    color: "#047857",
    backgroundColor: "#ecfdf5",
    borderWidth: 0.5,
    borderColor: "#a7f3d0",
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  badgeDisabled: {
    fontSize: 5.5,
    fontWeight: 700,
    color: "#b91c1c",
    backgroundColor: "#fff1f2",
    borderWidth: 0.5,
    borderColor: "#fca5a5",
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
});

// Usable landscape A4 width ~794pt
const COLS = {
  name: 146,
  phone: 72,
  gender: 18,
  age: 22,
  work: 114,
  sup: 96,
  shifts: 24,
  present: 20,
  late: 20,
  absent: 20,
  sick: 20,
  perm: 22,
  nperm: 22,
  minLate: 30,
  att: 36,
  debt: 56,
  ded: 56,
  status: 40,
} as const;

type Col = { key: string; label: string; width: number; align?: "right" | "left" | "center" };

const SUMMARY_COLS: Col[] = [
  { key: "name", label: "FULL NAME", width: COLS.name },
  { key: "phone", label: "PHONE", width: COLS.phone },
  { key: "gender", label: "G", width: COLS.gender, align: "center" },
  { key: "age", label: "AGE", width: COLS.age, align: "right" },
  { key: "work", label: "WORK SITE", width: COLS.work },
  { key: "sup", label: "SUPERVISOR", width: COLS.sup },
  { key: "shifts", label: "SH", width: COLS.shifts, align: "right" },
  { key: "present", label: "P", width: COLS.present, align: "right" },
  { key: "late", label: "L", width: COLS.late, align: "right" },
  { key: "absent", label: "A", width: COLS.absent, align: "right" },
  { key: "sick", label: "SK", width: COLS.sick, align: "right" },
  { key: "perm", label: "PM", width: COLS.perm, align: "right" },
  { key: "nperm", label: "NP", width: COLS.nperm, align: "right" },
  { key: "minLate", label: "LT-M", width: COLS.minLate, align: "right" },
  { key: "att", label: "ATT%", width: COLS.att, align: "right" },
  { key: "debt", label: "DEBT (TZS)", width: COLS.debt, align: "right" },
  { key: "ded", label: "DED (TZS)", width: COLS.ded, align: "right" },
  { key: "status", label: "STATUS", width: COLS.status, align: "center" },
];

const EXEC_COLS: Col[] = [
  { key: "client", label: "CLIENT / ACCOUNT NAME", width: 224 },
  { key: "guards", label: "GUARDS", width: 50, align: "right" },
  { key: "active", label: "ACTIVE", width: 45, align: "right" },
  { key: "disabled", label: "DIS", width: 45, align: "right" },
  { key: "shifts", label: "SHIFTS", width: 50, align: "right" },
  { key: "att", label: "ATT %", width: 50, align: "right" },
  { key: "minLate", label: "LATE (MIN)", width: 60, align: "right" },
  { key: "debt", label: "OUTSTANDING DEBT (TZS)", width: 135, align: "right" },
  { key: "ded", label: "DEDUCTED (TZS)", width: 135, align: "right" },
];

function cellStyle(col: Col) {
  return {
    width: col.width,
    textAlign: (col.align ?? "left") as "right" | "left" | "center",
    paddingRight: col.align === "right" ? 2 : 0,
    paddingLeft: col.align === "left" || !col.align ? 1 : 0,
  };
}

function rowValues(row: GuardPayrollPdfRow): Record<string, string> {
  return {
    emp: row.employeeId,
    name: row.fullName,
    phone: row.phone || "—",
    gender: row.gender ? row.gender.charAt(0) : "M",
    age: String(row.age),
    work: row.workLocation || "—",
    sup: row.supervisorName ?? "—",
    shifts: String(row.totalShifts),
    present: String(row.presentCount),
    late: String(row.lateCount),
    absent: String(row.absentCount),
    sick: String(row.sickCount),
    perm: String(row.permittedCount),
    nperm: String(row.notPermittedCount),
    minLate: String(row.totalMinutesLate),
    att: pct(row.attendancePercentage),
    debt: row.outstandingDebt > 0 ? fmt(Math.round(row.outstandingDebt)) : "—",
    ded: row.deductedThisPeriod > 0 ? fmt(Math.round(row.deductedThisPeriod)) : "—",
    status: row.isActive ? "Active" : "Disabled",
  };
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Masthead({
  data,
  subLabel,
}: {
  data: GuardPayrollPdfData;
  subLabel?: string;
}) {
  return (
    <View style={styles.masthead} fixed>
      <View>
        <Text style={styles.company}>{data.company}</Text>
        <Text style={styles.companySub}>{data.companySubtitle}</Text>
      </View>
      <View>
        <Text style={styles.title}>
          {data.title.toUpperCase()} {subLabel ? `— ${subLabel.toUpperCase()}` : ""}
        </Text>
        <Text style={styles.meta}>
          Period: {data.periodLabel}
          {"\n"}Generated: {data.generatedAt} · By: {data.generatedBy}
        </Text>
      </View>
    </View>
  );
}

function PageFooter({
  data,
  chunkTitle,
}: {
  data: GuardPayrollPdfData;
  chunkTitle?: string;
}) {
  const noPiiNote = data.piiIncluded
    ? "Contains confidential personal & financial data — handle per HKB Security policy."
    : "Personal contact details withheld (viewing without PII clearance).";

  return (
    <View style={styles.footer} fixed>
      <Text>{noPiiNote}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      <Text>
        {data.company} · {chunkTitle ? `${chunkTitle} · ` : ""}Confidential Payroll Dossier
      </Text>
    </View>
  );
}

function DetailCard({ row }: { row: GuardPayrollPdfRow }) {
  const fields: Array<[string, string]> = [
    ["Employee ID", row.employeeId],
    ["Gender / Age", `${row.gender} / ${row.age} yrs`],
    ["Contact Phone", row.phone || "—"],
    ["Email Address", row.email || "—"],
    ["Home Location", row.homeLocation || "—"],
    ["Work Site", row.workLocation || "—"],
    ["Client Account", row.clientName ?? "—"],
    ["Assigned Supervisor", row.supervisorName ?? "—"],
    ["Registration Date", row.registrationDate],
    ["Next of Kin", row.kinName ? `${row.kinName} (${row.kinRelation})` : "—"],
    ["Kin Phone", row.kinPhone || "—"],
    ["Attendance Shifts", `${pct(row.attendancePercentage)} (${row.presentCount + row.lateCount}/${row.totalShifts} shifts)`],
    ["On-Time Record", `${pct(row.onTimePercentage)} (${row.totalMinutesLate} min total late)`],
    [
      "Absences Breakdown",
      `${row.absentCount} (${row.sickCount} sick, ${row.permittedCount} permitted, ${row.notPermittedCount} unexcused)`,
    ],
    [
      "Outstanding Credit / Debt",
      row.outstandingDebt > 0
        ? `${money(row.outstandingDebt)} (${row.outstandingCount} open)`
        : "None (TZS 0)",
    ],
    ["Deducted This Period", row.deductedThisPeriod > 0 ? money(row.deductedThisPeriod) : "TZS 0"],
    ["Account Status", row.isActive ? "ACTIVE" : `DISABLED ${row.disabledAtLabel ? `(${row.disabledAtLabel})` : ""}`],
  ];

  return (
    <View style={styles.detailBlock} wrap={false}>
      <View style={styles.detailHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.detailName}>{row.fullName}</Text>
          <Text style={styles.detailEmp}>({row.employeeId})</Text>
        </View>
        <Text style={row.isActive ? styles.badgeActive : styles.badgeDisabled}>
          {row.isActive ? "ACTIVE GUARD" : "DISABLED GUARD"}
        </Text>
      </View>
      <View style={styles.detailGrid}>
        {fields.map(([label, value]) => (
          <View key={label} style={styles.detailItem}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function GuardPayrollDocument({ data }: { data: GuardPayrollPdfData }) {
  const t = data.totals;
  const groups = data.clientGroups;
  const showExecutiveOverview = groups.length > 1;

  const totalColLeft =
    COLS.name + COLS.phone + COLS.gender + COLS.age + COLS.work + COLS.sup;

  const execLeftWidth = EXEC_COLS[0].width;

  return (
    <Document
      title={data.title}
      author="HKB Protection & Management Co."
      subject={`Guard payroll export — ${data.periodLabel}`}
    >
      {/* 1. Executive Master Overview Page (when multiple clients are present) */}
      {showExecutiveOverview && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Masthead data={data} subLabel="Executive Master Overview" />

          {/* Scope info */}
          <View style={styles.scope}>
            <Text>
              <Text style={styles.scopeLabel}>Scope &amp; Filters: </Text>
              {data.scopeLines.join(" · ")}
            </Text>
          </View>

          {/* Grand KPI Strip */}
          <View style={styles.kpiStrip}>
            <Kpi value={String(t.guards)} label="Total Guards" />
            <Kpi value={String(t.activeGuards)} label="Active" />
            <Kpi value={String(t.disabledGuards)} label="Disabled" />
            <Kpi value={fmt(t.totalShifts)} label="Total Shifts" />
            <Kpi value={pct(t.attendancePercentage)} label="Avg Attendance" />
            <Kpi value={fmt(t.totalMinutesLate)} label="Total Min Late" />
            <Kpi value={money(t.outstandingDebt)} label="Total Debt Owed" />
            <Kpi value={money(t.deductedThisPeriod)} label="Total Deductions" />
          </View>

          {/* Client Breakdown Summary Table */}
          <View>
            <Text style={styles.sectionHeading}>Client Payroll Accounts Breakdown</Text>
            <View style={styles.tableHead} fixed>
              {EXEC_COLS.map((col) => (
                <Text key={col.key} style={cellStyle(col)}>
                  {col.label}
                </Text>
              ))}
            </View>

            {groups.map((g, i) => (
              <View
                key={g.clientId ?? `unassigned-${i}`}
                style={[styles.row, ...(i % 2 === 1 ? [styles.rowAlt] : [])]}
                wrap={false}
              >
                <Text style={cellStyle(EXEC_COLS[0])}>{g.clientName}</Text>
                <Text style={cellStyle(EXEC_COLS[1])}>{g.totals.guards}</Text>
                <Text style={cellStyle(EXEC_COLS[2])}>{g.totals.activeGuards}</Text>
                <Text style={cellStyle(EXEC_COLS[3])}>{g.totals.disabledGuards}</Text>
                <Text style={cellStyle(EXEC_COLS[4])}>{g.totals.totalShifts}</Text>
                <Text style={cellStyle(EXEC_COLS[5])}>{pct(g.totals.attendancePercentage)}</Text>
                <Text style={cellStyle(EXEC_COLS[6])}>{fmt(g.totals.totalMinutesLate)}</Text>
                <Text style={cellStyle(EXEC_COLS[7])}>
                  {g.totals.outstandingDebt > 0 ? money(g.totals.outstandingDebt) : "—"}
                </Text>
                <Text style={cellStyle(EXEC_COLS[8])}>
                  {g.totals.deductedThisPeriod > 0 ? money(g.totals.deductedThisPeriod) : "—"}
                </Text>
              </View>
            ))}

            <View style={styles.totalRow} wrap={false}>
              <Text style={{ width: execLeftWidth, paddingLeft: 2 }}>
                COMPANY GRAND TOTALS ({groups.length} Client Accounts)
              </Text>
              <Text style={cellStyle(EXEC_COLS[1])}>{t.guards}</Text>
              <Text style={cellStyle(EXEC_COLS[2])}>{t.activeGuards}</Text>
              <Text style={cellStyle(EXEC_COLS[3])}>{t.disabledGuards}</Text>
              <Text style={cellStyle(EXEC_COLS[4])}>{t.totalShifts}</Text>
              <Text style={cellStyle(EXEC_COLS[5])}>{pct(t.attendancePercentage)}</Text>
              <Text style={cellStyle(EXEC_COLS[6])}>{fmt(t.totalMinutesLate)}</Text>
              <Text style={cellStyle(EXEC_COLS[7])}>{money(t.outstandingDebt)}</Text>
              <Text style={cellStyle(EXEC_COLS[8])}>{money(t.deductedThisPeriod)}</Text>
            </View>
          </View>

          {/* Executive Signatures */}
          <View style={styles.signatures} wrap={false}>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Prepared by (HR Officer)</Text>
              <Text style={styles.sigSub}>Name &amp; Signature / Date</Text>
            </View>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Verified by (Bursar / Accounts Head)</Text>
              <Text style={styles.sigSub}>Name &amp; Signature / Date</Text>
            </View>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Approved by (Managing Director / COO)</Text>
              <Text style={styles.sigSub}>Name &amp; Signature / Date</Text>
            </View>
          </View>

          <PageFooter data={data} chunkTitle="Master Overview" />
        </Page>
      )}

      {/* 2. Client-by-Client Chunk Pages */}
      {groups.length === 0 ? (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Masthead data={data} />
          <View style={styles.scope}>
            <Text>
              <Text style={styles.scopeLabel}>Scope &amp; Filters: </Text>
              {data.scopeLines.join(" · ")}
            </Text>
          </View>
          <Text style={{ marginTop: 24, color: MUTED, fontSize: 8.5, textAlign: "center" }}>
            No guards match the selected scope and criteria for this period.
          </Text>
          <PageFooter data={data} />
        </Page>
      ) : (
        groups.map((group) => {
          const gt = group.totals;
          return (
            <Page
              key={group.clientId ?? group.clientName}
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              <Masthead data={data} subLabel={group.clientName} />

              {/* Client Header Banner */}
              <View style={styles.clientBanner}>
                <Text style={styles.clientBannerTitle}>Client: {group.clientName}</Text>
                <Text style={styles.clientBannerMeta}>
                  {gt.guards} Guards Total ({gt.activeGuards} Active, {gt.disabledGuards} Disabled)
                </Text>
              </View>

              {/* Client KPI Strip */}
              <View style={styles.kpiStrip}>
                <Kpi value={String(gt.guards)} label="Guards Assigned" />
                <Kpi value={fmt(gt.totalShifts)} label="Client Shifts" />
                <Kpi value={pct(gt.attendancePercentage)} label="Attendance Rate" />
                <Kpi value={fmt(gt.lateCount)} label="Late Incidents" />
                <Kpi value={fmt(gt.totalMinutesLate)} label="Min Late" />
                <Kpi value={fmt(gt.notPermittedCount)} label="Unexcused Abs" />
                <Kpi value={money(gt.outstandingDebt)} label="Outstanding Debt" />
                <Kpi value={money(gt.deductedThisPeriod)} label="Deducted in Period" />
              </View>

              {/* Client Guard Roster Table */}
              <View>
                <View style={styles.tableHead} fixed>
                  {SUMMARY_COLS.map((col) => (
                    <Text key={col.key} style={cellStyle(col)}>
                      {col.label}
                    </Text>
                  ))}
                </View>

                {group.rows.map((row, i) => {
                  const vals = rowValues(row);
                  return (
                    <View
                      key={row.employeeId}
                      style={[
                        styles.row,
                        ...(i % 2 === 1 ? [styles.rowAlt] : []),
                        ...(!row.isActive ? [styles.rowDisabled] : []),
                      ]}
                      wrap={false}
                    >
                      {SUMMARY_COLS.map((col) => (
                        <Text key={col.key} style={cellStyle(col)}>
                          {vals[col.key]}
                        </Text>
                      ))}
                    </View>
                  );
                })}

                {/* Client Subtotals Row */}
                <View style={styles.totalRow} wrap={false}>
                  <Text style={{ width: totalColLeft, paddingLeft: 2 }}>
                    SUBTOTALS — {group.clientName.toUpperCase()} ({gt.guards} guards: {gt.activeGuards} active, {gt.disabledGuards} disabled)
                  </Text>
                  <Text style={{ width: COLS.shifts, textAlign: "right", paddingRight: 2 }}>{gt.totalShifts}</Text>
                  <Text style={{ width: COLS.present, textAlign: "right", paddingRight: 2 }}>{gt.presentCount}</Text>
                  <Text style={{ width: COLS.late, textAlign: "right", paddingRight: 2 }}>{gt.lateCount}</Text>
                  <Text style={{ width: COLS.absent, textAlign: "right", paddingRight: 2 }}>{gt.absentCount}</Text>
                  <Text style={{ width: COLS.sick, textAlign: "right", paddingRight: 2 }}>{gt.sickCount}</Text>
                  <Text style={{ width: COLS.perm, textAlign: "right", paddingRight: 2 }}>{gt.permittedCount}</Text>
                  <Text style={{ width: COLS.nperm, textAlign: "right", paddingRight: 2 }}>{gt.notPermittedCount}</Text>
                  <Text style={{ width: COLS.minLate, textAlign: "right", paddingRight: 2 }}>{gt.totalMinutesLate}</Text>
                  <Text style={{ width: COLS.att, textAlign: "right", paddingRight: 2 }}>{pct(gt.attendancePercentage)}</Text>
                  <Text style={{ width: COLS.debt, textAlign: "right", paddingRight: 2 }}>{fmt(Math.round(gt.outstandingDebt))}</Text>
                  <Text style={{ width: COLS.ded, textAlign: "right", paddingRight: 2 }}>{fmt(Math.round(gt.deductedThisPeriod))}</Text>
                  <Text style={{ width: COLS.status, textAlign: "center" }}>—</Text>
                </View>
              </View>

              {/* Client Guard Dossiers (Optional) */}
              {data.includeDetails && group.rows.length > 0 && (
                <View break>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: GOLD, marginTop: 4, marginBottom: 4 }}>
                    Guard Dossiers &amp; Next-of-Kin Details — {group.clientName}
                  </Text>
                  {group.rows.map((row) => (
                    <DetailCard key={row.employeeId} row={row} />
                  ))}
                </View>
              )}

              {/* Client Signatures Block */}
              <View style={styles.signatures} wrap={false}>
                <View style={styles.sigBox}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Prepared by (HR Officer)</Text>
                  <Text style={styles.sigSub}>Name &amp; Signature / Date</Text>
                </View>
                <View style={styles.sigBox}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Verified by (Bursar / Accounts)</Text>
                  <Text style={styles.sigSub}>Name &amp; Signature / Date</Text>
                </View>
                <View style={styles.sigBox}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Approved by (Operations / Client Manager)</Text>
                  <Text style={styles.sigSub}>Name &amp; Signature / Date</Text>
                </View>
              </View>

              <PageFooter data={data} chunkTitle={group.clientName} />
            </Page>
          );
        })
      )}
    </Document>
  );
}

export async function renderGuardPayrollPdf(data: GuardPayrollPdfData): Promise<Buffer> {
  return renderToBuffer(<GuardPayrollDocument data={data} />);
}
