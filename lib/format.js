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

/** Nombres oficiales de secretarías (reemplazan Obras Públicas / Educación en todo el sistema). */
export const SECRETARIA_NOMBRE = {
  obras: 'Secretaría de Infraestructura y Planificación',
  educacion: 'Educación, Producción y Trabajo',
};

function normSecretaria(s) {
  return (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Muestra siempre el nombre oficial de la secretaría. */
export function displaySecretaria(raw) {
  const base = cleanSec(raw) || String(raw || '').trim();
  if (!base || base === '(sin secretaría)') return base;
  const n = normSecretaria(base);

  if (n.includes('produccion y trabajo')) return SECRETARIA_NOMBRE.educacion;
  if (/\beduc/.test(n) || n === 'educacion') return SECRETARIA_NOMBRE.educacion;

  if (n.includes('infraestructura') && n.includes('planificacion')) return SECRETARIA_NOMBRE.obras;
  if (/obra/.test(n) && /public/.test(n)) return SECRETARIA_NOMBRE.obras;
  if (n === 'obras' || n === 'obra publica' || n === 'obras publicas') return SECRETARIA_NOMBRE.obras;

  return base;
}

export const shortLabel = (s, n = 16) => {
  const t = displaySecretaria(s);
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

/** SP (Solicitud de pedido) en formato x-x-x. */
export function formatSpNro(p1, p2, p3) {
  const parts = [p1, p2, p3].map((p) => String(p || '').trim()).filter(Boolean);
  return parts.length ? parts.join('-') : '';
}

/** AF (Anticipo Financiero) es informativo: no descuenta del saldo de la OC. */
export function conceptoAfectaSaldo(concepto) {
  return (concepto || '').trim().toUpperCase() !== 'AF';
}

/** Suma de montos que afectan el saldo (excluye AF). */
export function montoPagadoSaldo(pagos) {
  return (pagos || []).reduce((s, p) => {
    const concepto = p.concepto ?? p.periodo;
    if (!conceptoAfectaSaldo(concepto)) return s;
    const m = typeof p.monto === 'number' ? p.monto : parseMonto(p.monto);
    return s + (m || 0);
  }, 0);
}

/** Número de trámite: SP, o N° ítem si no hay SP. */
export function tramiteNumero({ sp_parte1, sp_parte2, sp_parte3, nro_item, item } = {}) {
  const sp = formatSpNro(sp_parte1, sp_parte2, sp_parte3);
  if (sp) return sp;
  const it = (item || nro_item || '').trim();
  return it || '';
}
