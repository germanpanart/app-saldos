'use client';
import { Search, X } from 'lucide-react';

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default function Filters({ filters, setFilters, facets }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const opt = (arr) => [{ value: 'todos', label: 'Todas' }, ...arr.map((x) => ({ value: x, label: x }))];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs lg:col-span-2">
          <span className="font-medium text-slate-500">Buscar en descripción / proveedor</span>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              value={filters.keyword}
              onChange={(e) => set('keyword')(e.target.value)}
              placeholder="palabras clave (ej. eléctric, JI 945, gas...)"
              className="w-full border border-slate-300 rounded-lg pl-8 pr-2.5 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>
        </label>
        <Select label="Procedimiento" value={filters.procedimiento} onChange={set('procedimiento')} options={opt(facets.procedimientos)} />
        <Select label="Secretaría" value={filters.secretaria} onChange={set('secretaria')} options={opt(facets.secretarias)} />
        <Select label="Rubro" value={filters.rubro} onChange={set('rubro')} options={opt(facets.rubros)} />
        <Select
          label="Estado de saldo"
          value={filters.estado}
          onChange={set('estado')}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'pendiente', label: 'Con saldo pendiente' },
            { value: 'pagada', label: 'Pagadas (saldo 0)' },
            { value: 'revisar', label: 'A revisar' },
          ]}
        />
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-slate-400">{filtersTxt(filters)}</span>
        <button
          onClick={() => setFilters({ keyword: '', procedimiento: 'todos', secretaria: 'todos', rubro: 'todos', estado: 'todos' })}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600"
        >
          <X size={14} /> Limpiar filtros
        </button>
      </div>
    </div>
  );
}

export function filtersTxt(f) {
  const parts = [];
  if (f.keyword) parts.push(`texto "${f.keyword}"`);
  if (f.procedimiento !== 'todos') parts.push(`procedimiento ${f.procedimiento}`);
  if (f.secretaria !== 'todos') parts.push(`secretaría ${f.secretaria}`);
  if (f.rubro !== 'todos') parts.push(`rubro ${f.rubro}`);
  if (f.estado !== 'todos') parts.push(`estado ${f.estado}`);
  return parts.length ? parts.join(' · ') : 'sin filtros';
}
