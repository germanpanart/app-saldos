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
  return tipo;
}

/** Separa tipología y número del campo legacy "TIPO Y NUMERO" del Sheet. */
export function splitProcesoTipoNumero(proceso_tipo_numero) {
  const s = (proceso_tipo_numero || '').trim();
  if (!s) return { tipo: '', numero: '' };

  const sorted = [...TIPOS_PROCEDIMIENTO].sort((a, b) => b.length - a.length);
  for (const t of sorted) {
    if (s.toLowerCase().startsWith(t.toLowerCase())) {
      return { tipo: t, numero: s.slice(t.length).trim() };
    }
  }

  const m = s.match(/^(.+?)\s+(\d[\d\-/]*\d|\d+)$/);
  if (m) return { tipo: m[1].trim(), numero: m[2].trim() };
  return { tipo: s, numero: '' };
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
