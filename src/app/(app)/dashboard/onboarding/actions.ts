'use server';

import { getSheetsSnapshot, type ServiceRow } from '@/lib/sheets';

// El detalle de un vinculado solo necesita sus propios servicios, no las
// 28k+ filas completas de Datos_Actuales — traerlas todas al cliente en
// cada carga de la página (aunque nunca se abra un detalle) es lo que hacía
// lenta esta pantalla. Esta acción corre en el servidor y solo devuelve lo
// que el panel de detalle realmente necesita, al momento de abrirlo.
export async function getServiciosDeVinculado(identificacion: string): Promise<ServiceRow[]> {
  const ident = identificacion.trim();
  if (!ident) return [];
  const { rows } = await getSheetsSnapshot();
  return rows
    .filter((r) => r.identTrabajador.trim() === ident)
    .sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));
}
