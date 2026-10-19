import { Pool } from 'pg';

// Historial unificado de cambios manuales hechos DESDE el panel — BASE
// (proyecto/colaborador), Usuarios, y Vinculación (colaboradores, que ya
// tenía su propia tabla por colaborador). Reemplaza el viejo "historial de
// automatización" (corridas de GitHub Actions), que ya no se muestra.
export type ModificacionEntry = {
  id: string;
  area: string;
  entidad: string;
  usuario: string;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  creadoEn: string;
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

export async function logModificacion(entry: {
  area: string;
  entidad: string;
  usuario: string;
  campo: string;
  valorAnterior?: string | null;
  valorNuevo: string;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO public.modificaciones_historial (area, entidad, usuario, campo, valor_anterior, valor_nuevo)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [entry.area, entry.entidad, entry.usuario, entry.campo, entry.valorAnterior || '', entry.valorNuevo]
  );
}

const toStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

export async function getModificacionesHistorial(limit = 300): Promise<ModificacionEntry[]> {
  const res = await getPool().query(
    `
    SELECT * FROM (
      SELECT
        'mh-' || m.id AS id,
        m.area,
        m.entidad,
        coalesce(m.usuario, '') AS usuario,
        m.campo,
        coalesce(m.valor_anterior, '') AS valor_anterior,
        m.valor_nuevo,
        m.creado_en
      FROM public.modificaciones_historial m
      UNION ALL
      SELECT
        'ch-' || h.id AS id,
        'Vinculación' AS area,
        coalesce(c.nombre_completo, 'Colaborador #' || h.colaborador_id) AS entidad,
        coalesce(h.usuario, '') AS usuario,
        h.campo,
        coalesce(h.valor_anterior, '') AS valor_anterior,
        h.valor_nuevo,
        h.creado_en
      FROM public.colaboradores_historial h
      LEFT JOIN public.colaboradores c ON c.id = h.colaborador_id
    ) combinado
    ORDER BY creado_en DESC
    LIMIT $1
    `,
    [limit]
  );
  return res.rows.map((r) => ({
    id: toStr(r.id),
    area: toStr(r.area),
    entidad: toStr(r.entidad),
    usuario: toStr(r.usuario),
    campo: toStr(r.campo),
    valorAnterior: toStr(r.valor_anterior),
    valorNuevo: toStr(r.valor_nuevo),
    creadoEn: toStr(r.creado_en),
  }));
}
