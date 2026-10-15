import type { VinculacionRow } from './onboarding';
import { parseFechaSolicitud } from './date-filter';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

export type DiaVinculacionPoint = { fecha: string; fechaLabel: string; mes: string; mesLabel: string; count: number };
export type MesVinculacionPoint = { mes: string; mesLabel: string; count: number };

export type OnboardingData = {
  total: number;
  porAgilizador: { key: string; count: number }[];
  porCiudad: { key: string; count: number }[];
  porVehiculo: { key: string; count: number }[];
  diaVinculacion: DiaVinculacionPoint[];
  mesVinculacion: MesVinculacionPoint[];
  // "SIN GESTIÓN" / "PRIMER SERVICIO NO EFECTIVO" / "GESTIONANDO" — tal cual
  // la columna "gestión" del Sheet (ya calculada con fórmulas de cruce).
  porGestionStatus: { key: string; count: number }[];
  gestionaron: number;
  sinGestion: number;
};

const SIN_GESTION = 'SIN GESTIÓN';

export function buildOnboardingData(rows: VinculacionRow[]): OnboardingData {
  const porAgilizadorMap: Record<string, number> = {};
  const porCiudadMap: Record<string, number> = {};
  const porVehiculoMap: Record<string, number> = {};
  const porGestionStatusMap: Record<string, number> = {};
  const diaMap: Record<string, { mes: string; mesLabel: string; count: number }> = {};
  const mesMap: Record<string, { mesLabel: string; count: number }> = {};
  let gestionaron = 0;
  let sinGestion = 0;

  rows.forEach((r) => {
    if (r.agilizador) bump(porAgilizadorMap, r.agilizador);
    if (r.ciudad) bump(porCiudadMap, r.ciudad);
    if (r.vehiculo) bump(porVehiculoMap, r.vehiculo);
    const estadoGestion = r.gestionStatus || SIN_GESTION;
    bump(porGestionStatusMap, estadoGestion);
    if (estadoGestion === SIN_GESTION) sinGestion += 1;
    else gestionaron += 1;

    const fecha = parseFechaSolicitud(r.fechaVinculacion);
    if (fecha) {
      const mesKey = `${fecha.year}-${pad2(fecha.month)}`;
      const mesLabel = `${MESES[fecha.month - 1]} ${fecha.year}`;
      const diaKey = `${mesKey}-${pad2(fecha.day)}`;
      if (!diaMap[diaKey]) diaMap[diaKey] = { mes: mesKey, mesLabel, count: 0 };
      diaMap[diaKey].count += 1;
      if (!mesMap[mesKey]) mesMap[mesKey] = { mesLabel, count: 0 };
      mesMap[mesKey].count += 1;
    }
  });

  const toPairs = (m: Record<string, number>) =>
    Object.entries(m)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

  const diaVinculacion = Object.entries(diaMap)
    .map(([fecha, v]) => {
      const d = fecha.split('-')[2];
      return { fecha, fechaLabel: `${d}/${v.mes.split('-')[1]}`, mes: v.mes, mesLabel: v.mesLabel, count: v.count };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const mesVinculacion = Object.entries(mesMap)
    .map(([mes, v]) => ({ mes, mesLabel: v.mesLabel, count: v.count }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  return {
    total: rows.length,
    porAgilizador: toPairs(porAgilizadorMap),
    porCiudad: toPairs(porCiudadMap),
    porVehiculo: toPairs(porVehiculoMap),
    diaVinculacion,
    mesVinculacion,
    porGestionStatus: toPairs(porGestionStatusMap),
    gestionaron,
    sinGestion,
  };
}

export type OnboardingKpis = {
  vinculadosHoy: number;
  promedioPorDia: number;
  ciudadTop: { key: string; count: number } | null;
};

// Histórico completo (no el filtro de día de la página) — "hoy", el
// promedio diario y la ciudad top son indicadores de contexto general, no
// del período que esté mirando la supervisora en ese momento.
export function buildOnboardingKpis(allRows: VinculacionRow[], today: { year: number; month: number; day: number }): OnboardingKpis {
  const diasSet = new Set<string>();
  const porCiudadMap: Record<string, number> = {};
  let vinculadosHoy = 0;
  let validCount = 0;

  allRows.forEach((r) => {
    const fecha = parseFechaSolicitud(r.fechaVinculacion);
    if (!fecha) return;
    validCount += 1;
    diasSet.add(`${fecha.year}-${pad2(fecha.month)}-${pad2(fecha.day)}`);
    if (fecha.year === today.year && fecha.month === today.month && fecha.day === today.day) vinculadosHoy += 1;
    if (r.ciudad) bump(porCiudadMap, r.ciudad);
  });

  const ciudadTopEntry = Object.entries(porCiudadMap).sort((a, b) => b[1] - a[1])[0];

  return {
    vinculadosHoy,
    promedioPorDia: diasSet.size ? validCount / diasSet.size : 0,
    ciudadTop: ciudadTopEntry ? { key: ciudadTopEntry[0], count: ciudadTopEntry[1] } : null,
  };
}

export type AgilizadorMeta = {
  nombre: string;
  vinculadosHoy: number;
  metaDiaria: number;
  pctDiaria: number;
  vinculadosMes: number;
  metaMensual: number;
  pctMensual: number;
  // % de sus vinculados (histórico) que ya gestionaron al menos un servicio.
  efectividadPct: number;
};

// Seguimiento de meta para un agilizador puntual (ej. "ZAMIR ANDRES ARCIA"):
// meta diaria y mensual de vinculaciones, y qué tan efectivas resultaron
// (cuántos de sus vinculados ya están gestionando vs. siguen sin gestión).
export function buildAgilizadorMeta(
  allRows: VinculacionRow[],
  nombreAgilizador: string,
  today: { year: number; month: number; day: number },
  metaDiaria = 5,
  metaMensual = 130
): AgilizadorMeta {
  const nombreUpper = nombreAgilizador.trim().toUpperCase();
  const suyos = allRows.filter((r) => r.agilizador.trim().toUpperCase() === nombreUpper);

  let vinculadosHoy = 0;
  let vinculadosMes = 0;
  let gestionaron = 0;

  suyos.forEach((r) => {
    const fecha = parseFechaSolicitud(r.fechaVinculacion);
    if (fecha) {
      if (fecha.year === today.year && fecha.month === today.month && fecha.day === today.day) vinculadosHoy += 1;
      if (fecha.year === today.year && fecha.month === today.month) vinculadosMes += 1;
    }
    if ((r.gestionStatus || SIN_GESTION) !== SIN_GESTION) gestionaron += 1;
  });

  return {
    nombre: nombreAgilizador,
    vinculadosHoy,
    metaDiaria,
    pctDiaria: metaDiaria ? Math.round((vinculadosHoy / metaDiaria) * 1000) / 10 : 0,
    vinculadosMes,
    metaMensual,
    pctMensual: metaMensual ? Math.round((vinculadosMes / metaMensual) * 1000) / 10 : 0,
    efectividadPct: suyos.length ? Math.round((gestionaron / suyos.length) * 1000) / 10 : 0,
  };
}
