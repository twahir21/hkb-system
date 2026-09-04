import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { AttendanceStatus, AbsenceCategory, ShiftType } from "@/lib/db/schema";

export type ReportRow = {
  date: string;
  shift: ShiftType;
  status: AttendanceStatus;
  guardName: string;
  employeeId: string;
  supervisorName: string;
  absenceCategory: AbsenceCategory | null;
  allowedDays: number | null;
  minutesLate: number | null;
  reason: string | null;
};

export type ReportData = {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  rows: ReportRow[];
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  header: { marginBottom: 16 },
  company: { fontSize: 14, fontWeight: "bold", marginBottom: 2, color: "#0f172a" },
  title: { fontSize: 11, color: "#9f7223", fontWeight: "bold" },
  meta: { fontSize: 8, color: "#64748b", marginTop: 4 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#cbd5e1", marginVertical: 10 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 6 },
  summaryRow: { flexDirection: "row", gap: 6, width: "30%", marginBottom: 4 },
  summaryLabel: { color: "#475569" },
  summaryValue: { fontWeight: "bold" },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0f172a", paddingVertical: 4, fontWeight: "bold" },
  cellEmp: { width: 70 },
  cellName: { width: 130 },
  cellDate: { width: 70 },
  cellShift: { width: 55 },
  cellStatus: { width: 75 },
  cellCat: { width: 110 },
  cellSup: { width: 130 },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7, color: "#94a3b8", textAlign: "center" },
});

export function ReportDocument({ data }: { data: ReportData }) {
  const total = data.rows.length;
  const present = data.rows.filter((r) => r.status === "PRESENT").length;
  const late = data.rows.filter((r) => r.status === "LATE").length;
  const absent = data.rows.filter((r) => r.status === "ABSENT").length;
  const sick = data.rows.filter((r) => r.absenceCategory === "SICK").length;
  const permitted = data.rows.filter((r) => r.absenceCategory === "PERMITTED_REASON").length;
  const notPermitted = data.rows.filter((r) => r.absenceCategory === "NOT_PERMITTED").length;
  const totalLateMinutes = data.rows.reduce((sum, r) => sum + (r.minutesLate || 0), 0);

  const attendancePct =
    total > 0 ? (Math.round(((present + late) / total) * 1000) / 10).toFixed(1) : "0.0";
  const onTimePct =
    total > 0 ? (Math.round((present / total) * 1000) / 10).toFixed(1) : "0.0";

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <View style={styles.header}>
          <Text style={styles.company}>{data.company}</Text>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.meta}>
            Period: {data.startDate} → {data.endDate} · Generated: {data.generatedAt}
          </Text>
        </View>

        <View style={styles.rule} />

        <View style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Overall Attendance Rate:</Text>
            <Text style={styles.summaryValue}>{attendancePct}%</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>On-Time Rate:</Text>
            <Text style={styles.summaryValue}>{onTimePct}%</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Shifts Recorded:</Text>
            <Text style={styles.summaryValue}>{total}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Present (On-Time):</Text>
            <Text style={styles.summaryValue}>{present}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Late Arrivals:</Text>
            <Text style={styles.summaryValue}>{late} ({totalLateMinutes}m delay)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Absences:</Text>
            <Text style={styles.summaryValue}>{absent}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sick (doc-backed):</Text>
            <Text style={styles.summaryValue}>{sick}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Permitted Reason:</Text>
            <Text style={styles.summaryValue}>{permitted}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Not Permitted (payroll flag):</Text>
            <Text style={styles.summaryValue}>{notPermitted}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.tableHead}>
          <Text style={styles.cellEmp}>Emp ID</Text>
          <Text style={styles.cellName}>Guard</Text>
          <Text style={styles.cellDate}>Date</Text>
          <Text style={styles.cellShift}>Shift</Text>
          <Text style={styles.cellStatus}>Status</Text>
          <Text style={styles.cellCat}>Absence / Delay</Text>
          <Text style={styles.cellSup}>Supervisor</Text>
        </View>

        {data.rows.map((r, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.cellEmp}>{r.employeeId}</Text>
            <Text style={styles.cellName}>{r.guardName}</Text>
            <Text style={styles.cellDate}>{r.date}</Text>
            <Text style={styles.cellShift}>{r.shift}</Text>
            <Text style={styles.cellStatus}>{r.status}{r.status === "LATE" && r.minutesLate ? ` (+${r.minutesLate}m)` : ""}</Text>
            <Text style={styles.cellCat}>{r.absenceCategory ? `${r.absenceCategory}${r.allowedDays ? ` (${r.allowedDays}d)` : ""}` : (r.reason ?? "—")}</Text>
            <Text style={styles.cellSup}>{r.supervisorName}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          © HKB Protection and Management Company · This report is confidential and generated by the HKB Attendance System.
        </Text>
      </Page>
    </Document>
  );
}