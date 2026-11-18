import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { WorkPlanStatus } from "@/lib/db/schema";
import { WORK_PLAN_STATUS_SW } from "@/features/mpangokazi/components/labels";

export type MpangokaziPdfData = {
  company: string;
  date: string; // YYYY-MM-DD
  branchName: string;
  preparedByName: string;
  jobPosition: string;
  signatureDataUrl: string;
  totals: {
    total: number;
    present: number;
    off: number;
    permitted: number;
    sick: number;
    absent: number;
  };
  notes: string | null;
  entries: { position: number; guardName: string; point: string; status: WorkPlanStatus }[];
};


const GOLD = "#9f7223";

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  header: { borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 8, marginBottom: 10 },
  company: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center" },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD, textAlign: "center", marginTop: 3 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  metaItem: { flexDirection: "row" },
  metaLabel: { fontFamily: "Helvetica-Bold", marginRight: 4 },
  totals: { flexDirection: "row", borderWidth: 1, borderColor: "#cbd5e1", marginBottom: 12 },
  totalCell: { flex: 1, padding: 5, borderRightWidth: 1, borderRightColor: "#cbd5e1", alignItems: "center" },
  totalCellLast: { flex: 1, padding: 5, alignItems: "center" },
  totalLabel: { fontSize: 7, color: "#475569", textAlign: "center" },
  totalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
  tableHead: { flexDirection: "row", backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1" },
  row: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#cbd5e1" },
  th: { padding: 4, fontFamily: "Helvetica-Bold", fontSize: 8 },
  td: { padding: 4, fontSize: 8.5 },
  cNo: { width: "8%" },
  cName: { width: "40%" },
  cPoint: { width: "32%" },
  cStatus: { width: "20%" },
  notes: { marginTop: 10, padding: 6, backgroundColor: "#f8fafc" },
  footer: { marginTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sigBox: { width: 180, alignItems: "center" },
  sigImg: { width: 160, height: 60, objectFit: "contain" },
  sigLine: { borderTopWidth: 1, borderTopColor: "#0f172a", width: 170, marginTop: 2, paddingTop: 2, textAlign: "center", fontSize: 8 },
  pageNo: { position: "absolute", bottom: 16, right: 32, fontSize: 7, color: "#94a3b8" },
});

function formatSwDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function MpangokaziDocument({ data }: { data: MpangokaziPdfData }) {
  const t = data.totals;
  const cells: [string, number][] = [
    ["Jumla ya walinzi", t.total],
    ["Waliopo", t.present],
    ["Off", t.off],
    ["Ruhusa", t.permitted],
    ["Wagonjwa", t.sick],
    ["Hawapo (bila sababu)", t.absent],
  ];

  return (
    <Document title={`Mpangokazi ${data.branchName} ${data.date}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.company}>{data.company}</Text>
          <Text style={s.title}>FOMU YA MPANGOKAZI</Text>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Mkoa:</Text>
            <Text>{data.branchName}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Tarehe:</Text>
            <Text>{formatSwDate(data.date)}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Msimamizi:</Text>
            <Text>{data.preparedByName}</Text>
          </View>
        </View>

        <View style={s.totals}>
          {cells.map(([label, value], i) => (
            <View key={label} style={i === cells.length - 1 ? s.totalCellLast : s.totalCell}>
              <Text style={s.totalLabel}>{label}</Text>
              <Text style={s.totalValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.tableHead} fixed>
          <Text style={[s.th, s.cNo]}>Na.</Text>
          <Text style={[s.th, s.cName]}>Jina la mlinzi</Text>
          <Text style={[s.th, s.cPoint]}>Point (eneo)</Text>
          <Text style={[s.th, s.cStatus]}>Hali</Text>
        </View>
        {data.entries.map((e) => (
          <View key={e.position} style={s.row} wrap={false}>
            <Text style={[s.td, s.cNo]}>{e.position}</Text>
            <Text style={[s.td, s.cName]}>{e.guardName}</Text>
            <Text style={[s.td, s.cPoint]}>{e.point}</Text>
            <Text style={[s.td, s.cStatus]}>{WORK_PLAN_STATUS_SW[e.status]}</Text>
          </View>
        ))}

        {data.notes && (
          <View style={s.notes}>
            <Text style={s.metaLabel}>Maelezo:</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        <View style={s.footer} wrap={false}>
          <View>
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Imeandaliwa na:</Text>
              <Text>{data.preparedByName}</Text>
            </View>
            <View style={[s.metaItem, { marginTop: 4 }]}>
              <Text style={s.metaLabel}>Cheo:</Text>
              <Text>{data.jobPosition}</Text>
            </View>
          </View>
          <View style={s.sigBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            <Image style={s.sigImg} src={data.signatureDataUrl} />
            <Text style={s.sigLine}>Sahihi</Text>
          </View>
        </View>

        <Text
          style={s.pageNo}
          render={({ pageNumber, totalPages }) => `Ukurasa ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

export async function renderMpangokaziPdf(data: MpangokaziPdfData): Promise<Buffer> {
  return renderToBuffer(<MpangokaziDocument data={data} />);
}
