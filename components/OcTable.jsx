'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, AlertTriangle, Pencil } from 'lucide-react';
import { fmtARS, fmtPct, cleanSec } from '@/lib/format.js';

const estadoChip = {
  pagada: 'bg-emerald-100 text-emerald-700',
  pendiente: 'bg-amber-100 text-amber-700',
  revisar: 'bg-rose-100 text-rose-700',
  sobrepago: 'bg-rose-100 text-rose-700',
};
const estadoLabel = { pagada: 'Pagada', pendiente: 'En curso', revisar: 'Revisar', sobrepago: 'Sobrepago' };

function Progress({ value }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = pct >= 99 ? 'bg-emerald-500' : pct > 0 ? 'bg-brand-500' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right tabular-nums">{fmtPct(value)}</span>
    </div>
  );
}

function Chip({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <div className={`rounded-lg border px-3 py-1.5 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ oc, editable }) {
  const [open, setOpen] = useState(false);
  const saldoColor = oc.estadoSaldo === 'pagada' ? 'text-emerald-600'
    : (oc.estadoSaldo === 'revisar' || oc.estadoSaldo === 'sobrepago') ? 'text-rose-600' : 'text-slate-900';
  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-brand-50/40 cursor-pointer ${open ? 'bg-brand-50/60' : ''}`} onClick={() => setOpen((o) => !o)}>
        <td className="px-2 py-2.5 text-slate-300">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
        <td className="px-2 py-2.5 font-semibold text-slate-700 whitespace-nowrap">{oc.ocNum}</td>
        <td className="px-2 py-2.5">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${oc.tipo.startsWith('Obras') ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700'}`}>
            {oc.tipo.startsWith('Obras') ? 'Obras' : 'Educación'}
          </span>
        </td>
        <td className="px-2 py-2.5 text-slate-600 max-w-[150px] truncate" title={oc.secretaria}>{cleanSec(oc.secretaria)}</td>
        <td className="px-2 py-2.5 text-slate-600 max-w-[280px] truncate" title={oc.descripcion}>{oc.descripcion || '—'}</td>
        <td className="px-2 py-2.5"><span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">{oc.rubro}</span></td>
        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-slate-700">{fmtARS(oc.ocMonto)}</td>
        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-slate-400">{fmtARS(oc.totalPagado)}</td>
        <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap font-bold ${saldoColor}`}>
          {oc.ocMontoFaltante && <AlertTriangle size={12} className="inline mb-0.5 mr-1 text-rose-500" />}
          {fmtARS(oc.saldo)}
        </td>
        <td className="px-3 py-2.5"><Progress value={oc.avance} /></td>
        <td className="px-2 py-2.5"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${estadoChip[oc.estadoSaldo]}`}>{estadoLabel[oc.estadoSaldo]}</span></td>
      </tr>
      {open && (
        <tr className="bg-slate-50/80">
          <td colSpan={11} className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Chip label="Monto OC" value={fmtARS(oc.ocMonto)} tone="blue" />
              <Chip label="Pagado" value={fmtARS(oc.totalPagado)} tone="emerald" />
              <Chip label="Saldo" value={fmtARS(oc.saldo)} tone={oc.estadoSaldo === 'pagada' ? 'emerald' : (oc.estadoSaldo === 'pendiente' ? 'amber' : 'rose')} />
              <Chip label="Avance" value={fmtPct(oc.avance)} />
              <Chip label="Proveedor" value={oc.proveedor} />
              <div className="ml-auto flex items-center gap-3">
                {oc.ocMontoFaltante && (
                  <span className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertTriangle size={14} /> Falta cargar el monto de la OC</span>
                )}
                {editable && oc.id && (
                  <Link href={`/tramites/${oc.id}`} onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 px-3 py-1.5 rounded-lg">
                    <Pencil size={13} /> Editar
                  </Link>
                )}
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500 mb-1.5">Historial de órdenes de pago</div>
            {oc.pagos.length === 0 ? (
              <div className="text-sm text-slate-400 italic">Sin pagos cargados todavía — el saldo equivale al monto total de la OC.</div>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3 font-semibold">Concepto</th>
                      <th className="py-2 px-3 font-semibold">INF REC</th>
                      <th className="py-2 px-3 font-semibold">N° Pago</th>
                      <th className="py-2 px-3 font-semibold text-right">Monto pago</th>
                      <th className="py-2 px-3 font-semibold text-right">Saldo luego</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oc.pagos.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-2 px-3"><span className="font-medium text-slate-700">{p.periodo || '—'}</span></td>
                        <td className="py-2 px-3 text-slate-500 tabular-nums">{p.infRec || '—'}</td>
                        <td className="py-2 px-3 text-slate-500 tabular-nums">{p.pagoNum || '—'}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-700">{fmtARS(p.monto)}</td>
                        <td className={`py-2 px-3 text-right tabular-nums font-semibold ${p.saldoLuego < -1 ? 'text-rose-600' : 'text-slate-800'}`}>{fmtARS(p.saldoLuego)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function OcTable({ ocs, editable = false }) {
  const [sort, setSort] = useState({ key: 'saldo', dir: 'desc' });
  const sorted = [...ocs].sort((a, b) => {
    const m = sort.dir === 'asc' ? 1 : -1;
    const va = a[sort.key], vb = b[sort.key];
    if (typeof va === 'number') return (va - vb) * m;
    return String(va).localeCompare(String(vb)) * m;
  });
  const th = (key, label, extra = '') => (
    <th
      className={`px-3 py-2.5 font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-800 whitespace-nowrap ${extra}`}
      onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}
    >
      {label}<span className="text-brand-500">{sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}</span>
    </th>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-auto max-h-[640px]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2.5 w-6"></th>
              {th('ocNum', 'OC N°')}
              {th('tipo', 'Tipo')}
              {th('secretaria', 'Secretaría')}
              <th className="px-3 py-2.5 font-semibold text-slate-500">Descripción</th>
              {th('rubro', 'Rubro')}
              {th('ocMonto', 'Monto OC', 'text-right')}
              {th('totalPagado', 'Pagado', 'text-right')}
              {th('saldo', 'Saldo', 'text-right')}
              {th('avance', 'Avance')}
              {th('estadoSaldo', 'Estado')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((oc) => <Row key={oc.id} oc={oc} editable={editable} />)}
            {sorted.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">No hay órdenes de compra para los filtros aplicados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
