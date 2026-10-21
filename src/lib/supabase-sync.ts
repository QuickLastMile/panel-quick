// Mismo propósito que automation/lib/supabase-sync.mjs — se duplica acá
// porque el botón "Actualizar ahora" corre en Vercel, no en el PC local.
// Sube a Supabase (public.services) los servicios leídos directo de
// bi_smart (lib/bi-db.ts). Ya no pasa por Google Sheets en ningún punto:
// PROYECTO/GESTOR/CARGO GESTOR/JEFATURA/TIPO ASIGNADOR ya no se guardan
// acá — se calculan en vivo en lib/sheets.ts cruzando contra BASE
// (base_proyecto / base_colaborador, también en Supabase).
import { Pool } from 'pg';
import { getColaboradorBaseRows, saveColaboradorBaseRow } from './base';

// OJO: estos son los nombres de columna REALES de bi_smart (lib/bi-db.ts),
// no los nombres "estilo Sheet" que tenía la hoja Datos_Actuales. DÍA/MES/
// AÑO SOLICITUD, MES SOLICITUD, HORA DE SERVICIO/CREACIÓN/ASIGNACIÓN y DÍAS
// ANTICIPADOS DE CREACIÓN eran columnas CALCULADAS por fórmulas del Sheet a
// partir de Fecha de solicitud/Fecha de creación/Fecha Hora Asignado — no
// existen como columnas crudas en bi_smart. Se derivan acá (ver toDbRow).
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
  fechaSolicitudRaw: 'Fecha de solicitud',
  fechaCreacionRaw: 'Fecha de creación',
  servicio: 'Servicio',
  tipoServicio: 'Tipo de Servicio',
  valorDeclarado: 'Valor Declarado',
  precioTotal: 'Precio Total',
  ganancias: 'Ganancias',
  zona: 'Zona',
  email: 'Email',
  descripcion: 'Descripcion',
  fechaHoraAsignado: 'Fecha Hora Asignado',
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

type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

// bi-db.ts formatea los timestamps de bi_smart como texto plano
// "AAAA-MM-DD HH:MM:SS" (ya en hora de Bogotá) — se parsea directo del
// texto en vez de pasar por Date() para no arrastrar ningún lío de huso
// horario adicional.
function parseDateTimeStr(s: string): DateParts | null {
  const str = (s || '').trim();
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  const [y, m, d] = (datePart || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  let hour = 0, minute = 0, second = 0;
  if (timePart) {
    const [h2, m2, s2] = timePart.split(':').map(Number);
    hour = h2 || 0;
    minute = m2 || 0;
    second = s2 || 0;
  }
  return { year: y, month: m, day: d, hour, minute, second };
}

const MES_ABREV = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEPT', 'OCT', 'NOV', 'DIC'];

function formatFechaDMA(p: DateParts | null): string | null {
  return p ? `${p.day}/${p.month}/${p.year}` : null;
}
function formatHora(p: DateParts | null): string {
  return p ? `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}` : '00:00:00';
}
function daysBetweenYMD(a: DateParts, b: DateParts): number {
  const da = Date.UTC(a.year, a.month - 1, a.day);
  const db = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((db - da) / 86400000);
}

function toDbRow(row: unknown[], idx: Record<string, number>): DbRow {
  const pSolicitud = parseDateTimeStr(getStr(row, idx.fechaSolicitudRaw));
  const pCreacion = parseDateTimeStr(getStr(row, idx.fechaCreacionRaw));
  const pAsignado = parseDateTimeStr(getStr(row, idx.fechaHoraAsignado));

  const dia = pSolicitud?.day ?? null;
  const mes = pSolicitud?.month ?? null;
  const anio = pSolicitud?.year ?? null;
  const fechaSolicitudDate = pSolicitud ? `${anio}-${pad2(mes!)}-${pad2(dia!)}` : null;
  const diasAnticipadosCreacion = pSolicitud && pCreacion ? daysBetweenYMD(pCreacion, pSolicitud) : null;

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
    pSolicitud ? MES_ABREV[pSolicitud.month - 1] : null,
    formatFechaDMA(pSolicitud),
    fechaSolicitudDate,
    formatHora(pSolicitud),
    formatFechaDMA(pCreacion),
    formatHora(pCreacion),
    getStr(row, idx.servicio) || null,
    getStr(row, idx.tipoServicio) || null,
    getNum(row, idx.valorDeclarado),
    getNum(row, idx.precioTotal),
    getNum(row, idx.ganancias),
    getStr(row, idx.zona) || null,
    getStr(row, idx.email) || null,
    getStr(row, idx.descripcion) || null,
    diasAnticipadosCreacion,
    getStr(row, idx.fechaHoraAsignado) || null,
    formatHora(pAsignado),
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
