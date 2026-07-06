// Etiquetas de área (agrupación dashboard) y tipos de procedimiento sugeridos.

export const AREA_LABEL = {
  obras: 'Infraestructura y planificación',
  educacion: 'EDUCACIÓN, PRODUCCIÓN Y TRABAJO',
};

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

/** Etiqueta de área para badge/filtros (legacy obras/educacion). */
export function areaLabel(key) {
  return AREA_LABEL[key] || '';
}

export function isTipoObras(oc) {
  if (oc?.areaKey === 'obras') return true;
  if (oc?.areaKey === 'educacion') return false;
  const sec = (oc?.secretaria || '').toLowerCase();
  if (sec.includes('educ') || sec.includes('producción') || sec.includes('produccion')) return false;
  return true;
}

export function inferArea(secretaria) {
  const s = (secretaria || '').toLowerCase();
  if (s.includes('educ') || s.includes('producción') || s.includes('produccion')) return 'educacion';
  return 'obras';
}
