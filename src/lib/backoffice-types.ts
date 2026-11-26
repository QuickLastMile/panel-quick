// Tipos puros — sin pg — para que el componente cliente los pueda importar
// sin arrastrar código solo-de-servidor al navegador.

// Cada celda se guarda tal cual vino del Excel: número, texto, o vacía.
// Las fechas se normalizan a texto "AAAA-MM-DD" (o "AAAA-MM-DD HH:mm") al
// leer el archivo, para que se puedan agrupar por día sin depender de zona
// horaria.
export type Celda = string | number | null;

export type CargaResumen = {
  id: string;
  archivo: string;
  hoja: string;
  totalFilas: number;
  totalColumnas: number;
  subidoPor: string;
  subidoPorNombre: string;
  subidoEn: string;
};

export type CargaDetalle = CargaResumen & {
  columnas: string[];
  // Filas como arreglos alineados con `columnas` (no objetos) — pesa mucho
  // menos al mandarlo por la Server Action y al guardarlo en jsonb.
  filas: Celda[][];
};

// Límites de una carga: Vercel corta el cuerpo de la petición en ~4.5 MB, y
// next.config.ts sube el de las Server Actions a 4 MB.
export const MAX_FILAS = 20000;
export const MAX_COLUMNAS = 150;
export const MAX_LARGO_CELDA = 500;
