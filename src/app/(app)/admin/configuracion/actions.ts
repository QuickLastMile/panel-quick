'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/session';
import { saveRangoConfig, getRangoConfig } from '@/lib/configuracion';
import type { RangoConfig } from '@/lib/configuracion-types';
import { syncServicesFromDb, type SyncResult } from '@/lib/sheets-sync';

export async function saveRango(rango: RangoConfig): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await saveRangoConfig(rango);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
  revalidatePath('/admin/configuracion');
  return {};
}

export async function refreshNow(): Promise<{ error?: string; result?: SyncResult }> {
  await requireRole(['admin']);
  try {
    const rango = await getRangoConfig();
    const result = await syncServicesFromDb({ startOffsetDays: -rango.diasAtras, endOffsetDays: rango.diasAdelante });
    revalidatePath('/', 'layout');
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo actualizar.' };
  }
}
