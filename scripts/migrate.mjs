#!/usr/bin/env node
/**
 * Aplica las migraciones SQL (DDL) contra la base de Supabase vía conexión Postgres.
 *   node --env-file=.env scripts/migrate.mjs
 * Requiere DATABASE_URL en el entorno (conexión directa, puerto 5432).
 * Idempotente: las migraciones usan IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'supabase', 'migrations');

const url = getDatabaseUrl();
if (!url) {
  console.error('ERROR: falta conexión a Postgres.');
  console.error('  Opción A: DATABASE_URL en .env (Supabase ▸ Connect ▸ Session pooler)');
  console.error('  Opción B: SUPABASE_DB_PASSWORD en .env (contraseña del proyecto al crearlo)');
  process.exit(1);
}

function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (raw && !raw.includes('XXXX') && !raw.includes('TU-PASSWORD')) return raw;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const base = process.env.SUPABASE_URL;
  if (!password || !base) return null;
  const ref = new URL(base).hostname.split('.')[0];
  const host = process.env.SUPABASE_DB_HOST || `db.${ref}.supabase.co`;
  return `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8');
    process.stdout.write(`-> ${f} ... `);
    await client.query(sql);
    console.log('ok');
  }
  console.log('\nMigraciones aplicadas correctamente.');
} catch (e) {
  console.error('\nERROR aplicando migraciones:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
