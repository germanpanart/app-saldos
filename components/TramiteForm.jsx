'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client.js';
import { parseMonto, fmtARS } from '@/lib/format.js';

const emptyPago = () => ({ concepto: '', inf_rec: '', nro: '', monto: '', fecha: '', estado: '' });

const blank = {
  tipo: 'obras', secretaria: '', proveedor: '', rubro: '',
  nro_item: '', descripcion: '', estado: '',
  oc_nro: '', oc_fecha: '', oc_monto: '',
  financiamiento: '', destino: '', cotizacion: '', acompanantes: '', vb_lyt: '', vb_leo: '',
  sol_pedido_monto: '', sol_gasto_nro: '', proceso_tipo_numero: '', proceso_apertura: '',
  obs_generales: '', obs_tecnicas: '',
};

function Field({ label, children, full }) {
  return (
    <label className={`flex flex-col gap-1 text-xs ${full ? 'md:col-span-2' : ''}`}>
      <span className="font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none';

export default function TramiteForm({ initial, pagosInitial, lookups }) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [f, setF] = useState({ ...blank, ...(initial || {}) });
  const [pagos, setPagos] = useState(pagosInitial?.length ? pagosInitial.map((p) => ({
    concepto: p.concepto || '', inf_rec: p.inf_rec || '', nro: p.nro || '',
    monto: p.monto != null ? String(p.monto) : '', fecha: p.fecha || '', estado: p.estado || '',
  })) : [emptyPago()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [advanced, setAdvanced] = useState(false);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setPago = (i, k, v) => setPagos((arr) => arr.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  const ocMonto = parseMonto(f.oc_monto);
  const pagado = pagos.reduce((s, p) => s + (parseMonto(p.monto) || 0), 0);
  const saldo = (ocMonto || 0) - pagado;

  const datalist = (id, items) => (
    <datalist id={id}>{items.map((x) => <option key={x} value={x} />)}</datalist>
  );

  async function ensureLookup(supabase, table, nombre) {
    const n = (nombre || '').trim();
    if (!n) return null;
    const { data } = await supabase.from(table).select('id').eq('nombre', n).maybeSingle();
    if (data) return data.id;
    const { data: ins, error } = await supabase.from(table).insert({ nombre: n }).select('id').single();
    if (error) throw new Error(`${table}: ${error.message}`);
    return ins.id;
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const supabase = createClient();
      const [secretaria_id, proveedor_id, rubro_id] = await Promise.all([
        ensureLookup(supabase, 'secretarias', f.secretaria),
        ensureLookup(supabase, 'proveedores', f.proveedor),
        ensureLookup(supabase, 'rubros', f.rubro),
      ]);
      const row = {
        tipo: f.tipo, secretaria_id, proveedor_id, rubro_id,
        nro_item: f.nro_item || null, descripcion: f.descripcion || null, estado: f.estado || null,
        oc_nro: f.oc_nro || null, oc_fecha: f.oc_fecha || null,
        oc_monto: ocMonto, // null si vacío => faltante
        financiamiento: f.financiamiento || null, destino: f.destino || null,
        cotizacion: f.cotizacion || null, acompanantes: f.acompanantes || null,
        vb_lyt: f.vb_lyt || null, vb_leo: f.vb_leo || null,
        sol_pedido_monto: parseMonto(f.sol_pedido_monto),
        sol_gasto_nro: f.sol_gasto_nro || null,
        proceso_tipo_numero: f.proceso_tipo_numero || null,
        proceso_apertura: f.proceso_apertura || null,
        obs_generales: f.obs_generales || null, obs_tecnicas: f.obs_tecnicas || null,
      };

      let tramiteId = initial?.id;
      if (editing) {
        const { error } = await supabase.from('tramites').update(row).eq('id', tramiteId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase.from('tramites').insert(row).select('id').single();
        if (error) throw new Error(error.message);
        tramiteId = data.id;
      }

      // Reemplazar pagos (idempotente)
      await supabase.from('ordenes_pago').delete().eq('tramite_id', tramiteId);
      const rows = pagos
        .filter((p) => p.concepto || p.inf_rec || p.nro || p.monto)
        .map((p, i) => ({
          tramite_id: tramiteId, orden_index: i + 1,
          concepto: p.concepto || null, inf_rec: p.inf_rec || null, nro: p.nro || null,
          monto: parseMonto(p.monto) || 0, fecha: p.fecha || null, estado: p.estado || null,
        }));
      if (rows.length) {
        const { error } = await supabase.from('ordenes_pago').insert(rows);
        if (error) throw new Error(error.message);
      }

      router.push('/');
      router.refresh();
    } catch (e) {
      setError(e.message); setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('¿Eliminar este trámite y todos sus pagos? Esta acción no se puede deshacer.')) return;
    setBusy(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.from('tramites').delete().eq('id', initial.id);
    if (error) { setError(error.message); setBusy(false); return; }
    router.push('/'); router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.push('/')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Volver</button>
        <h1 className="text-lg font-bold text-slate-800">{editing ? 'Editar trámite' : 'Nuevo trámite'}</h1>
        <div />
      </div>

      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

      {/* Datos principales */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Trámite</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Tipo">
            <select value={f.tipo} onChange={(e) => set('tipo', e.target.value)} className={inputCls}>
              <option value="obras">Obras Públicas</option>
              <option value="educacion">Educación Infra</option>
            </select>
          </Field>
          <Field label="N° ítem"><input value={f.nro_item} onChange={(e) => set('nro_item', e.target.value)} className={inputCls} /></Field>
          <Field label="Secretaría">
            <input list="dl-sec" value={f.secretaria} onChange={(e) => set('secretaria', e.target.value)} className={inputCls} />
            {datalist('dl-sec', lookups.secretarias)}
          </Field>
          <Field label="Proveedor">
            <input list="dl-prov" value={f.proveedor} onChange={(e) => set('proveedor', e.target.value)} className={inputCls} />
            {datalist('dl-prov', lookups.proveedores)}
          </Field>
          <Field label="Rubro">
            <input list="dl-rub" value={f.rubro} onChange={(e) => set('rubro', e.target.value)} className={inputCls} />
            {datalist('dl-rub', lookups.rubros)}
          </Field>
          <Field label="Estado"><input value={f.estado} onChange={(e) => set('estado', e.target.value)} className={inputCls} /></Field>
          <Field label="Descripción" full><textarea value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2} className={inputCls} /></Field>
        </div>
      </section>

      {/* Orden de compra */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Orden de compra</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="N° OC"><input value={f.oc_nro} onChange={(e) => set('oc_nro', e.target.value)} className={inputCls} /></Field>
          <Field label="Fecha OC"><input type="date" value={f.oc_fecha || ''} onChange={(e) => set('oc_fecha', e.target.value)} className={inputCls} /></Field>
          <Field label="Monto OC (ARS)"><input inputMode="decimal" value={f.oc_monto} onChange={(e) => set('oc_monto', e.target.value)} placeholder="vacío = sin cargar" className={inputCls} /></Field>
        </div>
      </section>

      {/* Órdenes de pago */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Órdenes de pago</h2>
          <div className="text-xs text-slate-500">Pagado: <b>{fmtARS(pagado)}</b> · Saldo: <b className={saldo < -1 ? 'text-rose-600' : 'text-slate-700'}>{ocMonto == null ? '— (falta monto OC)' : fmtARS(saldo)}</b></div>
        </div>
        <div className="space-y-2">
          {pagos.map((p, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
              <input value={p.concepto} onChange={(e) => setPago(i, 'concepto', e.target.value)} placeholder="Concepto (AF/C1/mes)" className={`${inputCls} md:col-span-2`} />
              <input value={p.inf_rec} onChange={(e) => setPago(i, 'inf_rec', e.target.value)} placeholder="INF REC" className={`${inputCls} md:col-span-2`} />
              <input value={p.nro} onChange={(e) => setPago(i, 'nro', e.target.value)} placeholder="N° pago" className={`${inputCls} md:col-span-2`} />
              <input inputMode="decimal" value={p.monto} onChange={(e) => setPago(i, 'monto', e.target.value)} placeholder="Monto" className={`${inputCls} md:col-span-2`} />
              <input type="date" value={p.fecha || ''} onChange={(e) => setPago(i, 'fecha', e.target.value)} className={`${inputCls} md:col-span-2`} />
              <input value={p.estado} onChange={(e) => setPago(i, 'estado', e.target.value)} placeholder="Estado" className={`${inputCls} md:col-span-1`} />
              <button type="button" onClick={() => setPagos((arr) => arr.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600 md:col-span-1 justify-self-start"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setPagos((arr) => [...arr, emptyPago()])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"><Plus size={16} /> Agregar pago</button>
      </section>

      {/* Avanzado (circuito extendido) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <button type="button" onClick={() => setAdvanced((a) => !a)} className="text-sm font-semibold text-slate-700">
          {advanced ? '▾' : '▸'} Datos del circuito (solicitud, proceso, V.B., observaciones)
        </button>
        {advanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <Field label="Financiamiento"><input value={f.financiamiento} onChange={(e) => set('financiamiento', e.target.value)} className={inputCls} /></Field>
            <Field label="Destino"><input value={f.destino} onChange={(e) => set('destino', e.target.value)} className={inputCls} /></Field>
            <Field label="Solicitud de pedido — Monto"><input inputMode="decimal" value={f.sol_pedido_monto} onChange={(e) => set('sol_pedido_monto', e.target.value)} className={inputCls} /></Field>
            <Field label="Cotización"><input value={f.cotizacion} onChange={(e) => set('cotizacion', e.target.value)} className={inputCls} /></Field>
            <Field label="Acompañantes"><input value={f.acompanantes} onChange={(e) => set('acompanantes', e.target.value)} className={inputCls} /></Field>
            <Field label="V.B. Ly T"><input value={f.vb_lyt} onChange={(e) => set('vb_lyt', e.target.value)} className={inputCls} /></Field>
            <Field label="V.B. Leo"><input value={f.vb_leo} onChange={(e) => set('vb_leo', e.target.value)} className={inputCls} /></Field>
            <Field label="Solicitud de gasto — N°"><input value={f.sol_gasto_nro} onChange={(e) => set('sol_gasto_nro', e.target.value)} className={inputCls} /></Field>
            <Field label="Proceso — Tipo y número"><input value={f.proceso_tipo_numero} onChange={(e) => set('proceso_tipo_numero', e.target.value)} className={inputCls} /></Field>
            <Field label="Proceso — Apertura"><input type="date" value={f.proceso_apertura || ''} onChange={(e) => set('proceso_apertura', e.target.value)} className={inputCls} /></Field>
            <Field label="Observaciones generales" full><textarea value={f.obs_generales} onChange={(e) => set('obs_generales', e.target.value)} rows={2} className={inputCls} /></Field>
            <Field label="Observaciones técnicas" full><textarea value={f.obs_tecnicas} onChange={(e) => set('obs_tecnicas', e.target.value)} rows={2} className={inputCls} /></Field>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between">
        {editing
          ? <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-700"><Trash2 size={16} /> Eliminar trámite</button>
          : <div />}
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg px-5 py-2.5 text-sm">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
        </button>
      </div>
    </form>
  );
}
