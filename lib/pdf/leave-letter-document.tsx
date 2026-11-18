import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export type LeaveLetterPdfData = {
  company: string;
  reference: string;
  issuedOn: string; // YYYY-MM-DD
  employeeName: string;
  employeeNo: string | null;
  jobTitle: string | null;
  branchName: string | null;
  typeLabel: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD, day after endDate
  days: number;
  reason: string | null;
  approvedByName: string | null;
  approvedOn: string | null; // YYYY-MM-DD
  reviewNotes: string | null;
};

const GOLD = "#9f7223";

const s = StyleSheet.create({
  page: { padding: 48, fontSize: 10.5, fontFamily: "Helvetica", color: "#0f172a", lineHeight: 1.5 },
  header: { borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 8, marginBottom: 16 },
  company: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "center" },
  sub: { fontSize: 9, color: "#475569", textAlign: "center", marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, fontSize: 9.5 },
  bold: { fontFamily: "Helvetica-Bold" },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    textAlign: "center",
    textDecoration: "underline",
    marginBottom: 14,
  },
  para: { marginBottom: 10, textAlign: "justify" },
  table: { borderWidth: 1, borderColor: "#cbd5e1", marginBottom: 14 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#cbd5e1" },
  trLast: { flexDirection: "row" },
  tdLabel: { width: "38%", padding: 5, backgroundColor: "#f8fafc", fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  tdValue: { width: "62%", padding: 5, fontSize: 9.5 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 36 },
  sigBox: { width: 200 },
  sigLine: { borderTopWidth: 1, borderTopColor: "#0f172a", paddingTop: 3, fontSize: 9 },
  sigName: { fontSize: 9, color: "#475569" },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 7.5, color: "#94a3b8", textAlign: "center" },
});

function swDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function LeaveLetterDocument({ data }: { data: LeaveLetterPdfData }) {
  const rows: [string, string][] = [
    ["Jina la mtumishi", data.employeeName],
    ["Namba ya mtumishi", data.employeeNo ?? "—"],
    ["Cheo", data.jobTitle ?? "—"],
    ["Tawi", data.branchName ?? "—"],
    ["Aina ya likizo", data.typeLabel],
    ["Kuanzia", swDate(data.startDate)],
    ["Hadi", swDate(data.endDate)],
    ["Idadi ya siku", String(data.days)],
    ["Kurudi kazini", swDate(data.returnDate)],
  ];
  if (data.reason) rows.push(["Sababu", data.reason]);

  return (
    <Document title={`Barua ya likizo — ${data.employeeName}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.company}>{data.company}</Text>
          <Text style={s.sub}>Idara ya Rasilimali Watu</Text>
        </View>

        <View style={s.metaRow}>
          <Text>
            <Text style={s.bold}>Kumb. Na: </Text>
            {data.reference}
          </Text>
          <Text>
            <Text style={s.bold}>Tarehe: </Text>
            {swDate(data.issuedOn)}
          </Text>
        </View>

        <Text style={s.para}>Ndugu {data.employeeName},</Text>

        <Text style={s.title}>YAH: KIBALI CHA LIKIZO</Text>

        <Text style={s.para}>
          Husika na kichwa cha habari hapo juu. Ombi lako la {data.typeLabel.toLowerCase()} limeidhinishwa
          kwa siku {data.days}, kuanzia tarehe {swDate(data.startDate)} hadi tarehe {swDate(data.endDate)}.
          Unatakiwa kuripoti kazini tarehe {swDate(data.returnDate)}.
        </Text>

        <View style={s.table}>
          {rows.map(([label, value], i) => (
            <View key={label} style={i === rows.length - 1 ? s.trLast : s.tr}>
              <Text style={s.tdLabel}>{label}</Text>
              <Text style={s.tdValue}>{value}</Text>
            </View>
          ))}
        </View>

        {data.reviewNotes && (
          <Text style={s.para}>
            <Text style={s.bold}>Maelezo: </Text>
            {data.reviewNotes}
          </Text>
        )}

        <Text style={s.para}>
          Tafadhali hakikisha majukumu yako yamekabidhiwa ipasavyo kabla ya kuondoka. Ukishindwa kurudi
          kwa tarehe iliyotajwa, toa taarifa mapema kwa msimamizi wako.
        </Text>

        <Text style={s.para}>Nakutakia likizo njema.</Text>

        <View style={s.sigRow} wrap={false}>
          <View style={s.sigBox}>
            <Text style={s.sigLine}>Sahihi ya mtumishi</Text>
            <Text style={s.sigName}>{data.employeeName}</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigLine}>Imeidhinishwa na</Text>
            <Text style={s.sigName}>
              {data.approvedByName ?? "—"}
              {data.approvedOn ? ` · ${swDate(data.approvedOn)}` : ""}
            </Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          Barua hii imetolewa na mfumo wa HKB. Kumb. {data.reference}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderLeaveLetterPdf(data: LeaveLetterPdfData): Promise<Buffer> {
  return renderToBuffer(<LeaveLetterDocument data={data} />);
}
