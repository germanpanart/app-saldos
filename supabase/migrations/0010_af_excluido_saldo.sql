-- 0010 — AF (Anticipo Financiero) no descuenta del saldo de la OC.
-- C1, C2, certificaciones y demás conceptos siguen descontando vía monto bruto.

drop view if exists v_orden_pago_saldo;
create view v_orden_pago_saldo as
select
  op.id,
  op.tramite_id,
  op.orden_index,
  op.concepto,
  op.inf_rec,
  op.nro,
  op.monto,
  op.fecha,
  op.estado,
  t.oc_monto,
  coalesce(t.oc_monto, 0)
    - sum(
        case when upper(trim(coalesce(op.concepto, ''))) = 'AF' then 0 else op.monto end
      ) over (
        partition by op.tramite_id
        order by op.orden_index
        rows between unbounded preceding and current row
      ) as saldo_luego,
  op.monto_neto
from ordenes_pago op
join tramites t on t.id = op.tramite_id;

drop view if exists v_tramite_saldo;
create view v_tramite_saldo as
with pagos as (
  select tramite_id,
         coalesce(sum(
           case when upper(trim(coalesce(concepto, ''))) = 'AF' then 0 else monto end
         ), 0) as total_pagado,
         count(*) as n_pagos
  from ordenes_pago
  group by tramite_id
)
select
  t.id,
  t.tipo,
  t.proceso_tipo_numero,
  t.area,
  t.nro_item,
  t.sp_parte1,
  t.sp_parte2,
  t.sp_parte3,
  t.descripcion,
  s.nombre  as secretaria,
  pr.nombre as proveedor,
  r.nombre  as rubro,
  t.estado,
  t.oc_nro,
  t.oc_fecha,
  t.oc_monto,
  (t.oc_monto is null)                                   as oc_monto_faltante,
  coalesce(p.total_pagado, 0)                            as total_pagado,
  coalesce(p.n_pagos, 0)                                 as n_pagos,
  coalesce(t.oc_monto, 0) - coalesce(p.total_pagado, 0)  as saldo,
  case when coalesce(t.oc_monto, 0) > 0
       then coalesce(p.total_pagado, 0) / t.oc_monto
       else 0 end                                        as avance,
  case
    when t.oc_monto is null then 'revisar'
    when abs(coalesce(t.oc_monto,0) - coalesce(p.total_pagado,0)) <= 1 then 'pagada'
    when (coalesce(t.oc_monto,0) - coalesce(p.total_pagado,0)) < -1   then 'sobrepago'
    else 'pendiente'
  end                                                    as estado_saldo
from tramites t
left join pagos       p  on p.tramite_id   = t.id
left join secretarias s  on s.id           = t.secretaria_id
left join proveedores pr on pr.id          = t.proveedor_id
left join rubros      r  on r.id           = t.rubro_id;
