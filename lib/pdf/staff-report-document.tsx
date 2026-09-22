import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { AttendanceStatus, AbsenceCategory, Role, Gender } from "@/lib/db/schema";
import { ROLE_LABELS } from "@/lib/auth/rbac";

export type StaffReportRow = {
  date: string;
  staffName: string;
  staffEmail: string;
  staffRole: Role;
  staffGender: Gender;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  absenceCategory: AbsenceCategory | null;
  allowedDays: number | null;
  minutesLate: number | null;
  reason: string | null;
  recordedByName: string;
};

export type StaffReportData = {
  title: string;
  company: string;
  date: string;
  startDate?: string;
  endDate?: string;
  generatedAt: string;
  generatedBy: string;
  rows: StaffReportRow[];
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: "#9f7223",
    paddingBottom: 10,
  },
  companyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  company: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  subCompany: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  title: {
    fontSize: 12,
    color: "#9f7223",
    fontWeight: "bold",
    marginTop: 4,
  },
  metaRight: {
    textAlign: "right",
    fontSize: 8,
    color: "#64748b",
  },
  metaHighlight: {
    fontWeight: "bold",
    color: "#0f172a",
  },
  summarySection: {
    marginVertical: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryBox: {
    width: "18%",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 7.5,
    color: "#64748b",
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 1,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: "bold",
    fontSize: 7.5,
    borderRadius: 2,
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    fontSize: 7.5,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  cellDate: { width: "11%" },
  cellName: { width: "20%" },
  cellRole: { width: "13%" },
  cellStatus: { width: "13%" },
  cellCheckIn: { width: "10%" },
  cellCheckOut: { width: "10%" },
  cellAbsence: { width: "12%" },
  cellRecordedBy: { width: "11%" },

  statusPresent: { color: "#15803d", fontWeight: "bold" },
  statusLate: { color: "#b45309", fontWeight: "bold" },
  statusAbsent: { color: "#be123c", fontWeight: "bold" },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#94a3b8",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 14,
  },
  signBox: {
    width: "40%",
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 4,
    fontSize: 7.5,
    color: "#475569",
  },
});

export function StaffReportDocument({ data }: { data: StaffReportData }) {
  const total = data.rows.length;
  const present = data.rows.filter((r) => r.status === "PRESENT").length;
  const late = data.rows.filter((r) => r.status === "LATE").length;
  const absent = data.rows.filter((r) => r.status === "ABSENT").length;
  const sick = data.rows.filter((r) => r.absenceCategory === "SICK").length;
  const permitted = data.rows.filter((r) => r.absenceCategory === "PERMITTED_REASON").length;
  const unauthorized = data.rows.filter((r) => r.absenceCategory === "NOT_PERMITTED").length;
  const totalLateMinutes = data.rows.reduce((sum, r) => sum + (r.minutesLate || 0), 0);

  const attendancePct =
    total > 0 ? (Math.round(((present + late) / total) * 1000) / 10).toFixed(1) : "0.0";

  return (
    <Document title={data.title} author={data.company}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyRow}>
            <View>
              <Text style={styles.company}>{data.company}</Text>
              <Text style={styles.subCompany}>
                Office &amp; Operational Staff Roll Call &amp; Punctuality Register
              </Text>
              <Text style={styles.title}>{data.title}</Text>
            </View>
            <View style={styles.metaRight}>
              <Text>
                Report Scope:{" "}
                <Text style={styles.metaHighlight}>
                  {data.startDate && data.endDate
                    ? `${data.startDate} to ${data.endDate}`
                    : data.date}
                </Text>
              </Text>
              <Text style={{ marginTop: 2 }}>Generated: {data.generatedAt}</Text>
              <Text style={{ marginTop: 2 }}>Issued by: {data.generatedBy}</Text>
            </View>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Attendance Performance Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total Staff Records</Text>
              <Text style={styles.summaryValue}>{total}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Present (On-Time)</Text>
              <Text style={[styles.summaryValue, { color: "#15803d" }]}>{present}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Late Arrivals</Text>
              <Text style={[styles.summaryValue, { color: "#b45309" }]}>
                {late} {totalLateMinutes > 0 ? `(${totalLateMinutes}m)` : ""}
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Absences (S/P/U)</Text>
              <Text style={[styles.summaryValue, { color: "#be123c" }]}>
                {absent} ({sick}/{permitted}/{unauthorized})
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Attendance Rate</Text>
              <Text style={[styles.summaryValue, { color: "#9f7223" }]}>
                {attendancePct}%
              </Text>
            </View>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.tableHead}>
          <Text style={styles.cellDate}>Date</Text>
          <Text style={styles.cellName}>Staff Member</Text>
          <Text style={styles.cellRole}>Role</Text>
          <Text style={styles.cellStatus}>Status</Text>
          <Text style={styles.cellCheckIn}>Check-In</Text>
          <Text style={styles.cellCheckOut}>Sign-Out</Text>
          <Text style={styles.cellAbsence}>Absence / Notes</Text>
          <Text style={styles.cellRecordedBy}>Recorded By</Text>
        </View>

        {/* Table Rows */}
        {data.rows.map((r, i) => (
          <View
            key={`${r.date}-${r.staffName}-${i}`}
            style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <Text style={styles.cellDate}>{r.date}</Text>
            <Text style={[styles.cellName, { fontWeight: "bold" }]}>
              {r.staffName}
            </Text>
            <Text style={styles.cellRole}>{ROLE_LABELS[r.staffRole] ?? r.staffRole}</Text>
            <Text
              style={[
                styles.cellStatus,
                r.status === "PRESENT"
                  ? styles.statusPresent
                  : r.status === "LATE"
                    ? styles.statusLate
                    : styles.statusAbsent,
              ]}
            >
              {r.status === "LATE"
                ? `Late (+${r.minutesLate || 0}m)`
                : r.status === "ABSENT"
                  ? `Absent (${
                      r.absenceCategory === "SICK"
                        ? "Sick"
                        : r.absenceCategory === "PERMITTED_REASON"
                          ? "Permitted"
                          : "Unauthorized"
                    })`
                  : "Present"}
            </Text>
            <Text style={styles.cellCheckIn}>{r.checkInTime || "—"}</Text>
            <Text style={styles.cellCheckOut}>{r.checkOutTime || "—"}</Text>
            <Text style={styles.cellAbsence}>
              {r.reason ? r.reason.slice(0, 30) : r.allowedDays ? `Allowed: ${r.allowedDays}d` : "—"}
            </Text>
            <Text style={styles.cellRecordedBy}>{r.recordedByName}</Text>
          </View>
        ))}

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signBox}>
            <Text style={{ fontWeight: "bold" }}>Prepared By: Secretary / HR Admin</Text>
            <Text style={{ marginTop: 2, fontSize: 7, color: "#64748b" }}>
              Signature: ______________________ Date: ___________
            </Text>
          </View>
          <View style={styles.signBox}>
            <Text style={{ fontWeight: "bold" }}>Approved By: Bursar / Super Admin</Text>
            <Text style={{ marginTop: 2, fontSize: 7, color: "#64748b" }}>
              Signature: ______________________ Date: ___________
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>HKB Protection &amp; Management Co. — Official Staff Attendance Register</Text>
          <Text>Confidential Document for Internal &amp; Payroll Compliance</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderStaffReportPdf(data: StaffReportData): Promise<Buffer> {
  return renderToBuffer(<StaffReportDocument data={data} />);
}
