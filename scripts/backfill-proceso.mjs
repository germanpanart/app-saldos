#!/usr/bin/env node
/**
 * Completa proceso_tipo_numero desde el Google Sheet histórico (columna J / M).
 * Solo actualiza ese campo; no toca montos, pagos ni otros datos.
 *
 *   node scripts/backfill-proceso.mjs --dry-run
 *   node --env-file=.env scripts/backfill-proceso.mjs
 */

const DRY = process.argv.includes('--dry-run');

const SHEET_ID = '1h8bR-4tdwRwPCvdI497jjhKsUmVJWWQKfuVuJW0mxUg';

const TABS = [
  {
    tipo: 'Obras Públicas', gid: '0', dataStartRow: 4, area: 'obras',
    cols: { secret: 3, item: 4, desc: 5, proceso: 9, prov: 11, ocNum: 12, ocFecha: 13, ocMonto: 14, infRec: 15, pagoNum: 16, pagoMonto: 17, periodo: 18, estado: 19 },
  },
  {
    tipo: 'Educación Infra', gid: '172999059', dataStartRow: 4, area: 'educacion',
    cols: { secret: 3, item: 4, desc: 5, proceso: 12, prov: 14, ocNum: 15, ocFecha: 16, ocMonto: 17, infRec: 18, pagoNum: 19, pagoMonto: 20, periodo: 21, estado: 22 },
  },
];

function clean(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const t = String(v).trim();
  if (t === '' || t === '-' || t === '--' || t === ',') return null;
  return t;
}

/** Parser CSV mínimo (soporta comillas y saltos de línea dentro de celdas). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(cell); cell = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
    cell += ch; i++;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function normalizeTab(rows, tab) {
  const c = tab.cols;
  const ocs = [];
  let cur = null;
  for (let i = tab.dataStartRow - 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const ocNum = clean(row[c.ocNum]);
    if (ocNum != null) {
      const proceso = clean(row[c.proceso]);
      cur = {
        import_key: `${tab.tipo}-${ocNum}-${i}`,
        area: tab.area,
        oc_nro: String(ocNum),
        proceso_tipo_numero: proceso != null ? String(proceso) : '',
      };
      ocs.push(cur);
    }
  }
  return ocs;
}

async function fetchTab(tab) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${tab.gid}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`CSV ${tab.tipo}: HTTP ${res.status}`);
  const text = await res.text();
  return normalizeTab(parseCsv(text), tab);
}

async function main() {
  console.log(`\n== Backfill proceso_tipo_numero ${DRY ? '(DRY-RUN)' : ''} ==\n`);
  const fromSheet = [];
  for (const tab of TABS) {
    const rows = await fetchTab(tab);
    const withProc = rows.filter((r) => r.proceso_tipo_numero);
    console.log(`${tab.tipo}: ${rows.length} OCs, ${withProc.length} con TIPO Y NUMERO`);
    fromSheet.push(...rows);
  }

  const sample = fromSheet.filter((r) => r.proceso_tipo_numero).slice(0, 5);
  console.log('\nMuestra:');
  sample.forEach((r) => console.log(`  OC ${r.oc_nro} (${r.area}): ${r.proceso_tipo_numero}`));

  if (DRY) {
    console.log(`\nDRY-RUN: ${fromSheet.filter((r) => r.proceso_tipo_numero).length} filas listas para actualizar.\n`);
    return;
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: tramites, error } = await db.from('tramites').select('id,import_key,area,oc_nro,proceso_tipo_numero');
  if (error) throw new Error(error.message);

  const byImport = Object.fromEntries((tramites || []).map((t) => [t.import_key, t]));
  const byOcArea = {};
  for (const t of tramites || []) {
  const k = `${t.area}|${t.oc_nro}`;
    (byOcArea[k] ||= []).push(t);
  }

  let ok = 0, skip = 0, miss = 0;
  for (const row of fromSheet) {
    if (!row.proceso_tipo_numero) continue;
    let tr = byImport[row.import_key];
    if (!tr) {
      const cands = byOcArea[`${row.area}|${row.oc_nro}`] || [];
      tr = cands.length === 1 ? cands[0] : null;
    }
    if (!tr) { miss++; continue; }
    if (tr.proceso_tipo_numero === row.proceso_tipo_numero) { skip++; continue; }
    const { error: ue } = await db.from('tramites')
      .update({ proceso_tipo_numero: row.proceso_tipo_numero })
      .eq('id', tr.id);
    if (ue) console.error(`OC ${row.oc_nro}: ${ue.message}`);
    else ok++;
  }

  console.log(`\nActualizados: ${ok} | ya correctos: ${skip} | sin match en BD: ${miss}\n`);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
