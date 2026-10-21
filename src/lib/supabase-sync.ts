// Mismo propósito que automation/lib/supabase-sync.mjs — se duplica acá
// porque el botón "Actualizar ahora" corre en Vercel, no en el PC local.
// Sube a Supabase (public.services) los servicios leídos directo de
// bi_smart (lib/bi-db.ts). Ya no pasa por Google Sheets en ningún punto:
// PROYECTO/GESTOR/CARGO GESTOR/JEFATURA/TIPO ASIGNADOR ya no se guardan
// acá — se calculan en vivo en lib/sheets.ts cruzando contra BASE
// (base_proyecto / base_colaborador, también en Supabase).
import { Pool } from 'pg';
import { getColaboradorBaseRows, saveColaboradorBaseRow } from './base';

const COLS: Record<string, string> = {
  id: 'ID Servicio',
  estado: 'Estado',
  ciudad: 'Ciudad',
  direccion: 'Dirección de Origen',
  nombreTrabajador: 'Nombre Trabajador',
  identTrabajador: 'Ident. Trabajador',
  placa: 'Placa',
  razonCancelacion: 'Razon de Cancelacion',
  descCancelacion: 'Descripcion de Cancelacion',
  usuarioCancelacion: 'Usuario Cancelación',
  usuarioAsignacion: 'Usuario Asignación',
  diaSolicitud: 'DÍA SOLICITUD',
  anioSolicitud: 'AÑO SOLICITUD',
  mesNumSolicitud: 'MES # SOLICITUD',
  mesSolicitud: 'MES SOLICITUD',
  fechaSolicitud: 'FECHA SOLICITUD',
  horaServicio: 'HORA DE SERVICIO',
  fechaCreacion: 'FECHA CREACIÓN',
  horaCreacion: 'HORA DE CREACIÓN',
  servicio: 'Servicio',
  tipoServicio: 'Tipo de Servicio',
  valorDeclarado: 'Valor Declarado',
  precioTotal: 'Precio Total',
  ganancias: 'Ganancias',
  zona: 'Zona',
  email: 'Email',
  descripcion: 'Descripcion',
  diasAnticipadosCreacion: 'DÍAS ANTICIPADAS DE CREACIÓN',
  fechaHoraAsignado: 'Fecha Hora Asignado',
  horaAsignacion: 'HORA ASIGNACIÓN',
  minutosAsignacion: 'Minutos Tiempo Asignado',
};

const DB_COLUMNS = [
  'id', 'estado', 'ciudad', 'direccion',
  'nombre_trabajador', 'ident_trabajador', 'placa', 'razon_cancelacion',
  'desc_cancelacion', 'usuario_cancelacion', 'usuario_asignacion',
  'dia_solicitud', 'anio_solicitud', 'mes_num_solicitud', 'mes_solicitud',
  'fecha_solicitud', 'fecha_solicitud_date', 'hora_servicio', 'fecha_creacion',
  'hora_creacion', 'servicio', 'tipo_servicio', 'valor_declarado',
  'precio_total', 'ganancias', 'zona', 'email', 'descripcion',
  'dias_anticipados_creacion', 'fecha_hora_asignado',
  'hora_asignacion', 'minutos_asignacion',
] as const;

type DbRow = (string | number | null)[];

const get = (row: unknown[], i: number) => (i >= 0 && i < row.length ? row[i] : '');
const getStr = (row: unknown[], i: number) => String(get(row, i) || '').trim();
const getNum = (row: unknown[], i: number): number | null => {
  const n = Number(get(row, i));
  return Number.isFinite(n) && get(row, i) !== '' ? n : null;
};
function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDbRow(row: unknown[], idx: Record<string, number>): DbRow {
  const dia = getNum(row, idx.diaSolicitud);
  const mes = getNum(row, idx.mesNumSolicitud);
  const anio = getNum(row, idx.anioSolicitud);
  const fechaSolicitudDate = dia && mes && anio ? `${anio}-${pad2(mes)}-${pad2(dia)}` : null;

  return [
    getStr(row, idx.id),
    getStr(row, idx.estado) || null,
    getStr(row, idx.ciudad) || null,
    getStr(row, idx.direccion) || null,
    getStr(row, idx.nombreTrabajador) || null,
    getStr(row, idx.identTrabajador) || null,
    getStr(row, idx.placa) || null,
    getStr(row, idx.razonCancelacion) || null,
    getStr(row, idx.descCancelacion) || null,
    getStr(row, idx.usuarioCancelacion) || null,
    getStr(row, idx.usuarioAsignacion) || null,
    dia,
    anio,
    mes,
    getStr(row, idx.mesSolicitud) || null,
    getStr(row, idx.fechaSolicitud) || null,
    fechaSolicitudDate,
    getStr(row, idx.horaServicio) || null,
    getStr(row, idx.fechaCreacion) || null,
    getStr(row, idx.horaCreacion) || null,
    getStr(row, idx.servicio) || null,
    getStr(row, idx.tipoServicio) || null,
    getNum(row, idx.valorDeclarado),
    getNum(row, idx.precioTotal),
    getNum(row, idx.ganancias),
    getStr(row, idx.zona) || null,
    getStr(row, idx.email) || null,
    getStr(row, idx.descripcion) || null,
    getNum(row, idx.diasAnticipadosCreacion),
    getStr(row, idx.fechaHoraAsignado) || null,
    getStr(row, idx.horaAsignacion) || null,
    getNum(row, idx.minutosAsignacion),
  ];
}

// Registra en BASE a cualquier asignador/cancelador que todavía no esté
// ahí, con CARGO = AGILIZADOR NO ASIGNADO — mismo criterio que la
// automatización local (automation/lib/base.mjs), para que siempre haya un
// responsable identificable sin importar qué camino de sincronización se
// usó (automatización en el PC vs. este botón "Actualizar ahora").
const AGILIZADOR_NO_ASIGNADO = 'AGILIZADOR NO ASIGNADO';

function parseIdNombre(idNombre: string): { ext: string; nombre: string } {
  const s = idNombre.trim();
  const dash = s.indexOf('-');
  if (dash < 0) return { ext: '', nombre: s };
  return { ext: s.slice(0, dash).trim(), nombre: s.slice(dash + 1).trim() };
}

async function ensureColaboradoresRegistered(idNombreValues: string[]): Promise<void> {
  const vistos = [...new Set(idNombreValues.map((v) => v.trim()).filter(Boolean))];
  if (!vistos.length) return;

  const existing = await getColaboradorBaseRows();
  const existingSet = new Set(existing.map((r) => r.colaboradorData.toLowerCase()));
  const nuevos = vistos.filter((v) => !existingSet.has(v.toLowerCase()));
  if (!nuevos.length) return;

  for (const idNombre of nuevos) {
    const { ext, nombre } = parseIdNombre(idNombre);
    const colaborador = nombre.toUpperCase();
    await saveColaboradorBaseRow(
      { colaboradorData: idNombre, cargo: AGILIZADOR_NO_ASIGNADO, ext, colaborador },
      'Automatización'
    );
  }
}

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

const BATCH_SIZE = 300;

async function upsertBatch(rows: DbRow[]) {
  if (!rows.length) return;
  const cols = DB_COLUMNS;
  const valuesSql: string[] = [];
  const params: (string | number | null)[] = [];
  rows.forEach((row, rIdx) => {
    const placeholders = cols.map((_, cIdx) => `$${rIdx * cols.length + cIdx + 1}`);
    valuesSql.push(`(${placeholders.join(', ')})`);
    params.push(...row);
  });

  const updateSet = cols
    .filter((c) => c !== 'id')
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');

  const sql = `
    INSERT INTO public.services (${cols.join(', ')})
    VALUES ${valuesSql.join(', ')}
    ON CONFLICT (id) DO UPDATE SET ${updateSet}, updated_at = now();
  `;
  await getPool().query(sql, params);
}

// Punto de entrada: csvRows ya viene de bi_smart (lib/bi-db.ts), formato
// [headers, ...filas]. Sube TODAS las filas del lote (upsert idempotente,
// sin diffing) y registra en BASE cualquier asignador/cancelador nuevo.
export async function upsertCsvRowsToSupabase(csvRows: string[][]): Promise<number> {
  if (!csvRows || csvRows.length < 2) return 0;
  const headers = csvRows[0];
  const idx: Record<string, number> = {};
  for (const [key, header] of Object.entries(COLS)) {
    idx[key] = headers.indexOf(header);
  }
  if (idx.id < 0) throw new Error('No se encontró la columna "ID Servicio" en los datos de bi_smart.');

  const dataRows = csvRows.slice(1).filter((row) => get(row, idx.id));

  const vistos: string[] = [];
  for (const row of dataRows) {
    const asig = getStr(row, idx.usuarioAsignacion);
    const cancel = getStr(row, idx.usuarioCancelacion);
    if (asig) vistos.push(asig);
    if (cancel) vistos.push(cancel);
  }
  if (vistos.length) {
    try {
      await ensureColaboradoresRegistered(vistos);
    } catch (error) {
      console.log(`Aviso: no se pudo registrar automáticamente en BASE (${(error as Error).message}).`);
    }
  }

  const rows = dataRows.map((row) => toDbRow(row, idx));
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await upsertBatch(rows.slice(i, i + BATCH_SIZE));
  }
  return rows.length;
}
