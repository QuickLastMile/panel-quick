import type { ServiceRow } from './sheets';

const SIN_CLASIFICAR = new Set(['OTRO', 'OTROS']);

export function normEstado(estado: string): string {
  if (estado === 'En Transito' || estado === 'En Tránsito') return 'En Tránsito';
  if (estado === 'Finalizado Cancelado') return 'Cancelado';
  return estado || 'Sin estado';
}

function franja(hora: string): string {
  if (!hora) return 'Sin hora';
  const h = Number(hora.split(':')[0]);
  if (Number.isNaN(h)) return 'Sin hora';
  if (h < 6) return 'Madrugada (00-06)';
  if (h < 12) return 'Mañana (06-12)';
  if (h < 18) return 'Tarde (12-18)';
  return 'Noche (18-24)';
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
  porFranja: { key: string; count: number }[];
  franjaCiudad: { ciudad: string; franja: string; count: number }[];
  porCiudad: { key: string; count: number }[];
  gestion: Record<string, GestionRow[]>;
  gestorStats: GestorStat[];
};

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

  const porFranjaMap: Record<string, number> = {};
  const franjaCiudadMap: Record<string, number> = {};
  rows.forEach((r) => {
    const f = franja(r.horaServicio);
    bump(porFranjaMap, f);
    bump(franjaCiudadMap, `${r.ciudad}|||${f}`);
  });

  const porCiudadMap: Record<string, number> = {};
  rows.forEach((r) => bump(porCiudadMap, r.ciudad));

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
    porFranja: toPairs(porFranjaMap),
    franjaCiudad: Object.entries(franjaCiudadMap).map(([k, count]) => {
      const [ciudad, franjaKey] = k.split('|||');
      return { ciudad, franja: franjaKey, count };
    }),
    porCiudad: toPairs(porCiudadMap).sort((a, b) => b.count - a.count),
    gestion,
    gestorStats,
  };
}
