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
  regionName: string | null;
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

export type GuardPayrollPdfData = {
  title: string;
  company: string;
  companySubtitle: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  generatedBy: string;
  /** e.g. ["All guards (active + those disabled during the period)", "Region: Dar es Salaam"] */
  scopeLines: string[];
  piiIncluded: boolean;
  includeDetails: boolean;
  totals: GuardPayrollPdfTotals;
  rows: GuardPayrollPdfRow[];
};

const GOLD = "#9f7223";
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
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: INK,
  },
  companySub: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 1,
  },
  title: {
    fontSize: 11,
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
  kpiStrip: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 8,
  },
  kpi: {
    flexGrow: 1,
    backgroundColor: ALT,
    borderWidth: 0.75,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 5,
  },
  kpiValue: {
    fontSize: 10,
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
    paddingVertical: 4,
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
    backgroundColor: "#fef8ec",
    borderTopWidth: 1.5,
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
    marginTop: 22,
    paddingHorizontal: 12,
  },
  sigBox: {
    width: "28%",
  },
  sigLine: {
    borderTopWidth: 0.75,
    borderTopColor: INK,
    marginBottom: 4,
  },
  sigLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: INK,
  },
  sigSub: {
    fontSize: 6,
    color: MUTED,
  },
  detailBlock: {
    borderWidth: 0.75,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    backgroundColor: "#ffffff",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingBottom: 4,
    marginBottom: 6,
  },
  detailName: {
    fontSize: 9,
    fontWeight: 700,
    color: GOLD,
  },
  detailEmp: {
    fontSize: 7.5,
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
    marginBottom: 3,
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

// Column widths — Usable ~780pt
const COLS = {
  emp: 46,
  name: 92,
  phone: 60,
  gender: 18,
  age: 18,
  work: 70,
  region: 50,
  client: 50,
  sup: 58,
  shifts: 22,
  present: 18,
  late: 18,
  absent: 18,
  sick: 18,
  perm: 20,
  nperm: 20,
  minLate: 26,
  att: 30,
  debt: 50,
  ded: 50,
  status: 38,
} as const;

type Col = { key: string; label: string; width: number; align?: "right" | "left" | "center" };

const SUMMARY_COLS: Col[] = [
  { key: "emp", label: "EMP #", width: COLS.emp },
  { key: "name", label: "FULL NAME", width: COLS.name },
  { key: "phone", label: "PHONE", width: COLS.phone },
  { key: "gender", label: "G", width: COLS.gender, align: "center" },
  { key: "age", label: "AGE", width: COLS.age, align: "right" },
  { key: "work", label: "WORK SITE", width: COLS.work },
  { key: "region", label: "REGION", width: COLS.region },
  { key: "client", label: "CLIENT", width: COLS.client },
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
    region: row.regionName ?? "—",
    client: row.clientName ?? "—",
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

function DetailCard({ row }: { row: GuardPayrollPdfRow }) {
  const fields: Array<[string, string]> = [
    ["Employee ID", row.employeeId],
    ["Gender / Age", `${row.gender} / ${row.age} yrs`],
    ["Contact Phone", row.phone || "—"],
    ["Email Address", row.email || "—"],
    ["Home Location", row.homeLocation || "—"],
    ["Work Site", row.workLocation || "—"],
    ["Region / Station", row.regionName ?? "—"],
    ["Client Posting", row.clientName ?? "—"],
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
  const noPiiNote = data.piiIncluded
    ? "Contains confidential personal & financial data — handle per HKB Security policy."
    : "Personal contact details withheld (viewing without PII clearance).";

  const totalColLeft =
    COLS.emp + COLS.name + COLS.phone + COLS.gender + COLS.age + COLS.work + COLS.region + COLS.client + COLS.sup;

  return (
    <Document
      title={data.title}
      author="HKB Protection & Management Co."
      subject={`Guard payroll export — ${data.periodLabel}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Masthead */}
        <View style={styles.masthead} fixed>
          <View>
            <Text style={styles.company}>{data.company}</Text>
            <Text style={styles.companySub}>{data.companySubtitle}</Text>
          </View>
          <View>
            <Text style={styles.title}>{data.title.toUpperCase()}</Text>
            <Text style={styles.meta}>
              Period: {data.periodLabel}
              {"\n"}Generated: {data.generatedAt} · By: {data.generatedBy}
            </Text>
          </View>
        </View>

        {/* Scope info */}
        <View style={styles.scope}>
          <Text>
            <Text style={styles.scopeLabel}>Scope & Filters: </Text>
            {data.scopeLines.join(" · ")}
          </Text>
        </View>

        {/* KPI Strip */}
        <View style={styles.kpiStrip}>
          <Kpi value={String(t.guards)} label="Guards Listed" />
          <Kpi value={String(t.activeGuards)} label="Active" />
          <Kpi value={String(t.disabledGuards)} label="Disabled" />
          <Kpi value={fmt(t.totalShifts)} label="Total Shifts" />
          <Kpi value={pct(t.attendancePercentage)} label="Attendance Rate" />
          <Kpi value={fmt(t.totalMinutesLate)} label="Min Late" />
          <Kpi value={money(t.outstandingDebt)} label="Outstanding Debt" />
          <Kpi value={money(t.deductedThisPeriod)} label="Deducted in Period" />
        </View>

        {/* Table */}
        <View>
          <View style={styles.tableHead} fixed>
            {SUMMARY_COLS.map((col) => (
              <Text key={col.key} style={cellStyle(col)}>
                {col.label}
              </Text>
            ))}
          </View>

          {data.rows.length === 0 ? (
            <Text style={{ marginTop: 12, color: MUTED, fontSize: 8, textAlign: "center" }}>
              No guards match the selected scope and criteria for this period.
            </Text>
          ) : (
            data.rows.map((row, i) => {
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
            })
          )}

          {data.rows.length > 0 && (
            <View style={styles.totalRow} wrap={false}>
              <Text style={{ width: totalColLeft, paddingLeft: 2 }}>
                GRAND TOTALS ({t.guards} guards: {t.activeGuards} active, {t.disabledGuards} disabled)
              </Text>
              <Text style={{ width: COLS.shifts, textAlign: "right", paddingRight: 2 }}>{t.totalShifts}</Text>
              <Text style={{ width: COLS.present, textAlign: "right", paddingRight: 2 }}>{t.presentCount}</Text>
              <Text style={{ width: COLS.late, textAlign: "right", paddingRight: 2 }}>{t.lateCount}</Text>
              <Text style={{ width: COLS.absent, textAlign: "right", paddingRight: 2 }}>{t.absentCount}</Text>
              <Text style={{ width: COLS.sick, textAlign: "right", paddingRight: 2 }}>{t.sickCount}</Text>
              <Text style={{ width: COLS.perm, textAlign: "right", paddingRight: 2 }}>{t.permittedCount}</Text>
              <Text style={{ width: COLS.nperm, textAlign: "right", paddingRight: 2 }}>{t.notPermittedCount}</Text>
              <Text style={{ width: COLS.minLate, textAlign: "right", paddingRight: 2 }}>{t.totalMinutesLate}</Text>
              <Text style={{ width: COLS.att, textAlign: "right", paddingRight: 2 }}>{pct(t.attendancePercentage)}</Text>
              <Text style={{ width: COLS.debt, textAlign: "right", paddingRight: 2 }}>{fmt(Math.round(t.outstandingDebt))}</Text>
              <Text style={{ width: COLS.ded, textAlign: "right", paddingRight: 2 }}>{fmt(Math.round(t.deductedThisPeriod))}</Text>
              <Text style={{ width: COLS.status, textAlign: "center" }}>—</Text>
            </View>
          )}
        </View>

        {/* Optional Guard Details Section */}
        {data.includeDetails && data.rows.length > 0 && (
          <View break>
            <Text style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginTop: 4, marginBottom: 4 }}>
              Guard Directory Dossiers &amp; Next-of-Kin Details
            </Text>
            {data.rows.map((row) => (
              <DetailCard key={row.employeeId} row={row} />
            ))}
          </View>
        )}

        {/* Signatures */}
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
            <Text style={styles.sigLabel}>Approved by (Operations / Management)</Text>
            <Text style={styles.sigSub}>Name &amp; Signature / Date</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{noPiiNote}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          <Text>{data.company} · Confidential Payroll Dossier</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderGuardPayrollPdf(data: GuardPayrollPdfData): Promise<Buffer> {
  return renderToBuffer(<GuardPayrollDocument data={data} />);
}
