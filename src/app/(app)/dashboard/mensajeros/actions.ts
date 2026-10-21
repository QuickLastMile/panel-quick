'use server';

import { getSheetsSnapshot, type ServiceRow } from '@/lib/sheets';
import { isSinClasificar } from '@/lib/aggregate';

// Igual que getServiciosDeGestor en gestores/actions.ts — el panel de
// detalle de un mensajero necesita todo SU histórico (todos los IDs que ha
// realizado), no el de los ~118k servicios de la tabla, así que se trae
// bajo demanda en vez de mandarlo con cada carga de Ranking mensajeros.
export async function getServiciosDeMensajero(identTrabajador: string): Promise<ServiceRow[]> {
  if (!identTrabajador) return [];
  const { rows } = await getSheetsSnapshot();
  return rows.filter((r) => !isSinClasificar(r.proyecto) && r.identTrabajador === identTrabajador);
}
