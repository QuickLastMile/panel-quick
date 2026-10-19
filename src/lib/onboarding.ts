import { getColaboradoresConStats, type ColaboradorRow } from './colaboradores';

// Antes esta pestaña leía la pestaña ONBOARDING del Sheet (llenada a mano
// por el agilizador, con fórmulas de cruce contra Datos_Actuales). Ahora
// los datos viven en Supabase (tabla colaboradores) y las estadísticas de
// gestión se calculan en vivo contra la tabla services — ver
// src/lib/colaboradores.ts. Se mantiene el mismo tipo VinculacionRow y la
// misma función getOnboardingSnapshot() para que el resto del módulo
// (gráficas, tablas, filtros) no tenga que cambiar.
export type VinculacionRow = {
  workerId: string;
  nombreCompleto: string;
  // "D/M/AAAA", igual formato que FECHA SOLICITUD en el Sheet de monitoreo.
  fechaVinculacion: string;
  identificacion: string;
  tipoIdentificacion: string;
  telefono: string;
  fechaNacimiento: string;
  estadoWorker: string;
  ciudad: string;
  vehiculo: string;
  // Quien hizo la vinculación.
  agilizador: string;
  ultimoServicio: string;
  cantFinalizados: number;
  cantFinalizadosNovedad: number;
  totalGestiones: number;
  ultimoEstado: string;
  // "SIN GESTIÓN" / "PRIMER SERVICIO NO EFECTIVO" / "GESTIONANDO".
  gestionStatus: string;
  observacionNoPrestacion: string;
  motivoInactivacion: string;
};

export type OnboardingSnapshot = {
  rows: VinculacionRow[];
};

function isoToDMY(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function gestionStatusFor(c: ColaboradorRow): string {
  if (c.totalGestiones === 0) return 'SIN GESTIÓN';
  if (c.cantFinalizados === 0) return 'PRIMER SERVICIO NO EFECTIVO';
  return 'GESTIONANDO';
}

function toVinculacionRow(c: ColaboradorRow): VinculacionRow {
  return {
    workerId: String(c.id),
    nombreCompleto: c.nombreCompleto,
    fechaVinculacion: isoToDMY(c.fechaVinculacion),
    identificacion: c.identificacion,
    tipoIdentificacion: c.tipoIdentificacion,
    telefono: c.telefono,
    fechaNacimiento: isoToDMY(c.fechaNacimiento),
    estadoWorker: c.estado,
    ciudad: c.ciudad,
    vehiculo: c.tipoVehiculo,
    agilizador: c.agilizador,
    ultimoServicio: c.ultimoServicio,
    cantFinalizados: c.cantFinalizados,
    cantFinalizadosNovedad: c.cantNoEfectivo,
    totalGestiones: c.totalGestiones,
    ultimoEstado: c.ultimoEstado,
    gestionStatus: gestionStatusFor(c),
    observacionNoPrestacion: c.observacionNoPrestacion,
    motivoInactivacion: c.motivoInactivacion,
  };
}

export async function getOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  const colaboradores = await getColaboradoresConStats();
  return { rows: colaboradores.map(toVinculacionRow) };
}
