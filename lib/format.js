// Helpers de formato y parseo (contexto ARS, formato 1.234,56).

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fmtARS = (n) => (n == null || isNaN(n) ? '—' : ARS.format(n));
export const fmtNum = (n) => (n == null || isNaN(n) ? '—' : NUM.format(n));
export const fmtPct = (x) => (x == null || isNaN(x) ? '—' : `${Math.round(x * 100)}%`);

// Monto compacto para tarjetas/ejes: $ 27.059 M (millones) · $ 1,2 B (billones).
export function fmtCompactARS(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  const dec = (x) => (x >= 100 ? 0 : x >= 10 ? 1 : 2);
  if (a >= 1e12) { const v = a / 1e12; return `${sign}$ ${v.toLocaleString('es-AR', { maximumFractionDigits: dec(v) })} B`; }
  if (a >= 1e6) { const v = a / 1e6; return `${sign}$ ${v.toLocaleString('es-AR', { maximumFractionDigits: dec(v) })} M`; }
  if (a >= 1e3) { const v = a / 1e3; return `${sign}$ ${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })} mil`; }
  return ARS.format(n);
}

export const cleanSec = (s) => ((s || '').replace(/^\s*\d+\s*[-–]\s*/, '').trim() || s || '');
export const shortLabel = (s, n = 16) => {
  const t = cleanSec(s);
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

export function clean(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const t = String(v).trim();
  if (t === '' || t === '-' || t === '--' || t === ',') return null;
  return t;
}

export function parseMonto(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  let t = String(raw).trim().replace(/[^\d.,-]/g, '');
  if (!/\d/.test(t)) return null;
  const neg = t.startsWith('-');
  t = t.replace(/-/g, '');
  const sep = Math.max(t.lastIndexOf('.'), t.lastIndexOf(','));
  if (sep >= 0) {
    const dec = t.length - sep - 1;
    if (dec === 1 || dec === 2) t = t.slice(0, sep).replace(/[.,]/g, '') + '.' + t.slice(sep + 1);
    else t = t.replace(/[.,]/g, '');
  }
  const n = parseFloat(t);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}
