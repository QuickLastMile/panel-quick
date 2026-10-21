import { Pool } from 'pg';
import { getColaboradorBaseRows, getProyectoBaseRows } from './base';

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
  // ASIGNADO" si no está en BASE, o vacío si nunca se canceló.
  tipoCancelacion: string;
  // Igual que nombreAsignador, pero para quien canceló.
  nombreCancelador: string;
  // "ID-Nombre" de quién asignó el servicio — es la clave con la que BASE
  // resuelve GESTOR/CARGO GESTOR/TIPO ASIGNADOR.
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
  // Derivado de tipoServicio — bi_smart no trae un campo de vehículo propio
  // (ver tipoVehiculoFor). "Domicilio"/"Mensajería" -> Motorizado, "Carry"
  // -> Carry; cualquier otro tipo de servicio se deja tal cual (no se
  // adivina un vehículo para categorías que no son de última milla).
  tipoVehiculo: string;
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
  // AGILIZADOR / SUPERVISOR / ADMINISTRATIVO / AGILIZADOR NO ASIGNADO /
  // DESCARTAR (sin asignador) — quién hizo la asignación, según BASE.
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
    // public.services ya pasa de 118k filas y esta consulta las trae TODAS
    // sin filtro de fecha (así puede funcionar "Buscar en todo el
    // histórico") — eso tarda ~25-30s y antes se cortaba con el timeout de
    // 30s. Subido a 55s mientras se decide si vale la pena filtrar por
    // ventana de fechas (ver conversación: no se tocó porque varias
    // páginas sí dependen de ver histórico completo).
    query_timeout: 55000,
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

const normKey = (v: string): string => v.trim().toLowerCase();

// bi_smart no tiene un campo de vehículo por servicio — se deriva de
// "Tipo de Servicio" (confirmado con la usuaria): Domicilio/Mensajería son
// motorizado, Carry es Carry. Variantes tipo "Domicilio Cross"/"Carry Cross"
// cuentan igual (coincidencia por substring). Lo demás (Carga Nacional, LTL,
// PQ Nacional, etc.) no es de última milla — se deja el texto original en
// vez de adivinar un vehículo.
function tipoVehiculoFor(tipoServicio: string): string {
  const s = tipoServicio.trim().toLowerCase();
  if (!s) return '';
  if (s.includes('domicilio') || s.includes('mensajer')) return 'Motorizado';
  if (s.includes('carry')) return 'Carry';
  return tipoServicio.trim();
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

async function fetchSnapshotUncached(): Promise<SheetsSnapshot> {
  const db = getPool();

  const [dataRes, syncRes, colaboradorRows, proyectoRows] = await Promise.all([
    db.query(
      `SELECT id, estado, ciudad, direccion,
              nombre_trabajador, ident_trabajador, placa, razon_cancelacion,
              desc_cancelacion, usuario_cancelacion, usuario_asignacion,
              dia_solicitud, anio_solicitud, mes_num_solicitud, mes_solicitud,
              fecha_solicitud, hora_servicio, fecha_creacion, hora_creacion,
              servicio, tipo_servicio, valor_declarado, precio_total,
              ganancias, zona, email, descripcion, dias_anticipados_creacion,
              fecha_hora_asignado, hora_asignacion, minutos_asignacion
       FROM public.services`
    ),
    db.query(`SELECT max(updated_at) AS last FROM public.services`),
    getColaboradorBaseRows(),
    getProyectoBaseRows(),
  ]);

  const lastSyncedAt = syncRes.rows[0]?.last ? new Date(syncRes.rows[0].last).toISOString() : null;

  // PROYECTO/JEFATURA/GESTOR/CARGO GESTOR/TIPO ASIGNADOR ya no vienen de
  // fórmulas de Sheets (VLOOKUP contra la hoja BASE) — se resuelven acá,
  // en código, cruzando contra BASE (ahora en Supabase: base_proyecto /
  // base_colaborador). Case-insensitive porque VLOOKUP en Sheets también
  // lo era, y los mismos usuarios aparecen con mayúsculas distintas entre
  // filas en el origen (bi_smart).
  const colaboradorPorClave = new Map(colaboradorRows.map((c) => [normKey(c.colaboradorData), c]));
  const proyectoPorEmail = new Map(proyectoRows.map((p) => [normKey(p.email), p]));

  const tipoCancelacionFor = (usuarioCancelacion: string): string => {
    if (!usuarioCancelacion.trim()) return '';
    const c = colaboradorPorClave.get(normKey(usuarioCancelacion));
    return c?.cargo || 'AGILIZADOR NO ASIGNADO';
  };
  // Los usuarios ADMINISTRATIVO son cuentas compartidas — varias personas
  // del área administrativa asignan servicios desde la misma cuenta, así
  // que mostrar el nombre individual de BASE da una falsa sensación de que
  // fue una sola persona. Se agrupan todos bajo "LÍNEA DE GESTIÓN".
  const gestorFor = (usuarioAsignacion: string): string => {
    const c = colaboradorPorClave.get(normKey(usuarioAsignacion));
    if (!c) return 'AGILIZADOR NO ASIGNADO';
    if (c.cargo.trim().toUpperCase() === 'ADMINISTRATIVO') return 'LÍNEA DE GESTIÓN';
    return c.colaborador.toUpperCase();
  };
  const cargoGestorFor = (usuarioAsignacion: string): string => {
    const c = colaboradorPorClave.get(normKey(usuarioAsignacion));
    return c ? `${c.cargo} ${c.ext}`.trim() : '';
  };
  const tipoAsignadorFor = (usuarioAsignacion: string): string => {
    if (!usuarioAsignacion.trim()) return 'DESCARTAR';
    const c = colaboradorPorClave.get(normKey(usuarioAsignacion));
    return c?.cargo || 'AGILIZADOR NO ASIGNADO';
  };
  const proyectoFor = (email: string): string => proyectoPorEmail.get(normKey(email))?.proceso || 'OTRO';
  const jefaturaFor = (email: string): string => proyectoPorEmail.get(normKey(email))?.jefatura || 'nn';

  const rows: ServiceRow[] = dataRes.rows
    .map((r) => {
      const usuarioAsignacion = toStr(r.usuario_asignacion);
      const usuarioCancelacion = toStr(r.usuario_cancelacion);
      const email = toStr(r.email);
      return {
        id: toStr(r.id),
        proyecto: proyectoFor(email) || 'SIN PROYECTO',
        gestor: gestorFor(usuarioAsignacion) || 'SIN GESTOR',
        cargoGestor: cargoGestorFor(usuarioAsignacion),
        estado: toStr(r.estado) || 'Sin estado',
        ciudad: toStr(r.ciudad) || 'SIN CIUDAD',
        direccion: toStr(r.direccion),
        nombreTrabajador: toStr(r.nombre_trabajador).trim(),
        identTrabajador: toStr(r.ident_trabajador).trim(),
        placa: toStr(r.placa).trim(),
        razonCancelacion: toStr(r.razon_cancelacion),
        descCancelacion: toStr(r.desc_cancelacion),
        usuarioCancelacion,
        tipoCancelacion: tipoCancelacionFor(usuarioCancelacion),
        nombreCancelador: nombreDesdeIdNombre(usuarioCancelacion),
        usuarioAsignacion,
        nombreAsignador: nombreDesdeIdNombre(usuarioAsignacion),
        diaSolicitud: toNum(r.dia_solicitud),
        anioSolicitud: toNum(r.anio_solicitud),
        mesNumSolicitud: toNum(r.mes_num_solicitud),
        mesSolicitud: toStr(r.mes_solicitud),
        fechaSolicitud: toStr(r.fecha_solicitud),
        horaServicio: toStr(r.hora_servicio),
        fechaCreacion: toStr(r.fecha_creacion),
        horaCreacion: toStr(r.hora_creacion),
        jefatura: jefaturaFor(email),
        servicio: toStr(r.servicio),
        tipoServicio: toStr(r.tipo_servicio),
        tipoVehiculo: tipoVehiculoFor(toStr(r.tipo_servicio)),
        valorDeclarado: toNum(r.valor_declarado),
        precioTotal: toNum(r.precio_total),
        ganancias: toNum(r.ganancias),
        zona: toStr(r.zona),
        email,
        descripcion: toStr(r.descripcion),
        diasAnticipadosCreacion: toNum(r.dias_anticipados_creacion),
        fechaHoraAsignado: toStr(r.fecha_hora_asignado),
        tipoAsignador: tipoAsignadorFor(usuarioAsignacion),
        horaAsignacion: toStr(r.hora_asignacion),
        minutosAsignacion: toNum(r.minutos_asignacion),
      };
    })
    .filter((r) => r.id);

  return { rows, lastSyncedAt };
}

// Esta consulta trae ~118k filas y tarda 25-30s (ver sheets.ts más arriba)
// — con un caché corto, casi cualquier navegación entre páginas vuelve a
// pagar ese costo. Los datos de origen no cambian más seguido que cada
// ~10 min (ciclo de la automatización), así que 8 min de caché no sirve
// nada obsoleto que no lo fuera igual con 90s, pero sí evita repetir la
// consulta lenta en cada clic — vive por instancia de función (Vercel
// puede reusar una instancia "caliente" entre pedidos cercanos).
let cached: { data: SheetsSnapshot; expiresAt: number } | null = null;
const CACHE_TTL_MS = 8 * 60_000;

export async function getSheetsSnapshot(): Promise<SheetsSnapshot> {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await fetchSnapshotUncached();
  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
