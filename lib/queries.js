// Consulta a las vistas de saldo y transformación al "shape OC" que esperan
// los componentes reutilizados (Kpis/Filters/Charts/OcTable/report).

import {
  areaLabel,
  displaySecretaria,
  resolveAreaFromRecord,
  displayProcedimiento,
  secretariaDisplay,
} from './labels.js';
import { tramiteNumero } from './format.js';

export async function getTramites(supabase) {
  const [{ data: tr, error: e1 }, { data: pg, error: e2 }] = await Promise.all([
    supabase.from('v_tramite_saldo').select('*'),
    supabase.from('v_orden_pago_saldo').select('*').order('orden_index', { ascending: true }),
  ]);
  if (e1) throw new Error('v_tramite_saldo: ' + e1.message);
  if (e2) throw new Error('v_orden_pago_saldo: ' + e2.message);

  const pagosByTramite = {};
  for (const p of pg || []) {
    (pagosByTramite[p.tramite_id] ||= []).push({
      periodo: p.concepto || '',
      infRec: p.inf_rec || '',
      pagoNum: p.nro || '',
      monto: Number(p.monto) || 0,
      montoNeto: p.monto_neto != null ? Number(p.monto_neto) : null,
      saldoLuego: Number(p.saldo_luego) || 0,
      estado: p.estado || '',
    });
  }

  return (tr || []).map((t) => {
    const areaKey = resolveAreaFromRecord(t);
  return {
    id: t.id,
    areaKey,
    area: areaLabel(areaKey) || '',
    procedimiento: displayProcedimiento(t),
    secretaria: secretariaDisplay(areaKey, t.secretaria),
    tramiteNro: tramiteNumero(t),
    item: t.nro_item || '',
    descripcion: t.descripcion || '',
    proveedor: t.proveedor || '(sin proveedor)',
    ocNum: t.oc_nro || '',
    ocFecha: t.oc_fecha || '',
    ocMonto: Number(t.oc_monto) || 0,
    ocMontoFaltante: !!t.oc_monto_faltante,
    estado: t.estado || '',
    rubro: t.rubro || 'Otros',
    totalPagado: Number(t.total_pagado) || 0,
    saldo: Number(t.saldo) || 0,
    avance: Number(t.avance) || 0,
    estadoSaldo: t.estado_saldo,
    pagos: pagosByTramite[t.id] || [],
  };
  });
}

export async function getLookups(supabase) {
  const [sec, prov, rub] = await Promise.all([
    supabase.from('secretarias').select('nombre').order('nombre'),
    supabase.from('proveedores').select('nombre').order('nombre'),
    supabase.from('rubros').select('nombre').order('nombre'),
  ]);
  const names = (sec.data || []).map((r) => displaySecretaria(r.nombre));
  return {
    secretarias: [...new Set(names)].sort((a, b) => a.localeCompare(b, 'es')),
    proveedores: (prov.data || []).map((r) => r.nombre),
    rubros: (rub.data || []).map((r) => r.nombre),
  };
}

export async function getTramiteForEdit(supabase, id) {
  const { data, error } = await supabase
    .from('tramites')
    .select('*, secretarias(nombre), proveedores(nombre), rubros(nombre)')
    .eq('id', id).single();
  if (error) throw new Error(error.message);

  const numStr = (n) => (n == null ? '' : String(n));
  const areaKey = resolveAreaFromRecord(data);
  const initial = {
    id: data.id,
    procedimiento: displayProcedimiento(data),
    area: areaKey,
    secretaria: secretariaDisplay(areaKey, data.secretarias?.nombre),
    proveedor: data.proveedores?.nombre || '',
    rubro: data.rubros?.nombre || '',
    nro_item: data.nro_item || '',
    descripcion: data.descripcion || '',
    estado: data.estado || '',
    sp_parte1: data.sp_parte1 || '',
    sp_parte2: data.sp_parte2 || '',
    sp_parte3: data.sp_parte3 || '',
    oc_nro: data.oc_nro || '',
    oc_fecha: data.oc_fecha || '',
    oc_monto: numStr(data.oc_monto),
    financiamiento: data.financiamiento || '',
    destino: data.destino || '',
    cotizacion: data.cotizacion || '',
    acompanantes: data.acompanantes || '',
    vb_lyt: data.vb_lyt || '',
    vb_leo: data.vb_leo || '',
    sol_pedido_monto: numStr(data.sol_pedido_monto),
    sol_gasto_nro: data.sol_gasto_nro || '',
    proceso_tipo_numero: data.proceso_tipo_numero || '',
    proceso_apertura: data.proceso_apertura || '',
    obs_generales: data.obs_generales || '',
    obs_tecnicas: data.obs_tecnicas || '',
  };

  const { data: pagos } = await supabase
    .from('ordenes_pago').select('*').eq('tramite_id', id).order('orden_index');

  return { initial, pagos: pagos || [] };
}
