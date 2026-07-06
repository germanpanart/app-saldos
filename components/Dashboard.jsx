'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileDown, FileText, RefreshCw, Plus } from 'lucide-react';
import Kpis from './Kpis.jsx';
import Filters, { filtersTxt } from './Filters.jsx';
import Charts from './Charts.jsx';
import OcTable from './OcTable.jsx';

const EMPTY = { keyword: '', tipo: 'todos', secretaria: 'todos', rubro: 'todos', estado: 'todos' };

export default function Dashboard({ ocs, canEdit }) {
  const router = useRouter();
  const [filters, setFilters] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [exportErr, setExportErr] = useState('');

  const facets = useMemo(() => ({
    tipos: [...new Set(ocs.map((o) => o.tipo))].sort(),
    secretarias: [...new Set(ocs.map((o) => o.secretaria))].sort(),
    rubros: [...new Set(ocs.map((o) => o.rubro))].sort(),
  }), [ocs]);

  const filtered = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    return ocs.filter((o) => {
      if (filters.tipo !== 'todos' && o.tipo !== filters.tipo) return false;
      if (filters.secretaria !== 'todos' && o.secretaria !== filters.secretaria) return false;
      if (filters.rubro !== 'todos' && o.rubro !== filters.rubro) return false;
      if (filters.estado !== 'todos') {
        const match = filters.estado === 'revisar'
          ? (o.estadoSaldo === 'revisar' || o.estadoSaldo === 'sobrepago')
          : o.estadoSaldo === filters.estado;
        if (!match) return false;
      }
      if (kw) {
        const hay = `${o.descripcion} ${o.proveedor} ${o.ocNum} ${o.secretaria}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [ocs, filters]);

  const txt = filtersTxt(filters);
  const doExport = async (kind) => {
    setBusy(true);
    setExportErr('');
    try {
      const { exportPDF, exportDOCX } = await import('@/lib/report.js');
      if (kind === 'pdf') await exportPDF(filtered, txt);
      else await exportDOCX(filtered, txt);
    } catch (e) {
      console.error(e);
      setExportErr(e?.message || 'No se pudo generar el informe.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-slate-500">{ocs.length} órdenes de compra · {filtered.length} en vista</div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href="/tramites/nuevo" className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Plus size={16} /> Nuevo trámite
            </Link>
          )}
          <button onClick={() => doExport('pdf')} disabled={busy || !filtered.length} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 px-3 py-2 rounded-lg text-sm font-medium text-slate-700"><FileDown size={16} /> PDF</button>
          <button onClick={() => doExport('docx')} disabled={busy || !filtered.length} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 px-3 py-2 rounded-lg text-sm font-medium text-slate-700"><FileText size={16} /> Word</button>
          <button onClick={() => router.refresh()} title="Recargar" className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-700"><RefreshCw size={16} /></button>
        </div>
      </div>

      {exportErr && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {exportErr}
        </div>
      )}

      <Kpis ocs={filtered} />
      <Filters filters={filters} setFilters={setFilters} facets={facets} />
      <Charts ocs={filtered} />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-600">Órdenes de compra <span className="text-slate-400">({filtered.length})</span></h2>
        <span className="text-xs text-slate-400">Clic en una fila para ver el historial de pagos</span>
      </div>
      <OcTable ocs={filtered} editable={canEdit} />
    </div>
  );
}
