import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument, type ReportData } from "./report-document";

export async function renderReportPdf(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}