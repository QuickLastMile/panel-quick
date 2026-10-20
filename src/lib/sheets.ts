import { Pool } from 'pg';
import { getColaboradorBaseRows } from './base';

export type ServiceRow = {
  id: string;
  proyecto: string;
  gestor: string;
  cargoGestor: string;
  estado: string;
  ciudad: string;
  direccion: string;
  nombreTrabajador: string;
  identTrabajador: string;
  placa: string;
  razonCancelacion: string;
  descCancelacion: string;
  // Quién canceló el servicio (usuario de Quick) — vacío si no se canceló.
  usuarioCancelacion: string;
  // Igual que tipoAsignador, pero para quien canceló — AGILIZADOR /
  // SUPERVISOR / ADMINISTRATIVO / etc. según BASE, "AGILIZADOR NO
  // ASIGNADO" si no está en BASE, o vacío si nunca se canceló. No viene
  // del Sheet (no hay columna para esto ahí) — se calcula acá cruzando
  // contra BASE, igual que hace la fórmula del Sheet para tipoAsignador.
  tipoCancelacion: string;
  // Igual que nombreAsignador, pero para quien canceló.
  nombreCancelador: string;
  // "ID-Nombre" de quién asignó el servicio — es la clave con la que la
  // hoja BASE resuelve GESTOR/CARGO GESTOR/TIPO ASIGNADOR.
  usuarioAsignacion: string;
  // Nombre real de quien asignó, tal cual aparece en la data ("ID-Nombre"
  // sin el ID) — a diferencia de `gestor`, nunca se reemplaza por "AGILIZADOR
  // NO ASIGNADO": si no está en BASE, igual se quiere ver quién fue.
  nombreAsignador: string;
  diaSolicitud: number | null;
  anioSolicitud: number | null;
  mesNumSolicitud: number | null;
  mesSolicitud: string;
  fechaSolicitud: string;
  horaServicio: string;
  fechaCreacion: string;
  horaCreacion: string;
  jefatura: string;
  servicio: string;
  tipoServicio: string;
  valorDeclarado: number | null;
  precioTotal: number | null;
  ganancias: number | null;
  zona: string;
  email: string;
  descripcion: string;
  diasAnticipadosCreacion: number | null;
  // "AAAA-MM-DD HH:MM:SS" — momento real en que el servicio pasó a
  // Asignado (vacío si nunca se asignó, ej. se canceló antes).
  fechaHoraAsignado: string;
  // AGILIZADOR / COORDINADOR / OTRO — quién hizo la asignación: el propio
  // gestor, alguien administrativo, u otro (externo o sin asignar).
  tipoAsignador: string;
  // Solo la hora (HH:MM:SS) de `fechaHoraAsignado` — "00:00:00" cuando el
  // servicio nunca se asignó (usar junto con fechaHoraAsignado para
  // distinguir ese caso de una asignación real a medianoche).
  horaAsignacion: string;
  // Minutos entre FECHA/HORA CREACIÓN y Fecha Hora Asignado — ya calculado
  // por Quick en el Sheet. Null si el servicio nunca se asignó.
  minutosAsignacion: number | null;
};

export type SheetsSnapshot = {
  rows: ServiceRow[];
  // Momento real del dato más reciente sincronizado por la automatización
  // (max(updated_at) en la tabla) — distinta de "cuándo se renderizó esta
  // página". Null si la tabla está vacía.
  lastSyncedAt: string | null;
};

// Supavisor en modo transacción (puerto 6543): recomendado por Vercel para
// funciones serverless — muchas conexiones cortas en vez de una sesión
// larga. Un solo Pool a nivel de módulo se reutiliza entre invocaciones
// mientras la instancia de Vercel siga caliente.
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

// "455892-Miguel Angel Pirateque Lozano" -> "Miguel Angel Pirateque Lozano".
// Siempre el nombre real tal cual viene en la data, sin pasar por BASE —
// para no perder de vista quién hizo algo solo porque no está clasificado.
function nombreDesdeIdNombre(idNombre: string): string {
  const s = idNombre.trim();
  const dash = s.indexOf('-');
  return (dash >= 0 ? s.slice(dash + 1) : s).trim();
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

async function fetchSnapshotUncached(): Promise<SheetsSnapshot> {
  const db = getPool();

  const [dataRes, syncRes, colaboradorRows] = await Promise.all([
    db.query(
      `SELECT id, proyecto, gestor, cargo_gestor, estado, ciudad, direccion,
              nombre_trabajador, ident_trabajador, placa, razon_cancelacion,
              desc_cancelacion, usuario_cancelacion, usuario_asignacion,
              dia_solicitud, anio_solicitud, mes_num_solicitud, mes_solicitud,
              fecha_solicitud, hora_servicio, fecha_creacion, hora_creacion,
              jefatura, servicio, tipo_servicio, valor_declarado, precio_total,
              ganancias, zona, email, descripcion, dias_anticipados_creacion,
              fecha_hora_asignado, tipo_asignador, hora_asignacion, minutos_asignacion
       FROM public.services`
    ),
    db.query(`SELECT max(updated_at) AS last FROM public.services`),
    getColaboradorBaseRows(),
  ]);

  const lastSyncedAt = syncRes.rows[0]?.last ? new Date(syncRes.rows[0].last).toISOString() : null;

  // Mismo cruce que hace la fórmula de TIPO ASIGNADOR en el Sheet, pero
  // aplicado a quien CANCELÓ (no hay columna para eso en Datos_Actuales).
  const tipoPorColaborador = new Map(colaboradorRows.map((c) => [c.colaboradorData, c.tipo]));
  const tipoCancelacionFor = (usuarioCancelacion: string): string => {
    if (!usuarioCancelacion) return '';
    return tipoPorColaborador.get(usuarioCancelacion) || 'AGILIZADOR NO ASIGNADO';
  };

  const rows: ServiceRow[] = dataRes.rows
    .map((r) => ({
      id: toStr(r.id),
      proyecto: toStr(r.proyecto) || 'SIN PROYECTO',
      gestor: toStr(r.gestor) || 'SIN GESTOR',
      cargoGestor: toStr(r.cargo_gestor),
      estado: toStr(r.estado) || 'Sin estado',
      ciudad: toStr(r.ciudad) || 'SIN CIUDAD',
      direccion: toStr(r.direccion),
      nombreTrabajador: toStr(r.nombre_trabajador).trim(),
      identTrabajador: toStr(r.ident_trabajador).trim(),
      placa: toStr(r.placa).trim(),
      razonCancelacion: toStr(r.razon_cancelacion),
      descCancelacion: toStr(r.desc_cancelacion),
      usuarioCancelacion: toStr(r.usuario_cancelacion),
      tipoCancelacion: tipoCancelacionFor(toStr(r.usuario_cancelacion)),
      nombreCancelador: nombreDesdeIdNombre(toStr(r.usuario_cancelacion)),
      usuarioAsignacion: toStr(r.usuario_asignacion),
      nombreAsignador: nombreDesdeIdNombre(toStr(r.usuario_asignacion)),
      diaSolicitud: toNum(r.dia_solicitud),
      anioSolicitud: toNum(r.anio_solicitud),
      mesNumSolicitud: toNum(r.mes_num_solicitud),
      mesSolicitud: toStr(r.mes_solicitud),
      fechaSolicitud: toStr(r.fecha_solicitud),
      horaServicio: toStr(r.hora_servicio),
      fechaCreacion: toStr(r.fecha_creacion),
      horaCreacion: toStr(r.hora_creacion),
      jefatura: toStr(r.jefatura).trim(),
      servicio: toStr(r.servicio),
      tipoServicio: toStr(r.tipo_servicio),
      valorDeclarado: toNum(r.valor_declarado),
      precioTotal: toNum(r.precio_total),
      ganancias: toNum(r.ganancias),
      zona: toStr(r.zona),
      email: toStr(r.email),
      descripcion: toStr(r.descripcion),
      diasAnticipadosCreacion: toNum(r.dias_anticipados_creacion),
      fechaHoraAsignado: toStr(r.fecha_hora_asignado),
      tipoAsignador: toStr(r.tipo_asignador),
      horaAsignacion: toStr(r.hora_asignacion),
      minutosAsignacion: toNum(r.minutos_asignacion),
    }))
    .filter((r) => r.id);

  return { rows, lastSyncedAt };
}

// Se refresca sola cada 90s: cualquiera que abra el panel ve datos frescos
// sin necesidad de un botón de "actualizar", y sin golpear la base en cada
// carga de página.
let cached: { data: SheetsSnapshot; expiresAt: number } | null = null;
const CACHE_TTL_MS = 90_000;

export async function getSheetsSnapshot(): Promise<SheetsSnapshot> {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await fetchSnapshotUncached();
  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
