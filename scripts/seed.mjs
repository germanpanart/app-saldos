#!/usr/bin/env node
/**
 * Migración / seed de datos desde el Sheets (vía endpoint Apps Script) a Supabase.
 *
 *   node scripts/seed.mjs --dry-run     # solo lee y verifica (no inserta, no necesita Supabase)
 *   node scripts/seed.mjs               # inserta/actualiza en Supabase (requiere env)
 *
 * Variables de entorno (para la inserción real):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   (opcional) API_URL, API_TOKEN  -> endpoint Apps Script; si faltan usa los defaults.
 *
 * Idempotente: usa tramites.import_key (= id estable del origen). Re-correr no duplica.
 */

const DRY = process.argv.includes('--dry-run');

const API_URL = process.env.API_URL
  || 'https://script.google.com/macros/s/AKfycbyj0uCT3SGO0Ahtr9x_cj77E9o16Ns_FKa7nH5A4eZs2hTlwgLA21kCZH1q7Zai6gC4Xg/exec';
const API_TOKEN = process.env.API_TOKEN || 'ZVvVydQ0OVigWgVrW9CPqU0AMa9D3BOZ';

const fmt = (n) => (n == null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n));

// dd/mm/yyyy -> yyyy-mm-dd (o null)
function toISO(d) {
  if (!d) return null;
  const m = String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, dd, mm, yy] = m;
  const year = yy.length === 2 ? '20' + yy : yy;
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

async function fetchOcs() {
  const url = `${API_URL}?token=${encodeURIComponent(API_TOKEN)}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('Endpoint respondió ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Endpoint devolvió error');
  return data.ocs;
}

// OC del endpoint -> fila de trámite + filas de pago
function mapTramite(oc) {
  return {
    import_key: oc.id,
    tipo: oc.tipo.startsWith('Obras') ? 'obras' : 'educacion',
    secretaria: oc.secretaria || null,
    proveedor: oc.proveedor || null,
    rubro: oc.rubro || null,
    nro_item: oc.item || null,
    descripcion: oc.descripcion || null,
    estado: oc.estado || null,
    oc_nro: oc.ocNum || null,
    oc_fecha: toISO(oc.ocFecha),
    oc_monto: oc.ocMontoFaltante ? null : oc.ocMonto,
    pagos: (oc.pagos || []).map((p, i) => ({
      orden_index: i + 1,
      concepto: p.periodo || null,
      inf_rec: p.infRec || null,
      nro: p.pagoNum || null,
      monto: p.monto || 0,
      estado: p.estado || null,
    })),
  };
}

function summarize(tramites) {
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const secretarias = uniq(tramites.map((t) => t.secretaria));
  const proveedores = uniq(tramites.map((t) => t.proveedor));
  const rubros = uniq(tramites.map((t) => t.rubro));
  const nPagos = tramites.reduce((s, t) => s + t.pagos.length, 0);
  const montoTotal = tramites.reduce((s, t) => s + (t.oc_monto || 0), 0);
  const pagadoTotal = tramites.reduce((s, t) => s + t.pagos.reduce((a, p) => a + p.monto, 0), 0);
  return { secretarias, proveedores, rubros, nPagos, montoTotal, pagadoTotal };
}

async function main() {
  console.log(`\n== Seed ${DRY ? '(DRY-RUN)' : '(INSERT REAL)'} ==`);
  const ocs = await fetchOcs();
  const tramites = ocs.map(mapTramite);
  const s = summarize(tramites);

  console.log(`Trámites:        ${tramites.length}`);
  console.log(`Órdenes de pago: ${s.nPagos}`);
  console.log(`Secretarías:     ${s.secretarias.length}`);
  console.log(`Proveedores:     ${s.proveedores.length}`);
  console.log(`Rubros:          ${s.rubros.length}  [${s.rubros.join(', ')}]`);
  console.log(`Monto OC total:  ${fmt(s.montoTotal)}`);
  console.log(`Pagado total:    ${fmt(s.pagadoTotal)}`);
  console.log(`Saldo total:     ${fmt(s.montoTotal - s.pagadoTotal)}`);

  // Parity check conocido: OC 48 (Educación) -> AF + C1
  const oc48 = tramites.find((t) => t.oc_nro === '48' && t.tipo === 'educacion');
  if (oc48) {
    const pagado = oc48.pagos.reduce((a, p) => a + p.monto, 0);
    console.log(`\nParity OC 48: montoOC=${fmt(oc48.oc_monto)} pagado=${fmt(pagado)} saldo=${fmt((oc48.oc_monto || 0) - pagado)} (esperado saldo ≈ $56.851.781,28)`);
    let acc = 0;
    oc48.pagos.forEach((p) => { acc += p.monto; console.log(`   ${p.concepto || '—'}: pago ${fmt(p.monto)} -> saldo ${fmt((oc48.oc_monto || 0) - acc)}`); });
  }

  if (DRY) { console.log('\nDRY-RUN ok. No se insertó nada.\n'); return; }

  // -------- Inserción real en Supabase --------
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  }
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // 1) Lookups (upsert por nombre) y mapa nombre->id
  async function upsertLookup(table, nombres) {
    if (!nombres.length) return {};
    const { error } = await db.from(table).upsert(nombres.map((nombre) => ({ nombre })), { onConflict: 'nombre', ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    const { data, error: e2 } = await db.from(table).select('id,nombre');
    if (e2) throw new Error(`${table} select: ${e2.message}`);
    return Object.fromEntries(data.map((r) => [r.nombre, r.id]));
  }
  const secMap = await upsertLookup('secretarias', s.secretarias);
  const provMap = await upsertLookup('proveedores', s.proveedores);
  const rubMap = await upsertLookup('rubros', s.rubros);
  console.log('Lookups cargados.');

  // 2) Trámites (upsert por import_key) + pagos (reemplazo por trámite)
  let okT = 0, okP = 0;
  for (const t of tramites) {
    const row = {
      import_key: t.import_key, tipo: t.tipo,
      secretaria_id: t.secretaria ? secMap[t.secretaria] : null,
      proveedor_id: t.proveedor ? provMap[t.proveedor] : null,
      rubro_id: t.rubro ? rubMap[t.rubro] : null,
      nro_item: t.nro_item, descripcion: t.descripcion, estado: t.estado,
      oc_nro: t.oc_nro, oc_fecha: t.oc_fecha, oc_monto: t.oc_monto,
    };
    const { data: tr, error } = await db.from('tramites')
      .upsert(row, { onConflict: 'import_key' }).select('id').single();
    if (error) { console.error(`Trámite ${t.import_key}: ${error.message}`); continue; }
    okT++;
    await db.from('ordenes_pago').delete().eq('tramite_id', tr.id); // idempotencia de pagos
    if (t.pagos.length) {
      const { error: ep } = await db.from('ordenes_pago')
        .insert(t.pagos.map((p) => ({ ...p, tramite_id: tr.id })));
      if (ep) console.error(`Pagos de ${t.import_key}: ${ep.message}`); else okP += t.pagos.length;
    }
  }
  console.log(`\nInsertados/actualizados: ${okT} trámites, ${okP} pagos.\n`);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
