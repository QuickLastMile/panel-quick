// Tipos y helpers puros del directorio de mensajeros — SIN importar
// googleapis, para que los componentes cliente puedan usarlos sin arrastrar
// código solo-de-servidor (net/tls) al bundle del navegador.

export type DirectorioEntry = {
  identTrabajador: string;
  nombreTrabajador: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
  vetado: boolean;
  vetadoProyectos: string[];
  vetadoMotivo: string;
  // "AAAA-MM-DD" — se guarda sola al marcar `vetado` por primera vez (ver
  // saveDirectorioEntry); no se edita a mano. Vacío si nunca estuvo vetado.
  vetadoDesde: string;
  contratadoFijo: boolean;
  contratadoFijoProyecto: string;
  notas: string;
  // Ciudad/vehículo escritos a mano en Novedades — se usan cuando no hay
  // suficiente historial de servicios para calcularlos solos (ver
  // directorio/page.tsx: tienen prioridad sobre la moda calculada).
  ciudadManual: string;
  tipoVehiculoManual: string;
  actualizadoEn: string;
};

export function emptyDirectorioEntry(identTrabajador = '', nombreTrabajador = ''): DirectorioEntry {
  return {
    identTrabajador,
    nombreTrabajador,
    telefono: '',
    estado: 'Activo',
    vetado: false,
    vetadoProyectos: [],
    vetadoMotivo: '',
    vetadoDesde: '',
    contratadoFijo: false,
    contratadoFijoProyecto: '',
    notas: '',
    ciudadManual: '',
    tipoVehiculoManual: '',
    actualizadoEn: '',
  };
}

// Fecha comparable "AAAA-MM-DD" en la que un servicio quedó con ESTE
// mensajero — prioriza fechaHoraAsignado (momento real de la asignación)
// sobre fechaSolicitud (puede ser previa a que se le asignara a él).
export function fechaAsignacionDeServicio(row: { fechaHoraAsignado: string; fechaSolicitud: string }): string {
  if (row.fechaHoraAsignado && row.fechaHoraAsignado.length >= 10) return row.fechaHoraAsignado.slice(0, 10);
  const parts = row.fechaSolicitud.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

// Para la alerta "vetado pero con asignación activa en ese proyecto": solo
// cuenta si la asignación es DE DESPUÉS del veto — una asignación previa al
// veto no es una violación, es trabajo de antes de que se vetara. Si no hay
// fecha de veto o de asignación conocida (datos antiguos), se cuenta igual
// — mejor un falso positivo que dejar pasar un veto activo sin avisar.
export function esAsignacionPosteriorAlVeto(row: { fechaHoraAsignado: string; fechaSolicitud: string }, vetadoDesde: string): boolean {
  if (!vetadoDesde) return true;
  const fechaAsig = fechaAsignacionDeServicio(row);
  if (!fechaAsig) return true;
  return fechaAsig >= vetadoDesde;
}
