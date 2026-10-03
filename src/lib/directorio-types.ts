// Tipos y helpers puros del directorio de mensajeros — SIN importar
// googleapis, para que los componentes cliente puedan usarlos sin arrastrar
// código solo-de-servidor (net/tls) al bundle del navegador.

export type DirectorioEntry = {
  identTrabajador: string;
  nombreTrabajador: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
  vetado: boolean;
  vetadoProyecto: string;
  vetadoMotivo: string;
  contratadoFijo: boolean;
  contratadoFijoProyecto: string;
  notas: string;
  actualizadoEn: string;
};

export function emptyDirectorioEntry(identTrabajador = '', nombreTrabajador = ''): DirectorioEntry {
  return {
    identTrabajador,
    nombreTrabajador,
    telefono: '',
    estado: 'Activo',
    vetado: false,
    vetadoProyecto: '',
    vetadoMotivo: '',
    contratadoFijo: false,
    contratadoFijoProyecto: '',
    notas: '',
    actualizadoEn: '',
  };
}
