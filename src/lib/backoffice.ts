import { Pool } from 'pg';
import { logModificacion } from './modificaciones';
import { MAX_COLUMNAS, MAX_FILAS, MAX_LARGO_CELDA, type CargaDetalle, type CargaResumen, type Celda } from './backoffice-types';

// BackOffice: archivos de ajuste que sube el agilizador. Todavía no hay un
// formato fijo, así que cada carga guarda sus propias columnas y filas tal
// cual vienen del Excel (jsonb) — las gráficas se arman en el cliente
// detectando qué columnas son categoría, número o fecha. Una carga mal
// subida se anula (anulada = true), no se borra, para que quede rastro.
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

// La tabla se crea sola la primera vez que se usa — así no hay que correr
// nada a mano en Supabase antes de desplegar.
let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS public.backoffice_cargas (
           id bigserial PRIMARY KEY,
           archivo text NOT NULL,
           hoja text NOT NULL DEFAULT '',
           columnas jsonb NOT NULL,
           filas jsonb NOT NULL,
           total_filas integer NOT NULL,
           subido_por text NOT NULL,
           subido_por_nombre text NOT NULL DEFAULT '',
           subido_en timestamptz NOT NULL DEFAULT now(),
           anulada boolean NOT NULL DEFAULT false
         )`
      )
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null;
        throw e;
      });
  }
  return schemaReady;
}

function toResumen(r: Record<string, unknown>): CargaResumen {
  return {
    id: String(r.id),
    archivo: String(r.archivo || ''),
    hoja: String(r.hoja || ''),
    totalFilas: Number(r.total_filas) || 0,
    totalColumnas: Number(r.total_columnas) || 0,
    subidoPor: String(r.subido_por || ''),
    subidoPorNombre: String(r.subido_por_nombre || ''),
    subidoEn: r.subido_en instanceof Date ? r.subido_en.toISOString() : String(r.subido_en || ''),
  };
}

export async function listCargas(): Promise<CargaResumen[]> {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT id, archivo, hoja, total_filas, jsonb_array_length(columnas) AS total_columnas,
            subido_por, subido_por_nombre, subido_en
       FROM public.backoffice_cargas
      WHERE NOT anulada
      ORDER BY subido_en DESC
      LIMIT 200`
  );
  return res.rows.map(toResumen);
}

export async function getCarga(id: string): Promise<CargaDetalle | null> {
  if (!/^\d+$/.test(id)) return null;
  await ensureSchema();
  const res = await getPool().query(
    `SELECT id, archivo, hoja, total_filas, jsonb_array_length(columnas) AS total_columnas,
            subido_por, subido_por_nombre, subido_en, columnas, filas
       FROM public.backoffice_cargas
      WHERE id = $1 AND NOT anulada`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return { ...toResumen(r), columnas: r.columnas as string[], filas: r.filas as Celda[][] };
}

// Lo que llega del navegador no es confiable: se revisa forma y tamaño
// antes de guardar, y se recortan textos larguísimos.
function limpiarCarga(input: { archivo: unknown; hoja: unknown; columnas: unknown; filas: unknown }) {
  const archivo = String(input.archivo || '').trim().slice(0, 200);
  const hoja = String(input.hoja || '').trim().slice(0, 100);
  if (!archivo) throw new Error('Falta el nombre del archivo.');
  if (!Array.isArray(input.columnas) || !input.columnas.length) throw new Error('El archivo no tiene encabezados.');
  if (input.columnas.length > MAX_COLUMNAS) throw new Error(`El archivo tiene más de ${MAX_COLUMNAS} columnas.`);
  const columnas = input.columnas.map((c, i) => String(c ?? '').trim().slice(0, 120) || `Columna ${i + 1}`);
  if (!Array.isArray(input.filas) || !input.filas.length) throw new Error('El archivo no tiene filas con datos.');
  if (input.filas.length > MAX_FILAS) throw new Error(`El archivo tiene más de ${MAX_FILAS.toLocaleString('es-CO')} filas.`);
  const filas: Celda[][] = input.filas.map((fila) => {
    if (!Array.isArray(fila)) throw new Error('Formato de filas inválido.');
    return columnas.map((_, i) => {
      const v = fila[i];
      if (v === null || v === undefined || v === '') return null;
      if (typeof v === 'number') return Number.isFinite(v) ? v : null;
      return String(v).slice(0, MAX_LARGO_CELDA);
    });
  });
  return { archivo, hoja, columnas, filas };
}

export async function saveCarga(
  input: { archivo: unknown; hoja: unknown; columnas: unknown; filas: unknown },
  usuario: { email: string; nombre: string }
): Promise<string> {
  const { archivo, hoja, columnas, filas } = limpiarCarga(input);
  await ensureSchema();
  const res = await getPool().query(
    `INSERT INTO public.backoffice_cargas (archivo, hoja, columnas, filas, total_filas, subido_por, subido_por_nombre)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [archivo, hoja, JSON.stringify(columnas), JSON.stringify(filas), filas.length, usuario.email, usuario.nombre]
  );
  const id = String(res.rows[0].id);
  await logModificacion({
    area: 'BackOffice',
    entidad: archivo,
    usuario: usuario.email,
    campo: 'carga',
    valorNuevo: `#${id} · ${filas.length.toLocaleString('es-CO')} filas · ${columnas.length} columnas`,
  });
  return id;
}

// Solo admin o quien subió la carga la puede anular.
export async function anularCarga(id: string, usuario: { email: string; esAdmin: boolean }): Promise<void> {
  if (!/^\d+$/.test(id)) throw new Error('Carga inválida.');
  await ensureSchema();
  const res = await getPool().query(
    `UPDATE public.backoffice_cargas SET anulada = true
      WHERE id = $1 AND NOT anulada AND ($2 OR subido_por = $3)
      RETURNING archivo`,
    [id, usuario.esAdmin, usuario.email]
  );
  if (!res.rowCount) throw new Error('No se encontró la carga o no tienes permiso para anularla.');
  await logModificacion({
    area: 'BackOffice',
    entidad: String(res.rows[0].archivo),
    usuario: usuario.email,
    campo: 'anulación',
    valorAnterior: `#${id} activa`,
    valorNuevo: `#${id} anulada`,
  });
}
