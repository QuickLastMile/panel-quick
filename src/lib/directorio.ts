import { Pool } from 'pg';
import type { DirectorioEntry } from './directorio-types';

export type { DirectorioEntry } from './directorio-types';
export { emptyDirectorioEntry } from './directorio-types';

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

function rowToEntry(r: Record<string, unknown>): DirectorioEntry {
  const s = (v: unknown) => String(v ?? '').trim();
  return {
    identTrabajador: s(r.ident_trabajador),
    nombreTrabajador: s(r.nombre_trabajador),
    telefono: s(r.telefono),
    estado: s(r.estado) === 'Inactivo' ? 'Inactivo' : 'Activo',
    vetado: Boolean(r.vetado),
    vetadoProyectos: Array.isArray(r.vetado_proyectos) ? (r.vetado_proyectos as unknown[]).map((v) => String(v)) : [],
    vetadoMotivo: s(r.vetado_motivo),
    vetadoDesde: r.vetado_desde ? new Date(r.vetado_desde as string).toISOString().slice(0, 10) : '',
    contratadoFijo: Boolean(r.contratado_fijo),
    contratadoFijoProyecto: s(r.contratado_fijo_proyecto),
    notas: s(r.notas),
    actualizadoEn: r.actualizado_en ? new Date(r.actualizado_en as string).toISOString() : '',
  };
}

async function fetchDirectorioUncached(): Promise<DirectorioEntry[]> {
  const res = await getPool().query(`select * from public.directorio_mensajeros order by ident_trabajador`);
  return res.rows.map(rowToEntry);
}

// Caché corta: a diferencia del snapshot principal, esto se invalida de
// inmediato tras cada escritura (ver invalidateDirectorioCache) para que el
// admin vea su propio cambio sin esperar.
let cached: { data: DirectorioEntry[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getDirectorio(): Promise<DirectorioEntry[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await fetchDirectorioUncached();
  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export async function saveDirectorioEntry(entry: DirectorioEntry): Promise<void> {
  const ident = entry.identTrabajador.trim();
  if (!ident) throw new Error('Falta la identificación del trabajador.');

  const pool = getPool();

  // `vetado_desde` no se edita a mano — se calcula acá: si ya estaba
  // vetado se conserva la fecha original (para que la alerta de
  // reasignación no se "reinicie" cada vez que se edita otro campo), y si
  // recién se está marcando vetado ahora, se estampa hoy.
  let vetadoDesde: string | null = null;
  if (entry.vetado) {
    const before = await pool.query(
      `select vetado, vetado_desde from public.directorio_mensajeros where ident_trabajador = $1`,
      [ident]
    );
    const prev = before.rows[0];
    vetadoDesde = prev?.vetado && prev.vetado_desde ? prev.vetado_desde : new Date().toISOString().slice(0, 10);
  }

  await pool.query(
    `insert into public.directorio_mensajeros
       (ident_trabajador, nombre_trabajador, telefono, estado, vetado, vetado_proyectos, vetado_motivo, vetado_desde, contratado_fijo, contratado_fijo_proyecto, notas, actualizado_en)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
     on conflict (ident_trabajador) do update set
       nombre_trabajador = excluded.nombre_trabajador,
       telefono = excluded.telefono,
       estado = excluded.estado,
       vetado = excluded.vetado,
       vetado_proyectos = excluded.vetado_proyectos,
       vetado_motivo = excluded.vetado_motivo,
       vetado_desde = excluded.vetado_desde,
       contratado_fijo = excluded.contratado_fijo,
       contratado_fijo_proyecto = excluded.contratado_fijo_proyecto,
       notas = excluded.notas,
       actualizado_en = now()`,
    [
      ident,
      entry.nombreTrabajador,
      entry.telefono,
      entry.estado,
      entry.vetado,
      entry.vetadoProyectos,
      entry.vetadoMotivo,
      vetadoDesde,
      entry.contratadoFijo,
      entry.contratadoFijoProyecto,
      entry.notas,
    ]
  );
  cached = null;
}
