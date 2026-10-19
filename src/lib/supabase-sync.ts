// Mismo propósito que automation/lib/supabase-sync.mjs — se duplica acá
// porque el botón "Actualizar ahora" corre en Vercel, no en el PC local.
// Mantiene public.services (Supabase) al día con los servicios que
// cambiaron en el Sheet en esta corrida (ya con PROYECTO/GESTOR/etc.
// resueltos por las fórmulas del Sheet).
import { google } from 'googleapis';
import { Pool } from 'pg';

const SHEET_RANGE = 'Datos_Actuales!A:DZ';

const COLS: Record<string, string> = {
  id: 'ID Servicio',
  proyecto: 'PROYECTO',
  gestor: 'GESTOR',
  cargoGestor: 'CARGO GESTOR',
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
  jefatura: 'JEFATURA',
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
  tipoAsignador: 'TIPO ASIGNADOR',
  horaAsignacion: 'HORA ASIGNACIÓN',
  minutosAsignacion: 'Minutos Tiempo Asignado',
};

const DB_COLUMNS = [
  'id', 'proyecto', 'gestor', 'cargo_gestor', 'estado', 'ciudad', 'direccion',
  'nombre_trabajador', 'ident_trabajador', 'placa', 'razon_cancelacion',
  'desc_cancelacion', 'usuario_cancelacion', 'usuario_asignacion',
  'dia_solicitud', 'anio_solicitud', 'mes_num_solicitud', 'mes_solicitud',
  'fecha_solicitud', 'fecha_solicitud_date', 'hora_servicio', 'fecha_creacion',
  'hora_creacion', 'jefatura', 'servicio', 'tipo_servicio', 'valor_declarado',
  'precio_total', 'ganancias', 'zona', 'email', 'descripcion',
  'dias_anticipados_creacion', 'fecha_hora_asignado', 'tipo_asignador',
  'hora_asignacion', 'minutos_asignacion',
] as const;

type DbRow = (string | number | null)[];

function getReadAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON en las variables de entorno.');
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

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
    getStr(row, idx.proyecto) || null,
    getStr(row, idx.gestor) || null,
    getStr(row, idx.cargoGestor) || null,
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
    getStr(row, idx.jefatura) || null,
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
    getStr(row, idx.tipoAsignador) || null,
    getStr(row, idx.horaAsignacion) || null,
    getNum(row, idx.minutosAsignacion),
  ];
}

export async function fetchSheetRowsByIds(ids: string[]): Promise<DbRow[]> {
  if (!ids.length) return [];
  const wanted = new Set(ids.map(String));

  const spreadsheetId = process.env.MONITOREO_SHEET_ID;
  if (!spreadsheetId) throw new Error('Falta MONITOREO_SHEET_ID en las variables de entorno.');

  const sheets = google.sheets({ version: 'v4', auth: getReadAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGE,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });
  const values = res.data.values || [];
  if (values.length < 2) return [];

  const headers = values[0];
  const idx: Record<string, number> = {};
  for (const [key, header] of Object.entries(COLS)) {
    idx[key] = headers.indexOf(header);
  }

  return values
    .slice(1)
    .filter((row) => wanted.has(String(row[idx.id])))
    .map((row) => toDbRow(row, idx));
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

export async function syncIdsToSupabase(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const rows = await fetchSheetRowsByIds(ids);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await upsertBatch(rows.slice(i, i + BATCH_SIZE));
  }
  return rows.length;
}
