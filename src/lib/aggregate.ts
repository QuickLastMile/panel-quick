import type { ServiceRow } from './sheets';

const SIN_CLASIFICAR = new Set(['OTRO', 'OTROS', 'NN']);
const TERMINAL = new Set(['Finalizado', 'Cancelado']);
// "DESCARTAR" son filas que no cuentan para este análisis (la fuente las
// marca así); "#N/A" es un error de fórmula en el Sheet, no una categoría
// real — ninguna de las dos debe aparecer en las gráficas de asignador.
const EXCLUDE_TIPO_ASIGNADOR = new Set(['DESCARTAR', '#N/A']);

export function isSinClasificar(value: string): boolean {
  return SIN_CLASIFICAR.has(value.toUpperCase());
}

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
  ciudadProyectoEstado: { ciudad: string; proyecto: string; estado: string; count: number }[];
  horaCiudad: { ciudad: string; proyecto: string; hora: number; fuente: 'servicio' | 'creacion'; count: number }[];
  porServicio: { key: string; count: number }[];
  porTipoServicio: { key: string; count: number }[];
  porTipoAsignador: { key: string; count: number }[];
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
export type DiaProyectoPoint = {
  fecha: string;
  fechaLabel: string;
  mes: string;
  mesLabel: string;
  proyecto: string;
  estado: string;
  count: number;
};

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
  const diaMap: Record<string, { mesLabel: string; mes: string; proyecto: string; estado: string; count: number }> = {};

  rows.forEach((r) => {
    if (SIN_CLASIFICAR.has(r.proyecto.toUpperCase())) return;
    if (!r.anioSolicitud || !r.mesNumSolicitud) return;
    const mesKey = `${r.anioSolicitud}-${pad2(r.mesNumSolicitud)}`;
    const mesLabel = `${r.mesSolicitud} ${r.anioSolicitud}`;
    const mk = `${mesKey}|||${r.proyecto}`;
    if (!mesMap[mk]) mesMap[mk] = { mesLabel, proyecto: r.proyecto, count: 0 };
    mesMap[mk].count += 1;

    if (r.diaSolicitud) {
      const estado = normEstado(r.estado);
      const diaKey = `${mesKey}-${pad2(r.diaSolicitud)}`;
      const dk = `${diaKey}|||${r.proyecto}|||${estado}`;
      if (!diaMap[dk]) {
        diaMap[dk] = { mesLabel, mes: mesKey, proyecto: r.proyecto, estado, count: 0 };
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
      return {
        fecha,
        fechaLabel: `${d}/${v.mes.split('-')[1]}`,
        mes: v.mes,
        mesLabel: v.mesLabel,
        proyecto: v.proyecto,
        estado: v.estado,
        count: v.count,
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { mesProyecto, diaProyecto };
}

export type MesTipoPoint = { mes: string; mesLabel: string; tipo: string; count: number };
export type DiaTipoPoint = { fecha: string; fechaLabel: string; mes: string; mesLabel: string; tipo: string; count: number };

export type TipoAsignadorTrend = {
  mesTipo: MesTipoPoint[];
  diaTipo: DiaTipoPoint[];
};

// Mismo patrón que buildTrendData: histórico completo, independiente del
// filtro de día de la página — para ver la tendencia real de quién asigna
// (agilizador vs. administrativo) a través del tiempo.
export function buildTipoAsignadorTrend(rows: ServiceRow[]): TipoAsignadorTrend {
  const mesMap: Record<string, { mesLabel: string; tipo: string; count: number }> = {};
  const diaMap: Record<string, { mesLabel: string; mes: string; tipo: string; count: number }> = {};

  rows.forEach((r) => {
    if (SIN_CLASIFICAR.has(r.proyecto.toUpperCase())) return;
    if (!r.tipoAsignador || EXCLUDE_TIPO_ASIGNADOR.has(r.tipoAsignador.toUpperCase())) return;
    if (!r.anioSolicitud || !r.mesNumSolicitud) return;
    const mesKey = `${r.anioSolicitud}-${pad2(r.mesNumSolicitud)}`;
    const mesLabel = `${r.mesSolicitud} ${r.anioSolicitud}`;
    const mk = `${mesKey}|||${r.tipoAsignador}`;
    if (!mesMap[mk]) mesMap[mk] = { mesLabel, tipo: r.tipoAsignador, count: 0 };
    mesMap[mk].count += 1;

    if (r.diaSolicitud) {
      const diaKey = `${mesKey}-${pad2(r.diaSolicitud)}`;
      const dk = `${diaKey}|||${r.tipoAsignador}`;
      if (!diaMap[dk]) diaMap[dk] = { mesLabel, mes: mesKey, tipo: r.tipoAsignador, count: 0 };
      diaMap[dk].count += 1;
    }
  });

  const mesTipo = Object.entries(mesMap)
    .map(([k, v]) => ({ mes: k.split('|||')[0], mesLabel: v.mesLabel, tipo: v.tipo, count: v.count }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const diaTipo = Object.entries(diaMap)
    .map(([k, v]) => {
      const fecha = k.split('|||')[0];
      const [, , d] = fecha.split('-');
      return { fecha, fechaLabel: `${d}/${v.mes.split('-')[1]}`, mes: v.mes, mesLabel: v.mesLabel, tipo: v.tipo, count: v.count };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { mesTipo, diaTipo };
}

export function buildDashboardData(allRows: ServiceRow[]): DashboardData {
  // Filtro único a la entrada: "OTRO"/"OTROS"/"NN" son proyectos sin
  // clasificar, no reales — se excluyen de TODA la página (total, por
  // estado, por ciudad, por hora, etc.), no solo de la gráfica de proyectos.
  const rows = allRows.filter((r) => !isSinClasificar(r.proyecto));

  const porEstadoMap: Record<string, number> = {};
  rows.forEach((r) => bump(porEstadoMap, normEstado(r.estado)));

  const porProyectoMap: Record<string, number> = {};
  const proyectoEstadoMap: Record<string, number> = {};
  rows.forEach((r) => {
    bump(porProyectoMap, r.proyecto);
    bump(proyectoEstadoMap, `${r.proyecto}|||${normEstado(r.estado)}`);
  });

  const porCiudadMap: Record<string, number> = {};
  const ciudadEstadoMap: Record<string, number> = {};
  const ciudadProyectoEstadoMap: Record<string, number> = {};
  rows.forEach((r) => {
    bump(porCiudadMap, r.ciudad);
    bump(ciudadEstadoMap, `${r.ciudad}|||${normEstado(r.estado)}`);
    bump(ciudadProyectoEstadoMap, `${r.ciudad}|||${r.proyecto}|||${normEstado(r.estado)}`);
  });

  // Incluye el proyecto en la llave para poder filtrar/desglosar por
  // proyecto en el cliente (validar qué proyecto está creando en cada hora).
  const horaCiudadMap: Record<string, number> = {};
  rows.forEach((r) => {
    const hServicio = parseHour(r.horaServicio);
    if (hServicio !== null) bump(horaCiudadMap, `${r.ciudad}|||${r.proyecto}|||${hServicio}|||servicio`);
    const hCreacion = parseHour(r.horaCreacion);
    if (hCreacion !== null) bump(horaCiudadMap, `${r.ciudad}|||${r.proyecto}|||${hCreacion}|||creacion`);
  });

  const porServicioMap: Record<string, number> = {};
  const porTipoServicioMap: Record<string, number> = {};
  const porTipoAsignadorMap: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.servicio) bump(porServicioMap, r.servicio);
    if (r.tipoServicio) bump(porTipoServicioMap, r.tipoServicio);
    if (r.tipoAsignador && !EXCLUDE_TIPO_ASIGNADOR.has(r.tipoAsignador.toUpperCase())) bump(porTipoAsignadorMap, r.tipoAsignador);
  });

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
    ciudadProyectoEstado: Object.entries(ciudadProyectoEstadoMap).map(([k, count]) => {
      const [ciudad, proyecto, estado] = k.split('|||');
      return { ciudad, proyecto, estado, count };
    }),
    horaCiudad: Object.entries(horaCiudadMap).map(([k, count]) => {
      const [ciudad, proyecto, hora, fuente] = k.split('|||');
      return { ciudad, proyecto, hora: Number(hora), fuente: fuente as 'servicio' | 'creacion', count };
    }),
    porServicio: toPairs(porServicioMap).sort((a, b) => b.count - a.count),
    porTipoServicio: toPairs(porTipoServicioMap).sort((a, b) => b.count - a.count),
    porTipoAsignador: toPairs(porTipoAsignadorMap).sort((a, b) => b.count - a.count),
    gestorStats,
  };
}

export type MensajeroStat = {
  identTrabajador: string;
  nombreTrabajador: string;
  total: number;
  finalizado: number;
  cancelado: number;
  enProceso: number;
  // Días distintos (por fecha de solicitud) en los que este mensajero tuvo
  // al menos un servicio — proxy de constancia/antigüedad real en la
  // plataforma, no solo volumen. Relevante porque esta operación es tipo
  // DiDi/Picap: hay mucha rotación, y "quién hizo más" no es lo mismo que
  // "quién ha sido constante y confiable".
  diasActivos: number;
  proyectos: string[];
  // finalizado / (finalizado + cancelado) — 0.5 (neutral) si aún no tiene
  // ningún servicio resuelto, para no castigar a alguien recién llegado.
  tasaCumplimiento: number;
  // 0-100: 50% constancia (días activos relativo al más constante del
  // grupo filtrado) + 50% cumplimiento. Es la métrica de "fiel y juicioso".
  indiceFidelidad: number;
};

// Productividad Y fidelidad de mensajeros/trabajadores (no gestores). Usa
// Ident. Trabajador como llave (el nombre puede repetirse).
export function buildMensajeroStats(rows: ServiceRow[]): MensajeroStat[] {
  type Acc = {
    identTrabajador: string;
    nombreTrabajador: string;
    total: number;
    finalizado: number;
    cancelado: number;
    enProceso: number;
    dias: Set<string>;
    proyectos: Set<string>;
  };
  const map: Record<string, Acc> = {};
  rows.forEach((r) => {
    if (!r.identTrabajador) return;
    if (!map[r.identTrabajador]) {
      map[r.identTrabajador] = {
        identTrabajador: r.identTrabajador,
        nombreTrabajador: r.nombreTrabajador || r.identTrabajador,
        total: 0,
        finalizado: 0,
        cancelado: 0,
        enProceso: 0,
        dias: new Set(),
        proyectos: new Set(),
      };
    }
    const entry = map[r.identTrabajador];
    if (r.nombreTrabajador) entry.nombreTrabajador = r.nombreTrabajador;
    entry.total += 1;
    const e = normEstado(r.estado);
    if (e === 'Finalizado') entry.finalizado += 1;
    else if (e === 'Cancelado') entry.cancelado += 1;
    else entry.enProceso += 1;
    if (r.fechaSolicitud) entry.dias.add(r.fechaSolicitud);
    if (r.proyecto) entry.proyectos.add(r.proyecto);
  });

  const accs = Object.values(map);
  const maxDias = Math.max(...accs.map((a) => a.dias.size), 1);

  return accs
    .map((a) => {
      const resueltos = a.finalizado + a.cancelado;
      const tasaCumplimiento = resueltos > 0 ? a.finalizado / resueltos : 0.5;
      const tenureScore = a.dias.size / maxDias;
      return {
        identTrabajador: a.identTrabajador,
        nombreTrabajador: a.nombreTrabajador,
        total: a.total,
        finalizado: a.finalizado,
        cancelado: a.cancelado,
        enProceso: a.enProceso,
        diasActivos: a.dias.size,
        proyectos: Array.from(a.proyectos).sort((x, y) => x.localeCompare(y, 'es')),
        tasaCumplimiento,
        indiceFidelidad: Math.round(100 * (0.5 * tenureScore + 0.5 * tasaCumplimiento)),
      };
    })
    .sort((a, b) => b.indiceFidelidad - a.indiceFidelidad || b.finalizado - a.finalizado);
}

export type DobleAsignacion = {
  identTrabajador: string;
  nombreTrabajador: string;
  fechaSolicitud: string;
  proyectos: string[];
  rows: ServiceRow[];
};

// Un mensajero solo puede hacer un turno al día, salvo que sean "Medio Dia"
// (ahí sí pueden ser dos). Si el mismo día tiene asignaciones ACTIVAS (no
// Finalizado/Cancelado) en 2+ proyectos distintos y no todas son Medio Dia,
// es una asignación doble por error — hay que validarla ya.
export function findDobleAsignacion(rows: ServiceRow[]): DobleAsignacion[] {
  const map: Record<string, { identTrabajador: string; nombreTrabajador: string; fechaSolicitud: string; rows: ServiceRow[] }> = {};
  rows.forEach((r) => {
    if (!r.identTrabajador || !r.fechaSolicitud) return;
    if (isSinClasificar(r.proyecto)) return;
    if (TERMINAL.has(normEstado(r.estado))) return;
    // Mensajeros de prueba (ej. "prueba prueba") no son reales — no deben
    // disparar la alerta.
    if (r.nombreTrabajador.toLowerCase().includes('prueba')) return;
    const key = `${r.identTrabajador}|||${r.fechaSolicitud}`;
    if (!map[key]) {
      map[key] = { identTrabajador: r.identTrabajador, nombreTrabajador: r.nombreTrabajador || r.identTrabajador, fechaSolicitud: r.fechaSolicitud, rows: [] };
    }
    map[key].rows.push(r);
  });

  return Object.values(map)
    .map((g) => ({ ...g, proyectos: Array.from(new Set(g.rows.map((r) => r.proyecto))) }))
    .filter((g) => g.proyectos.length >= 2)
    .filter((g) => !g.rows.every((r) => r.servicio === 'Medio Dia'))
    .sort((a, b) => b.rows.length - a.rows.length);
}
