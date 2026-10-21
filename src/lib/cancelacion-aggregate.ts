import type { ServiceRow } from './sheets';
import { normalizeMotivo } from './motivos-cancelacion';
import { isSinClasificar } from './aggregate';
import { parseFechaSolicitud } from './date-filter';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export type MotivoStat = { motivo: string; cuenta: boolean; count: number; valor: number };
export type MesStat = { mes: string; mesLabel: string; count: number; valor: number };
export type DiaStat = { fecha: string; fechaLabel: string; mes: string; mesLabel: string; count: number; valor: number };
export type KeyStat = { key: string; count: number; valor: number };
export type DiaSemanaStat = { dia: string; valor: number; count: number };

export type CancelacionData = {
  totalCancelaciones: number;
  totalQueCuentan: number;
  valorPerdido: number;
  // cancelados / (finalizados + cancelados) * 100, sobre el mismo filtro
  // (fecha/jefatura/proyecto) de esta pestaña — no solo las que cuentan
  // como pérdida, sino TODO lo cancelado vs. lo resuelto.
  pctCancelacionFinalizado: number;
  porMotivo: MotivoStat[];
  porMes: MesStat[];
  porProyecto: KeyStat[];
  porJefatura: KeyStat[];
  porVehiculo: KeyStat[];
  porDiaSemana: DiaSemanaStat[];
  // Cantidad de cancelaciones por gestor — TODAS las canceladas (no solo
  // las que cuentan como pérdida), a diferencia de porProyecto/porJefatura.
  porGestor: KeyStat[];
};

const CANCELADO_ESTADOS = new Set(['Cancelado', 'Finalizado Cancelado']);
const TERMINAL_ESTADOS = new Set(['Finalizado', 'Cancelado', 'Finalizado Cancelado']);

// Lunes primero (a diferencia de JS, que arranca domingo=0).
const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
function diaSemanaIndex(fechaSolicitud: string): number | null {
  const f = parseFechaSolicitud(fechaSolicitud);
  if (!f) return null;
  const jsDay = new Date(Date.UTC(f.year, f.month - 1, f.day)).getUTCDay(); // 0=domingo..6=sábado
  return (jsDay + 6) % 7; // 0=lunes..6=domingo
}

// `motivosCuentan` = motivos normalizados (ver normalizeMotivo) marcados
// como "cuenta como pérdida" en Configuración → Tipos de cancelación.
export function buildCancelacionData(allRows: ServiceRow[], motivosCuentan: Set<string>): CancelacionData {
  const rows = allRows.filter((r) => CANCELADO_ESTADOS.has(r.estado) && !isSinClasificar(r.proyecto));
  const finalizadoCanceladoRows = allRows.filter((r) => !isSinClasificar(r.proyecto) && TERMINAL_ESTADOS.has(r.estado));
  const pctCancelacionFinalizado = finalizadoCanceladoRows.length ? (rows.length / finalizadoCanceladoRows.length) * 100 : 0;

  const porMotivoMap: Record<string, { count: number; valor: number }> = {};
  const porMesMap: Record<string, { mesLabel: string; count: number; valor: number }> = {};
  const porProyectoMap: Record<string, { count: number; valor: number }> = {};
  const porJefaturaMap: Record<string, { count: number; valor: number }> = {};
  const porVehiculoMap: Record<string, { count: number; valor: number }> = {};
  const porGestorMap: Record<string, { count: number; valor: number }> = {};
  const porDiaSemanaArr: { valor: number; count: number }[] = DIAS_SEMANA.map(() => ({ valor: 0, count: 0 }));

  let totalQueCuentan = 0;
  let valorPerdido = 0;

  rows.forEach((r) => {
    const motivo = normalizeMotivo(r.razonCancelacion);
    const valor = r.precioTotal || 0;
    const cuenta = motivosCuentan.has(motivo);

    if (!porMotivoMap[motivo]) porMotivoMap[motivo] = { count: 0, valor: 0 };
    porMotivoMap[motivo].count += 1;
    if (cuenta) porMotivoMap[motivo].valor += valor;

    const gestor = r.gestor || 'SIN GESTOR';
    if (!porGestorMap[gestor]) porGestorMap[gestor] = { count: 0, valor: 0 };
    porGestorMap[gestor].count += 1;
    if (cuenta) porGestorMap[gestor].valor += valor;

    if (cuenta) {
      totalQueCuentan += 1;
      valorPerdido += valor;

      if (r.anioSolicitud && r.mesNumSolicitud) {
        const mesKey = `${r.anioSolicitud}-${pad2(r.mesNumSolicitud)}`;
        const mesLabel = `${r.mesSolicitud} ${r.anioSolicitud}`;
        if (!porMesMap[mesKey]) porMesMap[mesKey] = { mesLabel, count: 0, valor: 0 };
        porMesMap[mesKey].count += 1;
        porMesMap[mesKey].valor += valor;
      }

      const dIdx = diaSemanaIndex(r.fechaSolicitud);
      if (dIdx !== null) {
        porDiaSemanaArr[dIdx].count += 1;
        porDiaSemanaArr[dIdx].valor += valor;
      }

      if (r.proyecto) {
        if (!porProyectoMap[r.proyecto]) porProyectoMap[r.proyecto] = { count: 0, valor: 0 };
        porProyectoMap[r.proyecto].count += 1;
        porProyectoMap[r.proyecto].valor += valor;
      }
      const j = r.jefatura.trim();
      if (j && !isSinClasificar(j)) {
        if (!porJefaturaMap[j]) porJefaturaMap[j] = { count: 0, valor: 0 };
        porJefaturaMap[j].count += 1;
        porJefaturaMap[j].valor += valor;
      }

      const vehiculo = r.tipoVehiculo.trim() || 'SIN VEHÍCULO';
      if (!porVehiculoMap[vehiculo]) porVehiculoMap[vehiculo] = { count: 0, valor: 0 };
      porVehiculoMap[vehiculo].count += 1;
      porVehiculoMap[vehiculo].valor += valor;
    }
  });

  const porMotivo: MotivoStat[] = Object.entries(porMotivoMap)
    .map(([motivo, v]) => ({ motivo, cuenta: motivosCuentan.has(motivo), ...v }))
    .sort((a, b) => b.count - a.count);

  const porMes: MesStat[] = Object.entries(porMesMap)
    .map(([mes, v]) => ({ mes, mesLabel: v.mesLabel, count: v.count, valor: v.valor }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const porProyecto: KeyStat[] = Object.entries(porProyectoMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.valor - a.valor);

  const porJefatura: KeyStat[] = Object.entries(porJefaturaMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.valor - a.valor);

  const porVehiculo: KeyStat[] = Object.entries(porVehiculoMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.valor - a.valor);

  const porDiaSemana: DiaSemanaStat[] = DIAS_SEMANA.map((dia, i) => ({ dia, ...porDiaSemanaArr[i] }));

  // Top 15 — con ~450 colaboradores registrados la cola larga no aporta,
  // solo alarga la lista (a diferencia de motivo/proyecto/jefatura, que son
  // pocos valores posibles y no hace falta recortar).
  const porGestor: KeyStat[] = Object.entries(porGestorMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    totalCancelaciones: rows.length,
    totalQueCuentan,
    valorPerdido,
    pctCancelacionFinalizado,
    porMotivo,
    porMes,
    porProyecto,
    porJefatura,
    porVehiculo,
    porDiaSemana,
    porGestor,
  };
}

// La gráfica "Venta perdida por día" ignora el filtro de día/rango de la
// página a propósito (un solo día da una sola barra, no sirve) — siempre
// muestra el desglose del MES que indique el filtro. Se calcula aparte
// para no acoplar buildCancelacionData a esa regla especial.
export function buildPorDiaDelMes(mesRows: ServiceRow[], motivosCuentan: Set<string>): DiaStat[] {
  const rows = mesRows.filter((r) => CANCELADO_ESTADOS.has(r.estado) && !isSinClasificar(r.proyecto));
  const porDiaMap: Record<string, { mesLabel: string; mes: string; count: number; valor: number }> = {};

  rows.forEach((r) => {
    const motivo = normalizeMotivo(r.razonCancelacion);
    if (!motivosCuentan.has(motivo)) return;
    if (!r.anioSolicitud || !r.mesNumSolicitud || !r.diaSolicitud) return;
    const valor = r.precioTotal || 0;
    const mesKey = `${r.anioSolicitud}-${pad2(r.mesNumSolicitud)}`;
    const mesLabel = `${r.mesSolicitud} ${r.anioSolicitud}`;
    const diaKey = `${mesKey}-${pad2(r.diaSolicitud)}`;
    if (!porDiaMap[diaKey]) porDiaMap[diaKey] = { mesLabel, mes: mesKey, count: 0, valor: 0 };
    porDiaMap[diaKey].count += 1;
    porDiaMap[diaKey].valor += valor;
  });

  return Object.entries(porDiaMap)
    .map(([fecha, v]) => {
      const d = fecha.split('-')[2];
      return { fecha, fechaLabel: `${d}/${v.mes.split('-')[1]}`, mes: v.mes, mesLabel: v.mesLabel, count: v.count, valor: v.valor };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
