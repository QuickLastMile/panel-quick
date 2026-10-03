'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/session';
import { saveRangoConfig } from '@/lib/configuracion';
import type { RangoConfig } from '@/lib/configuracion-types';

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
