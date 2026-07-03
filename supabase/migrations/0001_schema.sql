-- ============================================================
-- 0001_schema.sql — Esquema del circuito de Órdenes de Compra
-- Sistema autónomo (reemplaza el Google Sheets). Postgres / Supabase.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Lookups ----------
create table if not exists secretarias (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table if not exists proveedores (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  cuit   text
);

create table if not exists rubros (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

-- ---------- Perfiles / roles ----------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  role       text not null default 'lector' check (role in ('admin','editor','lector')),
  created_at timestamptz not null default now()
);

-- ---------- Trámite (spine del circuito) ----------
-- Nota de diseño: solicitud de gasto y proceso son 1:1 con el trámite,
-- así que se pliegan como columnas (evita joins). Si a futuro hay >1 OC
-- por trámite o etapas con historial, se promueven a tablas propias.
create table if not exists tramites (
  id              uuid primary key default gen_random_uuid(),
  import_key      text unique,                                   -- idempotencia del seed
  tipo            text not null check (tipo in ('obras','educacion')),

  -- Solicitud de pedido
  secretaria_id   uuid references secretarias(id),
  nro_item        text,
  descripcion     text,
  rubro_id        uuid references rubros(id),
  financiamiento  text,
  destino         text,
  cotizacion      text,
  acompanantes    text,
  vb_lyt          text,
  vb_leo          text,
  sol_pedido_monto numeric(18,2),

  -- Solicitud de gasto / Proceso
  sol_gasto_nro       text,
  proceso_tipo_numero text,
  proceso_apertura    date,
  proveedor_id        uuid references proveedores(id),

  -- Orden de compra (1 por trámite)
  oc_nro          text,
  oc_fecha        date,
  oc_monto        numeric(18,2),         -- NULL = monto OC aún sin cargar (estado 'revisar')

  -- Estado / observaciones
  estado          text,
  obs_generales   text,
  obs_tecnicas    text,

  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_tramites_tipo on tramites(tipo);
create index if not exists idx_tramites_secretaria on tramites(secretaria_id);
create index if not exists idx_tramites_proveedor on tramites(proveedor_id);

-- ---------- Órdenes de pago (1:N con el trámite) ----------
create table if not exists ordenes_pago (
  id          uuid primary key default gen_random_uuid(),
  tramite_id  uuid not null references tramites(id) on delete cascade,
  orden_index int  not null,                 -- orden de carga (AF=1, C1=2, ...)
  concepto    text,                           -- 'AF','C1','C2'... o nombre de mes (alquiler)
  inf_rec     text,
  nro         text,
  monto       numeric(18,2) not null default 0,
  fecha       date,
  estado      text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (tramite_id, orden_index)
);

create index if not exists idx_pago_tramite on ordenes_pago(tramite_id);

-- ---------- updated_at automático en tramites ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_tramites_updated on tramites;
create trigger trg_tramites_updated before update on tramites
  for each row execute function set_updated_at();
