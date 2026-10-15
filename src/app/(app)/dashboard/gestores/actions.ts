'use server';

import { getSheetsSnapshot, type ServiceRow } from '@/lib/sheets';
import { isSinClasificar } from '@/lib/aggregate';

const SEARCH_LIMIT = 30;

// El panel de detalle de un gestor solo necesita sus propias filas (o un
// puñado de resultados de búsqueda), no el histórico completo (~78k filas)
// — mandar eso al cliente en cada carga de Seguimiento gestores es lo que
// hacía lenta esta pantalla. Igual que en Onboarding, se trae bajo demanda.
export async function getServiciosDeGestor(gestor: string): Promise<ServiceRow[]> {
  if (!gestor) return [];
  const { rows } = await getSheetsSnapshot();
  return rows.filter((r) => !isSinClasificar(r.proyecto) && r.gestor === gestor);
}

export async function searchServicios(query: string): Promise<ServiceRow[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const { rows } = await getSheetsSnapshot();
  const results: ServiceRow[] = [];
  for (const r of rows) {
    if (isSinClasificar(r.proyecto)) continue;
    if (
      r.id.toLowerCase().includes(q) ||
      r.identTrabajador.toLowerCase().includes(q) ||
      r.nombreTrabajador.toLowerCase().includes(q) ||
      r.gestor.toLowerCase().includes(q)
    ) {
      results.push(r);
      if (results.length >= SEARCH_LIMIT) break;
    }
  }
  return results;
}
