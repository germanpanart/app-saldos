# Deploy en Netlify — app-saldos

Guía paso a paso para publicar la app en producción.

## Requisitos previos

- Proyecto **Supabase** con migraciones aplicadas y datos cargados (seed).
- Usuarios creados en **Auth** con roles en `profiles`.
- Cuenta en [Netlify](https://app.netlify.com) (plan gratuito alcanza).
- Repositorio Git en GitHub, GitLab o Bitbucket (recomendado).

## 1. Subir el código a Git

Desde la carpeta `app-saldos`:

```powershell
git init
git add .
git commit -m "Initial commit: app-saldos"
```

Creá un repo vacío en GitHub y conectalo:

```powershell
git remote add origin https://github.com/TU-USUARIO/app-saldos.git
git branch -M main
git push -u origin main
```

> Si el repo padre incluye también `dashboard-saldos/`, en Netlify configurá **Base directory** = `app-saldos` en lugar de desplegar solo esa carpeta.

## 2. Crear el sitio en Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Conectá GitHub y elegí el repositorio.
3. Netlify detecta `netlify.toml` automáticamente. Verificá:

| Campo | Valor |
|-------|-------|
| **Base directory** | *(vacío si el repo es solo `app-saldos`)* o `app-saldos` |
| **Build command** | `npm run build` |
| **Publish directory** | *(lo define el plugin Next.js)* |
| **Node version** | `20` |

4. **Deploy site** (el primer build puede fallar hasta configurar variables — es normal).

## 3. Variables de entorno en Netlify

**Site configuration** → **Environment variables** → **Add a variable**:

| Variable | Valor | Scopes |
|----------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wibegfzexsvddwaffdae.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(anon key de Supabase → Settings → API)* | All |

Copiá los mismos valores que tenés en `.env.local` local.

**No subas** `SUPABASE_SERVICE_ROLE_KEY` a Netlify — solo se usa en el seed local (`npm run seed`).

Después de guardar las variables: **Deploys** → **Trigger deploy** → **Deploy site**.

## 4. Configurar Supabase Auth para producción

En [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **Authentication** → **URL Configuration**:

| Campo | Valor |
|-------|-------|
| **Site URL** | `https://TU-SITIO.netlify.app` |
| **Redirect URLs** | `https://TU-SITIO.netlify.app/**` |
| | `http://localhost:3000/**` *(desarrollo local)* |

Reemplazá `TU-SITIO` por el subdominio que Netlify asigna (ej. `saldos-oc-compras.netlify.app`) o tu dominio custom.

Sin este paso el login puede fallar o redirigir mal tras autenticarse.

## 5. Verificar el deploy

1. Abrí `https://TU-SITIO.netlify.app` → debe redirigir a `/login`.
2. Ingresá con un usuario editor (ej. `renzo.comprasmlz@gmail.com`).
3. Confirmá que el dashboard carga trámites y KPIs.
4. Probá crear/editar un trámite de prueba.

## 6. Dominio propio (opcional)

**Domain management** → **Add a domain** → seguí el asistente DNS.

Luego actualizá en Supabase:
- **Site URL** → `https://tudominio.gob.ar`
- **Redirect URLs** → `https://tudominio.gob.ar/**`

## Deploy manual (sin Git)

Alternativa si no querés usar GitHub todavía:

```powershell
npm install -g netlify-cli
netlify login
netlify init          # vincula o crea el sitio
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://..."
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJ..."
netlify deploy --build --prod
```

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Build falla: plugin Next.js | Node &lt; 18 | Confirmar `NODE_VERSION = "20"` en netlify.toml |
| Login OK pero datos vacíos | RLS o credenciales | Revisar anon key y que el usuario tenga rol en `profiles` |
| Error tras login / redirect loop | URLs de Auth | Actualizar Site URL y Redirect URLs en Supabase |
| 404 en rutas | Plugin no instalado | Verificar `[[plugins]]` en netlify.toml y que `@netlify/plugin-nextjs` esté en `devDependencies` |
| Variables no aplican | Cache de build | Trigger deploy limpio (Clear cache and deploy) |

## Checklist rápido

- [ ] Migraciones SQL ejecutadas en Supabase
- [ ] Seed ejecutado (`npm run seed`)
- [ ] Usuarios con rol `editor` en `profiles`
- [ ] Repo en GitHub conectado a Netlify
- [ ] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Netlify
- [ ] Site URL y Redirect URLs en Supabase Auth
- [ ] Login y dashboard funcionan en producción
