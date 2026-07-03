-- ============================================================
-- 0003_rls.sql — Roles y Row Level Security
-- lector: solo lee · editor: lee y escribe · admin: + gestiona usuarios/lookups
-- ============================================================

-- Helpers de rol (security definer para leer profiles sin recursión de RLS)
create or replace function is_editor() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('editor','admin'));
$$;

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Alta automática de profile al crear usuario (rol inicial: lector)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nombre, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'lector')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Habilitar RLS
alter table secretarias  enable row level security;
alter table proveedores  enable row level security;
alter table rubros        enable row level security;
alter table tramites      enable row level security;
alter table ordenes_pago  enable row level security;
alter table profiles      enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_admin());
drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update to authenticated
  using (is_admin()) with check (is_admin());

-- ---------- lookups (lectura: cualquier autenticado; escritura: editor+) ----------
do $$
declare tbl text;
begin
  foreach tbl in array array['secretarias','proveedores','rubros'] loop
    execute format('drop policy if exists %1$s_sel on %1$s;', tbl);
    execute format('create policy %1$s_sel on %1$s for select to authenticated using (true);', tbl);
    execute format('drop policy if exists %1$s_wr on %1$s;', tbl);
    execute format('create policy %1$s_wr on %1$s for all to authenticated using (is_editor()) with check (is_editor());', tbl);
  end loop;
end $$;

-- ---------- tramites ----------
drop policy if exists tramites_sel on tramites;
create policy tramites_sel on tramites for select to authenticated using (true);
drop policy if exists tramites_wr on tramites;
create policy tramites_wr on tramites for all to authenticated
  using (is_editor()) with check (is_editor());

-- ---------- ordenes_pago ----------
drop policy if exists pago_sel on ordenes_pago;
create policy pago_sel on ordenes_pago for select to authenticated using (true);
drop policy if exists pago_wr on ordenes_pago;
create policy pago_wr on ordenes_pago for all to authenticated
  using (is_editor()) with check (is_editor());
