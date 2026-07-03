-- ============================================================
-- 0004_audit.sql — Auditoría (quién cargó / cambió qué)
-- Triggers en tramites y ordenes_pago. Robusto ante cualquier vía de escritura.
-- ============================================================

create table if not exists audit_log (
  id         bigint generated always as identity primary key,
  entidad    text not null,
  entidad_id uuid,
  accion     text not null,           -- INSERT | UPDATE | DELETE
  diff       jsonb,
  user_id    uuid,
  ts         timestamptz not null default now()
);
create index if not exists idx_audit_entidad on audit_log(entidad, entidad_id);
create index if not exists idx_audit_ts on audit_log(ts desc);

create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_diff jsonb;
begin
  if TG_OP = 'DELETE' then
    v_id := OLD.id; v_diff := jsonb_build_object('old', to_jsonb(OLD));
  elsif TG_OP = 'INSERT' then
    v_id := NEW.id; v_diff := jsonb_build_object('new', to_jsonb(NEW));
  else
    v_id := NEW.id; v_diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  end if;
  insert into audit_log (entidad, entidad_id, accion, diff, user_id)
  values (TG_TABLE_NAME, v_id, TG_OP, v_diff, auth.uid());
  return coalesce(NEW, OLD);
end; $$;

drop trigger if exists audit_tramites on tramites;
create trigger audit_tramites after insert or update or delete on tramites
  for each row execute function audit_trigger();

drop trigger if exists audit_ordenes_pago on ordenes_pago;
create trigger audit_ordenes_pago after insert or update or delete on ordenes_pago
  for each row execute function audit_trigger();

-- Solo admin lee la auditoría
alter table audit_log enable row level security;
drop policy if exists audit_sel_admin on audit_log;
create policy audit_sel_admin on audit_log for select to authenticated using (is_admin());
