import { Pool } from 'pg';

export { TIPOS_IDENTIFICACION, TIPOS_VEHICULO, MEDIOS_VINCULACION, CIUDADES_COLOMBIA } from './colaboradores-constants';

export type ColaboradorRow = {
  id: number;
  nombreCompleto: string;
  tipoIdentificacion: string;
  identificacion: string;
  fechaVinculacion: string | null; // "AAAA-MM-DD"
  ciudad: string;
  telefono: string;
  telefonoEmergencia: string;
  fechaNacimiento: string | null; // "AAAA-MM-DD"
  placa: string;
  tipoVehiculo: string;
  medioVinculacion: string;
  usuarioCreador: string;
  agilizador: string;
  origenRegistro: 'manual' | 'formulario';
  estado: 'ACTIVO' | 'INACTIVO';
  motivoInactivacion: string;
  observacionNoPrestacion: string;
  creadoEn: string;
  // Estadísticas de servicios, calculadas en vivo contra la tabla services.
  cantFinalizados: number;
  cantNoEfectivo: number;
  totalGestiones: number;
  ultimoEstado: string;
  ultimoServicio: string; // "D/M/AAAA" o ''
  ultimoServicioDate: string | null; // "AAAA-MM-DD" o null, para calcular días sin gestión
};

export type ColaboradorHistorialEntry = {
  id: number;
  usuario: string;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  creadoEn: string;
};

export type ColaboradorInput = {
  nombreCompleto: string;
  tipoIdentificacion: string;
  identificacion: string;
  fechaVinculacion: string; // "AAAA-MM-DD"
  ciudad: string;
  telefono: string;
  telefonoEmergencia: string;
  fechaNacimiento: string; // "AAAA-MM-DD"
  placa: string;
  tipoVehiculo: string;
  medioVinculacion: string;
  agilizador: string;
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

const toStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
// Postgres devuelve DATE como Date a medianoche UTC — se formatea tal cual
// (sin pasar por zona horaria local) para no correr un día por accidente.
const toDateStr = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
};

function mapRow(r: Record<string, unknown>): ColaboradorRow {
  return {
    id: Number(r.id),
    nombreCompleto: toStr(r.nombre_completo),
    tipoIdentificacion: toStr(r.tipo_identificacion),
    identificacion: toStr(r.identificacion),
    fechaVinculacion: toDateStr(r.fecha_vinculacion),
    ciudad: toStr(r.ciudad),
    telefono: toStr(r.telefono),
    telefonoEmergencia: toStr(r.telefono_emergencia),
    fechaNacimiento: toDateStr(r.fecha_nacimiento),
    placa: toStr(r.placa),
    tipoVehiculo: toStr(r.tipo_vehiculo),
    medioVinculacion: toStr(r.medio_vinculacion),
    usuarioCreador: toStr(r.usuario_creador),
    agilizador: toStr(r.agilizador),
    origenRegistro: r.origen_registro === 'formulario' ? 'formulario' : 'manual',
    estado: r.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
    motivoInactivacion: toStr(r.motivo_inactivacion),
    observacionNoPrestacion: toStr(r.observacion_no_prestacion),
    creadoEn: toStr(r.creado_en),
    cantFinalizados: toNum(r.cant_finalizados),
    cantNoEfectivo: toNum(r.cant_no_efectivo),
    totalGestiones: toNum(r.total_gestiones),
    ultimoEstado: toStr(r.ultimo_estado),
    ultimoServicio: toStr(r.ultimo_servicio),
    ultimoServicioDate: toDateStr(r.ultimo_servicio_date),
  };
}

const STATS_QUERY = `
  WITH service_counts AS (
    SELECT
      ident_trabajador,
      count(*) FILTER (WHERE estado = 'Finalizado') AS cant_finalizados,
      count(*) FILTER (WHERE estado <> 'Finalizado') AS cant_no_efectivo,
      count(*) AS total_gestiones
    FROM public.services
    WHERE ident_trabajador IS NOT NULL AND ident_trabajador <> ''
    GROUP BY ident_trabajador
  ), service_last AS (
    SELECT DISTINCT ON (ident_trabajador)
      ident_trabajador,
      estado AS ultimo_estado,
      fecha_solicitud AS ultimo_servicio,
      fecha_solicitud_date AS ultimo_servicio_date
    FROM public.services
    WHERE ident_trabajador IS NOT NULL AND ident_trabajador <> ''
    ORDER BY ident_trabajador, fecha_solicitud_date DESC NULLS LAST
  )
  SELECT c.*,
    coalesce(sc.cant_finalizados, 0) AS cant_finalizados,
    coalesce(sc.cant_no_efectivo, 0) AS cant_no_efectivo,
    coalesce(sc.total_gestiones, 0) AS total_gestiones,
    sl.ultimo_estado, sl.ultimo_servicio, sl.ultimo_servicio_date
  FROM public.colaboradores c
  LEFT JOIN service_counts sc ON sc.ident_trabajador = c.identificacion
  LEFT JOIN service_last sl ON sl.ident_trabajador = c.identificacion
  ORDER BY c.nombre_completo;
`;

let cached: { data: ColaboradorRow[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getColaboradoresConStats(): Promise<ColaboradorRow[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const res = await getPool().query(STATS_QUERY);
  const data = res.rows.map(mapRow);
  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

function invalidateCache() {
  cached = null;
}

export async function getColaboradorHistorial(id: number): Promise<ColaboradorHistorialEntry[]> {
  const res = await getPool().query(
    `SELECT id, usuario, campo, valor_anterior, valor_nuevo, creado_en
     FROM public.colaboradores_historial WHERE colaborador_id = $1 ORDER BY creado_en DESC`,
    [id]
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    usuario: toStr(r.usuario),
    campo: toStr(r.campo),
    valorAnterior: toStr(r.valor_anterior),
    valorNuevo: toStr(r.valor_nuevo),
    creadoEn: toStr(r.creado_en),
  }));
}

function normalizePlaca(placa: string, tipoVehiculo: string): string {
  const noPlaca = ['A pie', 'Auxiliar', 'Bici'].includes(tipoVehiculo);
  if (noPlaca) return 'N/A';
  return placa.trim().toUpperCase() || 'N/A';
}

export async function createColaborador(
  input: ColaboradorInput,
  usuario: string,
  origenRegistro: 'manual' | 'formulario' = 'manual'
): Promise<number> {
  const identificacion = input.identificacion.replace(/[^0-9A-Za-z]/g, '');
  if (!identificacion) throw new Error('La identificación es obligatoria.');
  if (!input.nombreCompleto.trim()) throw new Error('El nombre completo es obligatorio.');

  const db = getPool();
  const existing = await db.query('SELECT id FROM public.colaboradores WHERE identificacion = $1', [identificacion]);
  if ((existing.rowCount ?? 0) > 0) throw new Error('Ya existe un colaborador con esa identificación.');

  const placa = normalizePlaca(input.placa, input.tipoVehiculo);
  const res = await db.query(
    `INSERT INTO public.colaboradores
      (nombre_completo, tipo_identificacion, identificacion, fecha_vinculacion, ciudad, telefono,
       telefono_emergencia, fecha_nacimiento, placa, tipo_vehiculo, medio_vinculacion, usuario_creador,
       agilizador, origen_registro)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      input.nombreCompleto.trim().toUpperCase(),
      input.tipoIdentificacion,
      identificacion,
      input.fechaVinculacion || null,
      input.ciudad.trim().toUpperCase(),
      input.telefono.replace(/[^0-9]/g, ''),
      input.telefonoEmergencia.replace(/[^0-9]/g, ''),
      input.fechaNacimiento || null,
      placa,
      input.tipoVehiculo,
      input.medioVinculacion,
      origenRegistro === 'formulario' ? null : usuario,
      (input.agilizador || (origenRegistro === 'formulario' ? '' : usuario)).toUpperCase(),
      origenRegistro,
    ]
  );
  const id = Number(res.rows[0].id);
  await db.query(
    `INSERT INTO public.colaboradores_historial (colaborador_id, usuario, campo, valor_anterior, valor_nuevo)
     VALUES ($1,$2,'creacion',NULL,$3)`,
    [id, origenRegistro === 'formulario' ? 'formulario (autoregistro)' : usuario, origenRegistro === 'formulario' ? 'Registrado por formulario público' : 'Registrado manualmente']
  );
  invalidateCache();
  return id;
}

const EDITABLE_FIELDS: { key: keyof ColaboradorInput; column: string; label: string }[] = [
  { key: 'nombreCompleto', column: 'nombre_completo', label: 'Nombre completo' },
  { key: 'tipoIdentificacion', column: 'tipo_identificacion', label: 'Tipo de identificación' },
  { key: 'fechaVinculacion', column: 'fecha_vinculacion', label: 'Fecha de vinculación' },
  { key: 'ciudad', column: 'ciudad', label: 'Ciudad' },
  { key: 'telefono', column: 'telefono', label: 'Teléfono' },
  { key: 'telefonoEmergencia', column: 'telefono_emergencia', label: 'Teléfono de emergencia' },
  { key: 'fechaNacimiento', column: 'fecha_nacimiento', label: 'Fecha de nacimiento' },
  { key: 'placa', column: 'placa', label: 'Placa' },
  { key: 'tipoVehiculo', column: 'tipo_vehiculo', label: 'Tipo de vehículo' },
  { key: 'medioVinculacion', column: 'medio_vinculacion', label: 'Medio de vinculación' },
  { key: 'agilizador', column: 'agilizador', label: 'Agilizador' },
];

export async function updateColaborador(id: number, input: ColaboradorInput, usuario: string): Promise<void> {
  const db = getPool();
  const current = await db.query('SELECT * FROM public.colaboradores WHERE id = $1', [id]);
  if (current.rowCount === 0) throw new Error('Colaborador no encontrado.');
  const before = current.rows[0] as Record<string, unknown>;

  const placa = normalizePlaca(input.placa, input.tipoVehiculo);
  const newValues: Record<string, string> = {
    nombreCompleto: input.nombreCompleto.trim().toUpperCase(),
    tipoIdentificacion: input.tipoIdentificacion,
    fechaVinculacion: input.fechaVinculacion || '',
    ciudad: input.ciudad.trim().toUpperCase(),
    telefono: input.telefono.replace(/[^0-9]/g, ''),
    telefonoEmergencia: input.telefonoEmergencia.replace(/[^0-9]/g, ''),
    fechaNacimiento: input.fechaNacimiento || '',
    placa,
    tipoVehiculo: input.tipoVehiculo,
    medioVinculacion: input.medioVinculacion,
    agilizador: input.agilizador.toUpperCase(),
  };

  const historial: { campo: string; antes: string; despues: string }[] = [];
  for (const f of EDITABLE_FIELDS) {
    const antes = toDateStr(before[f.column]) ?? toStr(before[f.column]);
    const despues = newValues[f.key];
    if ((antes || '') !== (despues || '')) historial.push({ campo: f.label, antes: antes || '', despues: despues || '' });
  }

  await db.query(
    `UPDATE public.colaboradores SET
       nombre_completo=$1, tipo_identificacion=$2, fecha_vinculacion=$3, ciudad=$4, telefono=$5,
       telefono_emergencia=$6, fecha_nacimiento=$7, placa=$8, tipo_vehiculo=$9, medio_vinculacion=$10,
       agilizador=$11, actualizado_en=now()
     WHERE id=$12`,
    [
      newValues.nombreCompleto,
      newValues.tipoIdentificacion,
      newValues.fechaVinculacion || null,
      newValues.ciudad,
      newValues.telefono,
      newValues.telefonoEmergencia,
      newValues.fechaNacimiento || null,
      newValues.placa,
      newValues.tipoVehiculo,
      newValues.medioVinculacion,
      newValues.agilizador,
      id,
    ]
  );

  for (const h of historial) {
    await db.query(
      `INSERT INTO public.colaboradores_historial (colaborador_id, usuario, campo, valor_anterior, valor_nuevo)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, usuario, h.campo, h.antes, h.despues]
    );
  }
  invalidateCache();
}

export async function setColaboradorEstado(
  id: number,
  estado: 'ACTIVO' | 'INACTIVO',
  usuario: string,
  motivo?: string
): Promise<void> {
  if (estado === 'INACTIVO' && !motivo?.trim()) {
    throw new Error('El motivo de inactivación es obligatorio.');
  }
  const db = getPool();
  const current = await db.query('SELECT estado, motivo_inactivacion FROM public.colaboradores WHERE id = $1', [id]);
  if (current.rowCount === 0) throw new Error('Colaborador no encontrado.');
  const before = current.rows[0] as { estado: string; motivo_inactivacion: string | null };

  await db.query(
    `UPDATE public.colaboradores SET estado=$1, motivo_inactivacion=$2, actualizado_en=now() WHERE id=$3`,
    [estado, estado === 'INACTIVO' ? motivo!.trim().toUpperCase() : null, id]
  );

  await db.query(
    `INSERT INTO public.colaboradores_historial (colaborador_id, usuario, campo, valor_anterior, valor_nuevo)
     VALUES ($1,$2,'estado',$3,$4)`,
    [id, usuario, before.estado, estado]
  );
  if (estado === 'INACTIVO') {
    await db.query(
      `INSERT INTO public.colaboradores_historial (colaborador_id, usuario, campo, valor_anterior, valor_nuevo)
       VALUES ($1,$2,'motivo_inactivacion',$3,$4)`,
      [id, usuario, before.motivo_inactivacion || '', motivo!.trim().toUpperCase()]
    );
  }
  invalidateCache();
}

export async function setColaboradorObservacion(id: number, observacion: string, usuario: string): Promise<void> {
  const db = getPool();
  const current = await db.query('SELECT observacion_no_prestacion FROM public.colaboradores WHERE id = $1', [id]);
  if (current.rowCount === 0) throw new Error('Colaborador no encontrado.');
  const before = toStr((current.rows[0] as Record<string, unknown>).observacion_no_prestacion);

  const observacionUpper = observacion.trim().toUpperCase();
  await db.query(
    `UPDATE public.colaboradores SET observacion_no_prestacion=$1, actualizado_en=now() WHERE id=$2`,
    [observacionUpper, id]
  );
  await db.query(
    `INSERT INTO public.colaboradores_historial (colaborador_id, usuario, campo, valor_anterior, valor_nuevo)
     VALUES ($1,$2,'observacion_no_prestacion',$3,$4)`,
    [id, usuario, before, observacionUpper]
  );
  invalidateCache();
}
