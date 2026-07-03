# app-saldos — Sistema autónomo (Next.js + Supabase)

Reemplaza al Google Sheets como **fuente de verdad** de las Órdenes de Compra y sus pagos.
Login real con roles, dashboard, carga/edición (CRUD), saldo calculado en la base y export PDF/Word.

## Estado por fases
- **F0 ✅ Datos** — esquema, vistas de saldo, RLS, auditoría, seed de migración.
- **F1 ✅ Dashboard + Auth** — Next.js App Router, login Supabase, roles, KPIs/filtros/charts/tabla/export.
- **F2 ✅ CRUD** — alta/edición de trámite + órdenes de pago (datalists de lookups, role-gated). Incluye los campos del circuito extendido (solicitud/proceso/V.B./observaciones).
- **F3+ ⏳** — adjuntos (Storage), backfill de campos extendidos en la migración, reportes adicionales, cutover.

## Puesta en marcha

### 1) Proyecto Supabase + migraciones
- Crear proyecto en supabase.com. Guardar **URL**, **anon key** y **service_role key** (Settings ▸ API).
- En **SQL Editor**, ejecutar en orden: `supabase/migrations/0001_schema.sql` → `0002_views.sql` → `0003_rls.sql` → `0004_audit.sql`.

### 2) Migrar datos actuales (seed)
```bash
npm install
npm run seed:dry                 # verifica contra el endpoint en vivo (no inserta)
cp .env.example .env             # completar SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm run seed                     # inserta/actualiza (idempotente por import_key)
```

### 3) App (Next.js)
```bash
cp .env.local.example .env.local # completar NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                      # http://localhost:3000
npm run build                    # build de producción
```

### 4) Usuarios y roles
- Crear usuarios en **Auth ▸ Users** (o invitación). Al crearse, un trigger les asigna rol `lector`.
- Promover a quien corresponda:
```sql
update profiles set role = 'editor' where id = '<user-id>';  -- carga
update profiles set role = 'admin'  where id = '<user-id>';  -- + gestiona usuarios/lookups/auditoría
```
`lector` lee · `editor` carga/edita · `admin` además administra. Lo aplica **RLS** en la base (no solo la UI).

## Deploy (Netlify)
- Ver **[DEPLOY.md](./DEPLOY.md)** — guía completa paso a paso.
- Variables en Netlify: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Configurar **Site URL** y **Redirect URLs** en Supabase Auth con el dominio Netlify.
- El `service_role` **no** va al frontend (solo se usa en el seed, local).

## Arquitectura
- **Next.js App Router**: `app/login` (público), `app/(app)/*` (protegido por `middleware.js` + layout que valida sesión y rol).
- **Supabase**: `lib/supabase/{client,server,middleware}.js` (`@supabase/ssr`, sesión por cookies).
- **Datos → UI**: `lib/queries.js#getTramites` lee las vistas `v_tramite_saldo` / `v_orden_pago_saldo` y arma el shape OC que consumen los componentes reutilizados (`components/Kpis|Filters|Charts|OcTable`, `lib/report.js`).
- **CRUD**: `components/TramiteForm.jsx` escribe en `tramites`/`ordenes_pago` con el cliente del navegador (RLS valida rol). Lookups por upsert (datalist).
- **Saldo**: lógica del Sheets portada a SQL (vistas). Auditoría por triggers.

## Verificación end-to-end (con Supabase real)
1. `select * from v_tramite_saldo where oc_nro='48' and tipo='educacion';` → saldo `56851781.28`.
2. `select count(*) from tramites;` → 95 tras el seed.
3. Login como `lector`: ve el dashboard, no ve "Nuevo trámite" y un `insert` directo es rechazado por RLS.
4. Login como `editor`: crea un trámite, agrega AF+C1, guarda → aparece en el dashboard con el saldo correcto; editar/borrar un pago recalcula el saldo.
5. `select * from audit_log order by ts desc limit 5;` → registra cada cambio con `user_id`.

## Notas
- Warning de build `process.version ... Edge Runtime` (en `@supabase/ssr` dentro del middleware): benigno, funciona en Vercel/Node.
- El seed migra el núcleo (trámite + OC + pagos + secretaría/proveedor/rubro/estado). Los campos del circuito extendido ya existen en el esquema y en el formulario; su backfill masivo se hace en F3 (ampliando el endpoint Apps Script o leyendo el `.xlsx`).
- Reusa la lógica de `dashboard-saldos/` (parser ARS, saldo, export) — sin reescribir.
