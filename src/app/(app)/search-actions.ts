'use server';

import { getSheetsSnapshot } from '@/lib/sheets';
import { requireRole } from '@/lib/session';
import type { ServiceRow } from '@/lib/sheets';

const MAX_RESULTS = 20;

// Corre en el servidor a propósito: el dataset completo (28k+ filas) es
// demasiado pesado para mandarlo al navegador en cada carga de página solo
// para tener un buscador — acá se busca contra el snapshot cacheado y solo
// se devuelven las filas que coinciden.
export async function searchServicios(query: string): Promise<ServiceRow[]> {
  await requireRole(['admin', 'supervisor', 'coordinador']);
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const { rows } = await getSheetsSnapshot();
  const results: ServiceRow[] = [];
  for (const r of rows) {
    if (
      r.id.toLowerCase().includes(q) ||
      r.identTrabajador.toLowerCase().includes(q) ||
      r.nombreTrabajador.toLowerCase().includes(q) ||
      r.gestor.toLowerCase().includes(q)
    ) {
      results.push(r);
      if (results.length >= MAX_RESULTS) break;
    }
  }
  return results;
}
