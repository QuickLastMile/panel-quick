'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/session';
import { saveDirectorioEntry, type DirectorioEntry } from '@/lib/directorio';

export async function saveMensajero(entry: DirectorioEntry): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await saveDirectorioEntry(entry);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
  revalidatePath('/dashboard/directorio');
  return {};
}
