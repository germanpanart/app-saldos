import { downloadBlob } from './download.js';
import { fmtARS, fmtPct } from './format.js';

const hoy = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fileDate = () => new Date().toISOString().slice(0, 10);
const trunc = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
const dash = (s) => (s ? String(s) : '—');

/** Quita caracteres inválidos para XML / Word. */
function cleanText(s) {
  return String(s ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function totals(ocs) {
  return ocs.reduce((a, o) => {
    a.monto += o.ocMonto; a.pagado += o.totalPagado; a.saldo += o.saldo; return a;
  }, { monto: 0, pagado: 0, saldo: 0 });
}

function tramiteMetaLine(o) {
  return [
    `Secretaría: ${dash(o.secretaria)}`,
    `Procedimiento: ${dash(o.procedimiento)}`,
    `N° procedimiento: ${dash(o.procedimientoNro)}`,
    `N° trámite: ${dash(o.tramiteNro)}`,
    `OC N°: ${dash(o.ocNum)}`,
  ].join('   |   ');
}

async function loadPdfLibs() {
  const [{ jsPDF }, autotableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const applyPlugin = autotableMod.applyPlugin || autotableMod.default?.applyPlugin;
  if (applyPlugin) applyPlugin(jsPDF);
  return { jsPDF };
}

export async function exportPDF(ocs, filtrosTxt) {
  const { jsPDF } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const t = totals(ocs);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Informe de Saldos - Órdenes de Compra', 40, 40);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(`Dirección de Compras y Contrataciones - Generado: ${hoy()}`, 40, 56);
  doc.text(`Filtros: ${filtrosTxt || 'sin filtros'}`, 40, 70);
  doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(`OCs: ${ocs.length}   |   Monto total: ${fmtARS(t.monto)}   |   Pagado: ${fmtARS(t.pagado)}   |   Saldo pendiente: ${fmtARS(t.saldo)}`, 40, 90);

  doc.autoTable({
    startY: 102,
    styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 7 },
    head: [[
      'OC N°', 'N° proced.', 'Procedimiento', 'Secretaría', 'Proveedor', 'Descripción',
      'Monto OC', 'Pagado', 'Saldo', '% Av.',
    ]],
    body: ocs.map((o) => [
      o.ocNum,
      dash(o.procedimientoNro),
      dash(o.procedimiento),
      trunc(o.secretaria, 22),
      trunc(o.proveedor, 18),
      trunc(o.descripcion, 36),
      fmtARS(o.ocMonto), fmtARS(o.totalPagado), fmtARS(o.saldo), fmtPct(o.avance),
    ]),
    columnStyles: {
      6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' },
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 8) {
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
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 50; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(0);
    const metaLines = doc.splitTextToSize(tramiteMetaLine(o), W - 80);
    metaLines.forEach((line, i) => { doc.text(line, 40, y + i * 11); });
    y += metaLines.length * 11 + 2;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60);
    doc.text(`${trunc(o.descripcion, 110)}  ·  Proveedor: ${trunc(o.proveedor, 40)}  ·  Monto OC: ${fmtARS(o.ocMonto)}  ·  Saldo: ${fmtARS(o.saldo)}`, 40, y);
    y += 14;
    doc.setTextColor(0);
    doc.autoTable({
      startY: y,
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
    y = doc.lastAutoTable.finalY + 18;
  });

  const blob = doc.output('blob');
  downloadBlob(blob, `Informe_Saldos_OC_${fileDate()}.pdf`);
}

function th(cells) {
  return `<tr>${cells.map((c) => `<th style="border:1px solid #ccc;padding:4px;background:#2563eb;color:#fff;font-size:9pt;">${cleanText(c)}</th>`).join('')}</tr>`;
}
function tr(cells, alignRightFrom = -1) {
  return `<tr>${cells.map((c, i) => {
    const align = i >= alignRightFrom ? 'right' : 'left';
    return `<td style="border:1px solid #ccc;padding:4px;text-align:${align};font-size:9pt;">${cleanText(c)}</td>`;
  }).join('')}</tr>`;
}

/** Word compatible con Office 2007 (HTML empaquetado como .doc). */
export async function exportDOCX(ocs, filtrosTxt) {
  const t = totals(ocs);
  let body = '';

  body += `<h1>Informe de Saldos - Órdenes de Compra</h1>`;
  body += `<p><i>Dirección de Compras y Contrataciones - Generado: ${cleanText(hoy())}</i></p>`;
  body += `<p>Filtros: ${cleanText(filtrosTxt || 'sin filtros')}</p>`;
  body += `<p><b>OCs: ${ocs.length} | Monto total: ${cleanText(fmtARS(t.monto))} | Pagado: ${cleanText(fmtARS(t.pagado))} | Saldo pendiente: ${cleanText(fmtARS(t.saldo))}</b></p>`;

  body += '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">';
  body += th(['OC N°', 'N° proced.', 'Procedimiento', 'Secretaría', 'Proveedor', 'Monto OC', 'Pagado', 'Saldo', '% Av.']);
  ocs.forEach((o) => {
    body += tr([
      o.ocNum, dash(o.procedimientoNro), dash(o.procedimiento), o.secretaria, o.proveedor,
      fmtARS(o.ocMonto), fmtARS(o.totalPagado), fmtARS(o.saldo), fmtPct(o.avance),
    ], 5);
  });
  body += '</table>';

  body += '<h2>Detalle e historial de pagos</h2>';
  ocs.forEach((o) => {
    body += `<p><b>${cleanText(tramiteMetaLine(o))}</b></p>`;
    body += `<p>${cleanText(o.descripcion || '—')} · Proveedor: ${cleanText(o.proveedor)} · Monto OC: ${cleanText(fmtARS(o.ocMonto))} · Saldo: ${cleanText(fmtARS(o.saldo))}</p>`;
    body += '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin-bottom:16px;">';
    body += th(['Concepto', 'INF REC', 'N° Pago', 'Monto bruto', 'Monto neto', 'Saldo luego']);
    const pagos = o.pagos.length ? o.pagos : [{ periodo: '(sin pagos)', infRec: '', pagoNum: '', monto: 0, montoNeto: null, saldoLuego: o.ocMonto }];
    pagos.forEach((p) => {
      body += tr([
        p.periodo || '—', p.infRec || '—', p.pagoNum || '—',
        fmtARS(p.monto), p.montoNeto != null ? fmtARS(p.montoNeto) : '—', fmtARS(p.saldoLuego),
      ], 3);
    });
    body += '</table>';
  });

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Informe Saldos OC</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; }
  h1 { font-size: 16pt; } h2 { font-size: 13pt; margin-top: 18px; }
</style>
</head>
<body>${body}</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  downloadBlob(blob, `Informe_Saldos_OC_${fileDate()}.doc`);
}
