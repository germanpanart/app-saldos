// Área (secretaría institucional), nombres oficiales y tipos de procedimiento de contratación.

import { SECRETARIA_NOMBRE, displaySecretaria } from './format.js';

export { SECRETARIA_NOMBRE, displaySecretaria };

export const AREA_LABEL = {
  obras: 'Infraestructura y Planificación',
  educacion: 'Educación, Producción y Trabajo',
};

/** Tipos de procedimiento / licitación (columna `tipo` en BD). */
export const TIPOS_PROCEDIMIENTO = [
  'Licitación Pública',
  'Licitación Privada',
  'Concurso de precios',
  'Compra Directa',
  'Compra directa Art. 156',
  'Compra Directa Obra Pública',
  'Ampliacion de contratación, Continuidad de servicio, Renovacion',
  'Redeterminación',
  'Prórroga',
];

export function areaLabel(key) {
  return AREA_LABEL[key] || '';
}

function norm(s) {
  return (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Compacta texto para comparar variantes (sin tildes, puntos, espacios extra). */
function compact(s) {
  return norm(s)
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reglas de normalización ordenadas de más específica a más genérica.
 * Mapea abreviaciones, variantes de mayúsculas/tildes y sinónimos al tipo canónico.
 */
const PROCEDIMIENTO_RULES = [
  {
    canonical: 'Compra directa Art. 156',
    test: (c) =>
      /compra directa.*(?:art\.?\s*)?156/.test(c) ||
      /^art\.?\s*156(?:\s|$)/.test(c),
  },
  {
    canonical: 'Compra Directa Obra Pública',
    test: (c) =>
      /compra directa.*obra\s*publica/.test(c) ||
      /contratacion\s*directa.*obra/.test(c) ||
      /contratacion\s*direc.*obra/.test(c) ||
      /^directa\s*op(?:\s|$)/.test(c) ||
      /^directa\s*obra/.test(c),
  },
  {
    canonical: 'Ampliacion de contratación, Continuidad de servicio, Renovacion',
    test: (c) =>
      /ampliacion\s*de\s*contratacion/.test(c) ||
      /continuidad\s*de\s*servicio/.test(c) ||
      /\brenovacion\b/.test(c) ||
      c === 'ampliacion',
  },
  {
    canonical: 'Redeterminación',
    test: (c) => /redeterminacion/.test(c),
  },
  {
    canonical: 'Prórroga',
    test: (c) => /^prorroga(?:\s|$)/.test(c) || c === 'prorroga',
  },
  {
    canonical: 'Licitación Privada',
    test: (c) =>
      /^lic\s*privada(?:\s|$)/.test(c) ||
      /^licitacion\s*privada(?:\s|$)/.test(c) ||
      c === 'privada' ||
      c === 'lic privada',
  },
  {
    canonical: 'Licitación Pública',
    test: (c) =>
      /^lic\s*publica(?:\s|$)/.test(c) ||
      /^licitacion\s*publica(?:\s|$)/.test(c) ||
      c === 'publica' ||
      c === 'lic publica',
  },
  {
    canonical: 'Concurso de precios',
    test: (c) => /concurso\s*(?:de\s*)?precios/.test(c),
  },
  {
    canonical: 'Compra Directa',
    test: (c) =>
      /^compra\s*directa(?:\s|$)/.test(c) ||
      c === 'directa' ||
      /^contratacion\s*directa(?:\s|$)/.test(c),
  },
];

/** Normaliza una tipología de trámite al valor canónico de TIPOS_PROCEDIMIENTO. */
export function normalizeProcedimientoTipo(raw) {
  const s = (raw || '').trim();
  if (!s) return '';

  for (const t of TIPOS_PROCEDIMIENTO) {
    if (compact(t) === compact(s)) return t;
  }

  const c = compact(s);
  for (const rule of PROCEDIMIENTO_RULES) {
    if (rule.test(c)) return rule.canonical;
  }

  return s;
}

/** Valores legacy que identifican el área (venían del nombre de pestaña del Sheet). */
function isLegacyAreaName(value) {
  const n = norm(value);
  if (!n) return false;
  if (n === 'obras' || n === 'educacion') return true;
  if (n.includes('obras public') || n.includes('obra publica')) return true;
  if (n.includes('educacion infra') || n.includes('educación infra')) return true;
  return false;
}

export function inferArea(secretaria) {
  const sec = displaySecretaria(secretaria).toLowerCase();
  if (sec.includes('educación, producción') || sec.includes('educacion, produccion')) return 'educacion';
  if (sec.includes('educ')) return 'educacion';
  return 'obras';
}

/** Área institucional: obras | educacion (antes confundida con columna tipo). */
export function resolveAreaFromRecord({ area, tipo, secretaria }) {
  if (area === 'obras' || area === 'educacion') return area;
  if (tipo === 'obras' || tipo === 'educacion') return tipo;
  if (isLegacyAreaName(tipo)) {
    const n = norm(tipo);
    if (n.includes('educ')) return 'educacion';
    return 'obras';
  }
  return inferArea(secretaria);
}

/** Procedimiento de contratación (Licitación Pública, etc.). Excluye nombres legacy de área. */
export function resolveProcedimiento(tipo) {
  if (!tipo || isLegacyAreaName(tipo)) return '';
  return normalizeProcedimientoTipo(tipo);
}

/** Separa tipología y número del campo legacy "TIPO Y NUMERO" del Sheet. */
export function splitProcesoTipoNumero(proceso_tipo_numero) {
  const s = (proceso_tipo_numero || '').trim();
  if (!s) return { tipo: '', numero: '' };

  const m = s.match(/^(.+?)\s+(\d[\d\-/]*\d|\d+)$/);
  const rawTipo = m ? m[1].trim() : s;
  const numero = m ? m[2].trim() : '';
  return { tipo: normalizeProcedimientoTipo(rawTipo), numero };
}

/** Solo el tipo de procedimiento (sin número de unidad de trámite). */
export function procedimientoTipo({ tipo, proceso_tipo_numero } = {}) {
  const proc = resolveProcedimiento(tipo);
  if (proc) return proc;
  return splitProcesoTipoNumero(proceso_tipo_numero).tipo;
}

/** Solo el número de procedimiento / unidad de trámite. */
export function procedimientoNumero({ proceso_tipo_numero } = {}) {
  return splitProcesoTipoNumero(proceso_tipo_numero).numero;
}

/** Procedimiento mostrado en dashboard/informes (solo tipología, sin número). */
export function displayProcedimiento(record = {}) {
  return procedimientoTipo(record);
}

export function secretariaDisplay(areaKey, raw) {
  const name = displaySecretaria(raw);
  if (name && name !== '(sin secretaría)' && !name.startsWith('(sin')) return name;
  if (areaKey === 'obras') return SECRETARIA_NOMBRE.obras;
  if (areaKey === 'educacion') return SECRETARIA_NOMBRE.educacion;
  return name || '(sin secretaría)';
}

export function isTipoObras(oc) {
  const area = oc?.areaKey || resolveAreaFromRecord(oc || {});
  return area === 'obras';
}
