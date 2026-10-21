import { fetchServicesFromDb } from './bi-db';
import { upsertCsvRowsToSupabase } from './supabase-sync';

export type SyncResult = { total: number };

// Botón "Actualizar ahora" del panel: lee directo de bi_smart y sube a
// Supabase — ya no pasa por Google Sheets (antes escribía en Datos_Actuales
// y releía de ahí). El upsert es idempotente, así que simplemente se
// vuelve a subir toda la ventana de días configurada.
export async function syncServicesFromDb({
  startOffsetDays = -4,
  endOffsetDays = 4,
}: { startOffsetDays?: number; endOffsetDays?: number } = {}): Promise<SyncResult> {
  const csvRows = await fetchServicesFromDb({ startOffsetDays, endOffsetDays });
  const total = await upsertCsvRowsToSupabase(csvRows);
  return { total };
}
