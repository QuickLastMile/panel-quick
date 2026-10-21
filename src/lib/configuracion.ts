import { Pool } from 'pg';
import { defaultRangoConfig, RANGO_MAX_DIAS, type RangoConfig } from './configuracion-types';

export type { RangoConfig } from './configuracion-types';
export { defaultRangoConfig } from './configuracion-types';

let pool: Pool | null = null;
function getPool(): Pool {
  if (pool) return pool;
  const host = process.env.SUPA_DB_HOST;
  const port = process.env.SUPA_DB_PORT;
  const user = process.env.SUPA_DB_USER;
  const password = process.env.SUPA_DB_PASSWORD;
  if (!host || !port || !user || !password) {
    throw new Error('Faltan las variables SUPA_DB_* en las variables de entorno.');
  }
  pool = new Pool({
    host,
    port: Number(port),
    user,
    password,
    database: process.env.SUPA_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
    max: 5,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

// Fila única (id = 1) — ver automation/lib/config.mjs para la misma tabla
// leída desde la automatización local.
export async function getRangoConfig(): Promise<RangoConfig> {
  const res = await getPool().query(`select dias_atras, dias_adelante from public.configuracion where id = 1`);
  const row = res.rows[0];
  const def = defaultRangoConfig();
  if (!row) return def;
  const atras = Number(row.dias_atras);
  const adelante = Number(row.dias_adelante);
  return {
    diasAtras: Number.isFinite(atras) && atras >= 0 && atras <= RANGO_MAX_DIAS ? atras : def.diasAtras,
    diasAdelante: Number.isFinite(adelante) && adelante >= 0 && adelante <= RANGO_MAX_DIAS ? adelante : def.diasAdelante,
  };
}

export async function saveRangoConfig(rango: RangoConfig): Promise<void> {
  if (rango.diasAtras < 0 || rango.diasAtras > RANGO_MAX_DIAS) throw new Error(`"Días hacia atrás" debe estar entre 0 y ${RANGO_MAX_DIAS}.`);
  if (rango.diasAdelante < 0 || rango.diasAdelante > RANGO_MAX_DIAS)
    throw new Error(`"Días hacia adelante" debe estar entre 0 y ${RANGO_MAX_DIAS}.`);

  await getPool().query(
    `insert into public.configuracion (id, dias_atras, dias_adelante) values (1, $1, $2)
     on conflict (id) do update set dias_atras = excluded.dias_atras, dias_adelante = excluded.dias_adelante`,
    [rango.diasAtras, rango.diasAdelante]
  );
}
