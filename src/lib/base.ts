import { Pool } from 'pg';
import { logModificacion } from './modificaciones';

// BASE es la tabla de referencia que resuelve PROYECTO/JEFATURA/GESTOR/
// CARGO GESTOR/TIPO ASIGNADOR — antes vivía en una hoja de Google Sheets
// con fórmulas VLOOKUP; ahora son dos tablas de Supabase (sin Sheets de
// por medio en ningún punto):
//   base_proyecto    — Email del solicitante -> Proyecto / Jefatura
//   base_colaborador — "ID-Nombre" de quién asignó -> Cargo / Colaborador
export type ProyectoBaseRow = {
  email: string;
  nombre: string;
  proceso: string;
  jefatura: string;
};

export type ColaboradorBaseRow = {
  // "ID-Nombre" tal como aparece en "Usuario Asignación" — es la clave.
  colaboradorData: string;
  cargo: string;
  ext: string;
  colaborador: string;
  // CARGO es el único campo de clasificación (ver saveColaboradorBaseRow) —
  // se expone también como "tipo" porque el resto del código (TIPO
  // ASIGNADOR/TIPO CANCELACIÓN) ya cruza por ese nombre.
  tipo: string;
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

export async function getProyectoBaseRows(): Promise<ProyectoBaseRow[]> {
  const res = await getPool().query(
    `select email, nombre, proceso, jefatura from public.base_proyecto order by email`
  );
  return res.rows.map((r) => ({
    email: String(r.email || ''),
    nombre: String(r.nombre || ''),
    proceso: String(r.proceso || ''),
    jefatura: String(r.jefatura || ''),
  }));
}

export async function getColaboradorBaseRows(): Promise<ColaboradorBaseRow[]> {
  const res = await getPool().query(
    `select colaborador_data, cargo, ext, colaborador from public.base_colaborador order by colaborador_data`
  );
  return res.rows.map((r) => ({
    colaboradorData: String(r.colaborador_data || ''),
    cargo: String(r.cargo || ''),
    ext: String(r.ext || ''),
    colaborador: String(r.colaborador || ''),
    tipo: String(r.cargo || ''),
  }));
}

export async function saveProyectoBaseRow(
  row: {
    // Email original antes de este guardado — permite "renombrar" el
    // email (la llave) de una fila existente. Vacío/ausente = fila nueva.
    originalEmail?: string;
    email: string;
    nombre: string;
    proceso: string;
    jefatura: string;
  },
  usuario: string
): Promise<void> {
  const email = row.email.trim();
  if (!email) throw new Error('El email es obligatorio.');
  const nombre = row.nombre.trim();
  const proceso = row.proceso.trim();
  const jefatura = row.jefatura.trim();
  const originalEmail = row.originalEmail?.trim();

  const pool = getPool();

  if (originalEmail) {
    const before = (await pool.query(`select nombre, proceso, jefatura from public.base_proyecto where email = $1`, [originalEmail])).rows[0];
    await pool.query(
      `update public.base_proyecto set email = $1, nombre = $2, proceso = $3, jefatura = $4 where email = $5`,
      [email, nombre, proceso, jefatura, originalEmail]
    );
    const campos: [string, string, string][] = [
      ['Nombre', before?.nombre || '', nombre],
      ['Proyecto', before?.proceso || '', proceso],
      ['Jefatura', before?.jefatura || '', jefatura],
    ];
    for (const [campo, antes, despues] of campos) {
      if (antes !== despues) {
        await logModificacion({ area: 'BASE (Proyecto/Jefatura)', entidad: email, usuario, campo, valorAnterior: antes, valorNuevo: despues });
      }
    }
    return;
  }

  await pool.query(
    `insert into public.base_proyecto (email, nombre, proceso, jefatura) values ($1,$2,$3,$4)
     on conflict (email) do update set nombre = excluded.nombre, proceso = excluded.proceso, jefatura = excluded.jefatura`,
    [email, nombre, proceso, jefatura]
  );
  await logModificacion({ area: 'BASE (Proyecto/Jefatura)', entidad: email, usuario, campo: 'creación', valorNuevo: `${nombre} · ${proceso} · ${jefatura}` });
}

export async function saveColaboradorBaseRow(
  row: {
    // "ID-Nombre" original antes de este guardado — permite editar la
    // llave de una fila existente. Vacío/ausente = fila nueva.
    originalColaboradorData?: string;
    colaboradorData: string;
    cargo: string;
    ext: string;
    colaborador: string;
  },
  usuario: string
): Promise<void> {
  const colaboradorData = row.colaboradorData.trim();
  if (!colaboradorData) throw new Error('El dato de colaborador ("ID-Nombre") es obligatorio.');
  const cargo = row.cargo.trim();
  const ext = row.ext.trim();
  const colaborador = row.colaborador.trim();
  const originalColaboradorData = row.originalColaboradorData?.trim();

  const pool = getPool();

  if (originalColaboradorData) {
    const before = (
      await pool.query(`select cargo, ext, colaborador from public.base_colaborador where colaborador_data = $1`, [originalColaboradorData])
    ).rows[0];
    await pool.query(
      `update public.base_colaborador set colaborador_data = $1, cargo = $2, ext = $3, colaborador = $4 where colaborador_data = $5`,
      [colaboradorData, cargo, ext, colaborador, originalColaboradorData]
    );
    const campos: [string, string, string][] = [
      ['Cargo', before?.cargo || '', cargo],
      ['Extensión', before?.ext || '', ext],
      ['Nombre del colaborador', before?.colaborador || '', colaborador],
    ];
    for (const [campo, antes, despues] of campos) {
      if (antes !== despues) {
        await logModificacion({ area: 'BASE (Gestor/Cargo)', entidad: colaboradorData, usuario, campo, valorAnterior: antes, valorNuevo: despues });
      }
    }
    return;
  }

  await pool.query(
    `insert into public.base_colaborador (colaborador_data, cargo, ext, colaborador) values ($1,$2,$3,$4)
     on conflict (colaborador_data) do update set cargo = excluded.cargo, ext = excluded.ext, colaborador = excluded.colaborador`,
    [colaboradorData, cargo, ext, colaborador]
  );
  await logModificacion({ area: 'BASE (Gestor/Cargo)', entidad: colaboradorData, usuario, campo: 'creación', valorNuevo: `${colaborador} · ${cargo}` });
}
