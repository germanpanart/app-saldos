'use client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend, CartesianGrid,
} from 'recharts';
import { fmtARS, fmtCompactARS, displaySecretaria, shortLabel } from '@/lib/format.js';

const COLORS = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

function Panel({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

export default function Charts({ ocs }) {
  const bySec = Object.values(
    ocs.reduce((acc, o) => {
      const k = displaySecretaria(o.secretaria) || '(s/secretaría)';
      acc[k] = acc[k] || { name: k, saldo: 0 };
      acc[k].saldo += Math.max(0, o.saldo);
      return acc;
    }, {})
  ).sort((a, b) => b.saldo - a.saldo).slice(0, 7);

  const pagado = ocs.reduce((s, o) => s + o.totalPagado, 0);
  const saldo = Math.max(0, ocs.reduce((s, o) => s + o.saldo, 0));
  const donut = [{ name: 'Pagado', value: pagado }, { name: 'Saldo pendiente', value: saldo }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      <div className="lg:col-span-3">
        <Panel title="Saldo pendiente por secretaría (top 7)">
          <ResponsiveContainer>
            <BarChart data={bySec} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
              <XAxis type="number" tickFormatter={fmtCompactARS} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#475569' }} tickFormatter={(v) => shortLabel(v, 22)} />
              <Tooltip formatter={(v) => fmtARS(v)} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="saldo" radius={[0, 6, 6, 0]} maxBarSize={26}>
                {bySec.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <div className="lg:col-span-2">
        <Panel title="Ejecución total">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip formatter={(v) => fmtARS(v)} />
              <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
