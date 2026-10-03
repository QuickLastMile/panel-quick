import type { ServiceRow } from './sheets';

const SIN_CLASIFICAR = new Set(['OTRO', 'OTROS', 'NN']);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function parseHour(hora: string): number | null {
  if (!hora) return null;
  const h = Number(hora.split(':')[0]);
  return Number.isNaN(h) ? null : h;
}

export function normEstado(estado: string): string {
  if (estado === 'En Transito' || estado === 'En Tránsito') return 'En Tránsito';
  if (estado === 'Finalizado Cancelado') return 'Cancelado';
  return estado || 'Sin estado';
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

export type GestionRow = Pick<
  ServiceRow,
  | 'id'
  | 'proyecto'
  | 'ciudad'
  | 'direccion'
  | 'fechaSolicitud'
  | 'horaServicio'
  | 'fechaCreacion'
  | 'horaCreacion'
  | 'gestor'
  | 'nombreTrabajador'
  | 'identTrabajador'
  | 'placa'
  | 'razonCancelacion'
>;

export type GestorStat = {
  gestor: string;
  cargo: string;
  total: number;
  finalizado: number;
  cancelado: number;
  enProceso: number;
  cumplimientoPct: number;
};

export type DashboardData = {
  generadoEn: string;
  totalServicios: number;
  porEstado: { key: string; count: number }[];
  porProyecto: { key: string; count: number }[];
  proyectoEstado: { proyecto: string; estado: string; count: number }[];
  porCiudad: { key: string; count: number }[];
  ciudadEstado: { ciudad: string; estado: string; count: number }[];
  horaCiudad: { ciudad: string; hora: number; fuente: 'servicio' | 'creacion'; count: number }[];
  porServicio: { key: string; count: number }[];
  porTipoServicio: { key: string; count: number }[];
  gestion: Record<string, GestionRow[]>;
  gestorStats: GestorStat[];
};

// Lista de jefaturas reales presentes en el set de filas dado (para pestañas),
// excluyendo vacías y los valores "sin clasificar" (OTRO/OTROS/NN).
export function listJefaturas(rows: ServiceRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const j = r.jefatura.trim();
    if (j && !SIN_CLASIFICAR.has(j.toUpperCase())) set.add(j);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export function filterRowsByJefatura(rows: ServiceRow[], jefatura: string): ServiceRow[] {
  if (!jefatura) return rows;
  return rows.filter((r) => r.jefatura === jefatura);
}

export type MesProyectoPoint = { mes: string; mesLabel: string; proyecto: string; count: number };
export type DiaProyectoPoint = { fecha: string; fechaLabel: string; mes: string; mesLabel: string; proyecto: string; count: number };

export type TrendData = {
  mesProyecto: MesProyectoPoint[];
  diaProyecto: DiaProyectoPoint[];
};

// Agregados para las gráficas de "Mes" y "Tendencia por día" — deliberadamente
// independientes del filtro de día/mes de la página (reciben el set de filas
// sin ese filtro aplicado) para poder mostrar tendencia real a través del
// tiempo; su propio filtro de proyecto/mes vive dentro de cada gráfica.
export function buildTrendData(rows: ServiceRow[]): TrendData {
  const mesMap: Record<string, { mesLabel: string; proyecto: string; count: number }> = {};
  const diaMap: Record<string, { mesLabel: string; mes: string; proyecto: string; count: number }> = {};

  rows.forEach((r) => {
    if (SIN_CLASIFICAR.has(r.proyecto.toUpperCase())) return;
    if (!r.anioSolicitud || !r.mesNumSolicitud) return;
    const mesKey = `${r.anioSolicitud}-${pad2(r.mesNumSolicitud)}`;
    const mesLabel = `${r.mesSolicitud} ${r.anioSolicitud}`;
    const mk = `${mesKey}|||${r.proyecto}`;
    if (!mesMap[mk]) mesMap[mk] = { mesLabel, proyecto: r.proyecto, count: 0 };
    mesMap[mk].count += 1;

    if (r.diaSolicitud) {
      const diaKey = `${mesKey}-${pad2(r.diaSolicitud)}`;
      const dk = `${diaKey}|||${r.proyecto}`;
      if (!diaMap[dk]) {
        diaMap[dk] = { mesLabel, mes: mesKey, proyecto: r.proyecto, count: 0 };
      }
      diaMap[dk].count += 1;
    }
  });

  const mesProyecto = Object.entries(mesMap)
    .map(([k, v]) => ({ mes: k.split('|||')[0], mesLabel: v.mesLabel, proyecto: v.proyecto, count: v.count }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const diaProyecto = Object.entries(diaMap)
    .map(([k, v]) => {
      const fecha = k.split('|||')[0];
      const [, , d] = fecha.split('-');
      return { fecha, fechaLabel: `${d}/${v.mes.split('-')[1]}`, mes: v.mes, mesLabel: v.mesLabel, proyecto: v.proyecto, count: v.count };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { mesProyecto, diaProyecto };
}

function pickGestion(r: ServiceRow): GestionRow {
  return {
    id: r.id,
    proyecto: r.proyecto,
    ciudad: r.ciudad,
    direccion: r.direccion,
    fechaSolicitud: r.fechaSolicitud,
    horaServicio: r.horaServicio,
    fechaCreacion: r.fechaCreacion,
    horaCreacion: r.horaCreacion,
    gestor: r.gestor,
    nombreTrabajador: r.nombreTrabajador,
    identTrabajador: r.identTrabajador,
    placa: r.placa,
    razonCancelacion: r.razonCancelacion,
  };
}

export function buildDashboardData(rows: ServiceRow[]): DashboardData {
  const porEstadoMap: Record<string, number> = {};
  rows.forEach((r) => bump(porEstadoMap, normEstado(r.estado)));

  const porProyectoMap: Record<string, number> = {};
  const proyectoEstadoMap: Record<string, number> = {};
  rows.forEach((r) => {
    if (SIN_CLASIFICAR.has(r.proyecto.toUpperCase())) return;
    bump(porProyectoMap, r.proyecto);
    bump(proyectoEstadoMap, `${r.proyecto}|||${normEstado(r.estado)}`);
  });

  const porCiudadMap: Record<string, number> = {};
  const ciudadEstadoMap: Record<string, number> = {};
  rows.forEach((r) => {
    bump(porCiudadMap, r.ciudad);
    bump(ciudadEstadoMap, `${r.ciudad}|||${normEstado(r.estado)}`);
  });

  const horaCiudadMap: Record<string, number> = {};
  rows.forEach((r) => {
    const hServicio = parseHour(r.horaServicio);
    if (hServicio !== null) bump(horaCiudadMap, `${r.ciudad}|||${hServicio}|||servicio`);
    const hCreacion = parseHour(r.horaCreacion);
    if (hCreacion !== null) bump(horaCiudadMap, `${r.ciudad}|||${hCreacion}|||creacion`);
  });

  const porServicioMap: Record<string, number> = {};
  const porTipoServicioMap: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.servicio) bump(porServicioMap, r.servicio);
    if (r.tipoServicio) bump(porTipoServicioMap, r.tipoServicio);
  });

  const gestion: Record<string, GestionRow[]> = {
    'En Espera': rows.filter((r) => r.estado === 'En Espera').map(pickGestion),
    'Relanzado': rows.filter((r) => r.estado === 'Relanzado').map(pickGestion),
    'Asignado': rows.filter((r) => r.estado === 'Asignado').map(pickGestion),
    'En Tránsito': rows.filter((r) => r.estado === 'En Transito' || r.estado === 'En Tránsito').map(pickGestion),
    'Finalizado': rows.filter((r) => r.estado === 'Finalizado').map(pickGestion),
    'Cancelado': rows.filter((r) => r.estado === 'Cancelado' || r.estado === 'Finalizado Cancelado').map(pickGestion),
  };
  const conocidos = new Set(['En Espera', 'Relanzado', 'Asignado', 'En Transito', 'En Tránsito', 'Finalizado', 'Cancelado', 'Finalizado Cancelado']);
  const otros = rows.filter((r) => !conocidos.has(r.estado)).map(pickGestion);
  if (otros.length) gestion['Otros'] = otros;

  const porGestor: Record<string, { cargo: string; total: number; finalizado: number; cancelado: number; enProceso: number }> = {};
  rows.forEach((r) => {
    const g = r.gestor || 'SIN GESTOR';
    if (SIN_CLASIFICAR.has(g.toUpperCase())) return;
    if (!porGestor[g]) porGestor[g] = { cargo: r.cargoGestor || '', total: 0, finalizado: 0, cancelado: 0, enProceso: 0 };
    const entry = porGestor[g];
    entry.total += 1;
    const e = normEstado(r.estado);
    if (e === 'Finalizado') entry.finalizado += 1;
    else if (e === 'Cancelado') entry.cancelado += 1;
    else entry.enProceso += 1;
  });

  const gestorStats: GestorStat[] = Object.entries(porGestor)
    .map(([gestor, v]) => ({
      gestor,
      cargo: v.cargo,
      total: v.total,
      finalizado: v.finalizado,
      cancelado: v.cancelado,
      enProceso: v.enProceso,
      cumplimientoPct: v.total ? Math.round((v.finalizado / v.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const toPairs = (m: Record<string, number>) => Object.entries(m).map(([key, count]) => ({ key, count }));

  return {
    generadoEn: new Date().toISOString(),
    totalServicios: rows.length,
    porEstado: toPairs(porEstadoMap),
    porProyecto: toPairs(porProyectoMap).sort((a, b) => b.count - a.count),
    proyectoEstado: Object.entries(proyectoEstadoMap).map(([k, count]) => {
      const [proyecto, estado] = k.split('|||');
      return { proyecto, estado, count };
    }),
    porCiudad: toPairs(porCiudadMap).sort((a, b) => b.count - a.count),
    ciudadEstado: Object.entries(ciudadEstadoMap).map(([k, count]) => {
      const [ciudad, estado] = k.split('|||');
      return { ciudad, estado, count };
    }),
    horaCiudad: Object.entries(horaCiudadMap).map(([k, count]) => {
      const [ciudad, hora, fuente] = k.split('|||');
      return { ciudad, hora: Number(hora), fuente: fuente as 'servicio' | 'creacion', count };
    }),
    porServicio: toPairs(porServicioMap).sort((a, b) => b.count - a.count),
    porTipoServicio: toPairs(porTipoServicioMap).sort((a, b) => b.count - a.count),
    gestion,
    gestorStats,
  };
}
