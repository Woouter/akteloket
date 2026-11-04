import "server-only";
import { AlignmentType, BorderStyle, Document, Footer, Header, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { DocIR, Run } from "./ir";

/** Rendert het tussenformaat naar een bewerkbaar Word-document voor de notaris. */
export async function irToDocx(ir: DocIR, footerText: string): Promise<Buffer> {
  const FONT = "Times New Roman";
  const runs = (rs: Run[], bold = false) =>
    rs.map((r) =>
      typeof r === "string"
        ? new TextRun({ text: r, bold, font: FONT, size: 22 })
        : new TextRun({ text: r.t, bold, font: FONT, size: 22, highlight: r.k === "filled" ? undefined : "yellow", color: r.k === "missing" ? "B91C1C" : r.k === "check" ? "B45309" : undefined, underline: r.k === "filled" ? { type: "dotted", color: "34B27B" } : undefined }),
    );
  const children: (Paragraph | Table)[] = [];
  if (ir.concept) children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "CONCEPT — ter controle en vaststelling door de notaris", bold: true, color: "B45309", size: 18, font: "Arial" })] }));
  for (const b of ir.blocks) {
    switch (b.type) {
      case "title": children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120 }, children: [new TextRun({ text: b.text, bold: true, size: 30, font: FONT })] })); break;
      case "subtitle": children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: b.text, size: 20, font: FONT, color: "555577" })] })); break;
      case "h": children.push(new Paragraph({ spacing: { before: 240, after: 80 }, children: [new TextRun({ text: b.text, bold: true, size: 22, font: FONT, allCaps: true })] })); break;
      case "p": children.push(new Paragraph({ spacing: { after: 120, line: 300 }, alignment: AlignmentType.JUSTIFIED, children: runs(b.runs) })); break;
      case "li": children.push(new Paragraph({ spacing: { after: 80, line: 300 }, indent: { left: 400, hanging: 400 }, children: [new TextRun({ text: `${b.n ?? "-"}\t`, font: FONT, size: 22 }), ...runs(b.runs)] })); break;
      case "note": children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: b.text, italics: true, size: 18, font: "Arial", color: "636C99" })] })); break;
      case "sig": for (const l of b.lines) children.push(new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: l, font: FONT, size: 22 })] })); break;
      case "table":
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "DDDDEE" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
          rows: b.rows.map((r) => new TableRow({ children: [
            new TableCell({ width: { size: 62, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: r.label, bold: r.strong, font: FONT, size: 21 })] })] }),
            new TableCell({ width: { size: 38, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: runs(r.value, r.strong) })] }),
          ] })),
        }));
        break;
    }
  }
  if (ir.controlepunten.length || ir.bronnen.length) {
    children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: "BIJLAGE VOOR DE NOTARIS — niet opnemen in de definitieve akte", bold: true, size: 20, font: "Arial", color: "B45309" })] }));
    if (ir.controlepunten.length) {
      children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: "Controlepunten", bold: true, size: 22, font: "Arial" })] }));
      ir.controlepunten.forEach((c, i) => children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${i + 1}. ${c}`, size: 20, font: "Arial" })] })));
    }
    if (ir.bronnen.length) {
      children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: "Gebruikte bronnen", bold: true, size: 22, font: "Arial" })] }));
      ir.bronnen.forEach((b) => children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `${b.label}: `, bold: true, size: 18, font: "Arial" }), new TextRun({ text: b.bron, size: 18, font: "Arial" })] })));
    }
  }
  const doc = new Document({
    creator: "Akteloket",
    title: ir.title,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1300, bottom: 1200, left: 1500, right: 1300 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: footerText, size: 16, color: "8D94B8", font: "Arial" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Pagina ", PageNumber.CURRENT, " van ", PageNumber.TOTAL_PAGES], size: 16, color: "8D94B8", font: "Arial" })] })] }) },
      children,
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
