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

/** Procedimiento mostrado en dashboard/informes (tipo o columna TIPO Y NUMERO del Sheet). */
export function displayProcedimiento({ tipo, proceso_tipo_numero } = {}) {
  const proc = resolveProcedimiento(tipo);
  if (proc) return proc;
  return (proceso_tipo_numero || '').trim();
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
