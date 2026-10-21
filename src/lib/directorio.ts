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
    vetadoProyecto: s(r.vetado_proyecto),
    vetadoMotivo: s(r.vetado_motivo),
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

  await getPool().query(
    `insert into public.directorio_mensajeros
       (ident_trabajador, nombre_trabajador, telefono, estado, vetado, vetado_proyecto, vetado_motivo, contratado_fijo, contratado_fijo_proyecto, notas, actualizado_en)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
     on conflict (ident_trabajador) do update set
       nombre_trabajador = excluded.nombre_trabajador,
       telefono = excluded.telefono,
       estado = excluded.estado,
       vetado = excluded.vetado,
       vetado_proyecto = excluded.vetado_proyecto,
       vetado_motivo = excluded.vetado_motivo,
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
      entry.vetadoProyecto,
      entry.vetadoMotivo,
      entry.contratadoFijo,
      entry.contratadoFijoProyecto,
      entry.notas,
    ]
  );
  cached = null;
}
