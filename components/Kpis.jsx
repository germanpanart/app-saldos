'use client';
import { Wallet, CheckCircle2, Clock, AlertTriangle, FileStack, TrendingUp } from 'lucide-react';
import { fmtARS, fmtCompactARS, fmtPct } from '@/lib/format.js';

function Money({ value }) {
  return (
    <div className="text-2xl font-bold text-slate-800 leading-tight tabular-nums" title={fmtARS(value)}>
      {fmtCompactARS(value)}
    </div>
  );
}

function Card({ icon: Icon, label, children, sub, accent, ring }) {
  return (
    <div className={`bg-white rounded-2xl border ${ring || 'border-slate-200'} shadow-sm hover:shadow-md transition-shadow p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-lg p-2 ${accent}`}><Icon size={18} /></div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      {children}
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Kpis({ ocs }) {
  const monto = ocs.reduce((s, o) => s + o.ocMonto, 0);
  const pagado = ocs.reduce((s, o) => s + o.totalPagado, 0);
  const saldo = ocs.reduce((s, o) => s + o.saldo, 0);
  const avance = monto > 0 ? pagado / monto : 0;
  const pagadas = ocs.filter((o) => o.estadoSaldo === 'pagada').length;
  const revisar = ocs.filter((o) => o.estadoSaldo === 'revisar' || o.estadoSaldo === 'sobrepago').length;
  const pendientes = ocs.filter((o) => o.estadoSaldo === 'pendiente').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <Card icon={FileStack} label="Órdenes de compra" accent="bg-slate-100 text-slate-600" sub={`${pagadas} pagadas · ${pendientes} en curso`}>
        <div className="text-2xl font-bold text-slate-800 leading-tight">{ocs.length}</div>
      </Card>
      <Card icon={Wallet} label="Monto OC total" accent="bg-blue-100 text-blue-700"><Money value={monto} /></Card>
      <Card icon={CheckCircle2} label="Pagado" accent="bg-emerald-100 text-emerald-700" sub={`Avance ${fmtPct(avance)}`}>
        <Money value={pagado} />
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, avance * 100)}%` }} />
        </div>
      </Card>
      <Card icon={Clock} label="Saldo pendiente" accent="bg-amber-100 text-amber-700" ring="border-amber-200"><Money value={saldo} /></Card>
      <Card icon={TrendingUp} label="Avance global" accent="bg-indigo-100 text-indigo-700" sub="pagado / monto OC">
        <div className="text-2xl font-bold text-slate-800 leading-tight">{fmtPct(avance)}</div>
      </Card>
      <Card icon={revisar ? AlertTriangle : CheckCircle2} label="A revisar" accent={revisar ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} ring={revisar ? 'border-rose-200' : ''} sub="saldo neg. / sin monto OC">
        <div className={`text-2xl font-bold leading-tight ${revisar ? 'text-rose-600' : 'text-slate-800'}`}>{revisar}</div>
      </Card>
    </div>
  );
}
