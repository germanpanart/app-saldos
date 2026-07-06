import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, VerticalAlign,
} from 'docx';
import { downloadBlob } from './download.js';
import { fmtARS, fmtPct } from './format.js';

const hoy = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const trunc = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
const fileDate = () => new Date().toISOString().slice(0, 10);

function totals(ocs) {
  return ocs.reduce((a, o) => {
    a.monto += o.ocMonto; a.pagado += o.totalPagado; a.saldo += o.saldo; return a;
  }, { monto: 0, pagado: 0, saldo: 0 });
}

function savePdf(doc, filename) {
  const blob = doc.output('blob');
  downloadBlob(blob, filename);
}

export function exportPDF(ocs, filtrosTxt) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const t = totals(ocs);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Informe de Saldos — Órdenes de Compra', 40, 40);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(`Dirección de Compras y Contrataciones · Generado: ${hoy()}`, 40, 56);
  doc.text(`Filtros: ${filtrosTxt || 'sin filtros'}`, 40, 70);
  doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(`OCs: ${ocs.length}   |   Monto total: ${fmtARS(t.monto)}   |   Pagado: ${fmtARS(t.pagado)}   |   Saldo pendiente: ${fmtARS(t.saldo)}`, 40, 90);

  autoTable(doc, {
    startY: 102,
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    head: [['OC N°', 'Tipo', 'Secretaría', 'Proveedor', 'Descripción', 'Monto OC', 'Pagado', 'Saldo', '% Av.']],
    body: ocs.map((o) => [
      o.ocNum, o.tipo, trunc(o.secretaria, 18), trunc(o.proveedor, 22), trunc(o.descripcion, 48),
      fmtARS(o.ocMonto), fmtARS(o.totalPagado), fmtARS(o.saldo), fmtPct(o.avance),
    ]),
    columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 7) {
        const o = ocs[d.row.index];
        if (o.estadoSaldo === 'pagada') d.cell.styles.textColor = [22, 128, 61];
        if (o.estadoSaldo === 'revisar' || o.estadoSaldo === 'sobrepago') d.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  doc.addPage();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text('Detalle e historial de pagos por Orden de Compra', 40, 40);
  let y = 58;
  ocs.forEach((o) => {
    if (y > doc.internal.pageSize.getHeight() - 90) { doc.addPage(); y = 50; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(0);
    doc.text(`${o.tipo} · OC ${o.ocNum} — ${trunc(o.descripcion, 90)}`, 40, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
    doc.text(`${o.secretaria} · ${o.proveedor} · Monto OC: ${fmtARS(o.ocMonto)} · Saldo: ${fmtARS(o.saldo)}`, 40, y + 12);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: y + 18,
      margin: { left: 40 },
      tableWidth: W - 80,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [226, 232, 240], textColor: 30 },
      head: [['Concepto', 'INF REC', 'N° Pago', 'Monto bruto', 'Monto neto', 'Saldo luego']],
      body: (o.pagos.length ? o.pagos : [{ periodo: '(sin pagos)', infRec: '', pagoNum: '', monto: 0, montoNeto: null, saldoLuego: o.ocMonto }]).map((p) => [
        p.periodo || '—', p.infRec || '—', p.pagoNum || '—', fmtARS(p.monto),
        p.montoNeto != null ? fmtARS(p.montoNeto) : '—', fmtARS(p.saldoLuego),
      ]),
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
    y = doc.lastAutoTable.finalY + 16;
  });

  savePdf(doc, `Informe_Saldos_OC_${fileDate()}.pdf`);
}

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const tableBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
  insideHorizontal: thinBorder,
  insideVertical: thinBorder,
};

const cell = (text, { bold = false, align = AlignmentType.LEFT, w } = {}) =>
  new TableCell({
    width: w ? { size: w, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text ?? ''), bold, font: 'Calibri', size: 20 })],
    })],
  });

export async function exportDOCX(ocs, filtrosTxt) {
  const t = totals(ocs);
  const children = [];

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: 'Informe de Saldos — Órdenes de Compra', font: 'Calibri' })],
  }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Dirección de Compras y Contrataciones · Generado: ${hoy()}`, italics: true, font: 'Calibri', size: 20 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Filtros: ${filtrosTxt || 'sin filtros'}`, font: 'Calibri', size: 20 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `OCs: ${ocs.length}   |   Monto total: ${fmtARS(t.monto)}   |   Pagado: ${fmtARS(t.pagado)}   |   Saldo pendiente: ${fmtARS(t.saldo)}`, bold: true, font: 'Calibri', size: 22 })] }));
  children.push(new Paragraph({ text: '' }));

  const head = ['OC N°', 'Tipo', 'Secretaría', 'Proveedor', 'Monto OC', 'Pagado', 'Saldo', '% Av.'];
  const resumenRows = [new TableRow({ tableHeader: true, children: head.map((h) => cell(h, { bold: true })) })];
  ocs.forEach((o) => resumenRows.push(new TableRow({
    children: [
      cell(o.ocNum), cell(o.tipo), cell(o.secretaria), cell(o.proveedor),
      cell(fmtARS(o.ocMonto), { align: AlignmentType.RIGHT }),
      cell(fmtARS(o.totalPagado), { align: AlignmentType.RIGHT }),
      cell(fmtARS(o.saldo), { align: AlignmentType.RIGHT }),
      cell(fmtPct(o.avance), { align: AlignmentType.RIGHT }),
    ],
  })));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: resumenRows,
  }));
  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: 'Detalle e historial de pagos', font: 'Calibri' })],
  }));
  ocs.forEach((o) => {
    children.push(new Paragraph({
      spacing: { before: 160 },
      children: [new TextRun({ text: `${o.tipo} · OC ${o.ocNum} — ${o.descripcion}`, bold: true, font: 'Calibri', size: 22 })],
    }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: `${o.secretaria} · ${o.proveedor} · Monto OC: ${fmtARS(o.ocMonto)} · Saldo: ${fmtARS(o.saldo)}`,
        italics: true, font: 'Calibri', size: 20,
      })],
    }));
    const dHead = ['Concepto', 'INF REC', 'N° Pago', 'Monto bruto', 'Monto neto', 'Saldo luego'];
    const rows = [new TableRow({ tableHeader: true, children: dHead.map((h) => cell(h, { bold: true })) })];
    const pagos = o.pagos.length ? o.pagos : [{ periodo: '(sin pagos)', infRec: '', pagoNum: '', monto: 0, montoNeto: null, saldoLuego: o.ocMonto }];
    pagos.forEach((p) => rows.push(new TableRow({
      children: [
        cell(p.periodo || '—'), cell(p.infRec || '—'), cell(p.pagoNum || '—'),
        cell(fmtARS(p.monto), { align: AlignmentType.RIGHT }),
        cell(p.montoNeto != null ? fmtARS(p.montoNeto) : '—', { align: AlignmentType.RIGHT }),
        cell(fmtARS(p.saldoLuego), { align: AlignmentType.RIGHT }),
      ],
    })));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows,
    }));
  });

  const doc = new Document({
    compatibility: { version: 12 },
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Informe_Saldos_OC_${fileDate()}.docx`);
}
