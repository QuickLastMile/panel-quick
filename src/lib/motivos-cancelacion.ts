import { Pool } from 'pg';
import { logModificacion } from './modificaciones';

export type MotivoCancelacionConfig = {
  motivo: string;
  cuentaEnPerdida: boolean;
};

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

// Mismo criterio que normalizeMotivoCancelacion() en aggregate.ts — Quick a
// veces guarda el mismo motivo repetido y concatenado con "-"
// (ej. "Cliente cancela servicio- Cliente cancela servicio").
export function normalizeMotivo(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '(sin motivo registrado)';
  const parts = trimmed.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => p.toLowerCase() === parts[0].toLowerCase())) {
    return parts[0];
  }
  return trimmed;
}

export async function getMotivosCancelacionConfig(): Promise<MotivoCancelacionConfig[]> {
  const res = await getPool().query(`select motivo, cuenta_en_perdida from public.motivos_cancelacion_config order by motivo`);
  return res.rows.map((r) => ({ motivo: String(r.motivo), cuentaEnPerdida: Boolean(r.cuenta_en_perdida) }));
}

// Se llama en cada carga de la pestaña Cancelación: si aparece un motivo
// nuevo que todavía no está clasificado, se agrega con cuenta_en_perdida =
// false por defecto — así nunca falta uno sin que la usuaria lo note (sale
// en la lista de configuración para que lo clasifique).
export async function ensureMotivosRegistrados(motivos: string[]): Promise<void> {
  const vistos = [...new Set(motivos.map((m) => m.trim()).filter(Boolean))];
  if (!vistos.length) return;
  const pool = getPool();
  for (const motivo of vistos) {
    await pool.query(
      `insert into public.motivos_cancelacion_config (motivo) values ($1) on conflict (motivo) do nothing`,
      [motivo]
    );
  }
}

export async function setMotivoCuentaEnPerdida(motivo: string, cuentaEnPerdida: boolean, usuario: string): Promise<void> {
  const pool = getPool();
  const before = await pool.query(`select cuenta_en_perdida from public.motivos_cancelacion_config where motivo = $1`, [motivo]);
  await pool.query(
    `insert into public.motivos_cancelacion_config (motivo, cuenta_en_perdida, actualizado_en) values ($1,$2, now())
     on conflict (motivo) do update set cuenta_en_perdida = excluded.cuenta_en_perdida, actualizado_en = now()`,
    [motivo, cuentaEnPerdida]
  );
  const antes = before.rows[0] ? (before.rows[0].cuenta_en_perdida ? 'Sí' : 'No') : '';
  await logModificacion({
    area: 'Configuración (Tipos de cancelación)',
    entidad: motivo,
    usuario,
    campo: 'Cuenta como pérdida',
    valorAnterior: antes,
    valorNuevo: cuentaEnPerdida ? 'Sí' : 'No',
  });
}
