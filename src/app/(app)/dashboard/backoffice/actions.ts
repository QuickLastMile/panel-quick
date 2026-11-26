'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, getSession } from '@/lib/session';
import { saveCarga, anularCarga } from '@/lib/backoffice';
import type { Celda } from '@/lib/backoffice-types';

export async function subirCarga(input: {
  archivo: string;
  hoja: string;
  columnas: string[];
  filas: Celda[][];
}): Promise<{ id?: string; error?: string }> {
  await requireRole(['admin', 'onboarding']);
  const session = await getSession();
  try {
    const id = await saveCarga(input, { email: session?.email || 'desconocido', nombre: session?.nombre || '' });
    revalidatePath('/dashboard/backoffice');
    revalidatePath('/admin/configuracion/historial');
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar la carga.' };
  }
}

export async function anular(id: string): Promise<{ error?: string }> {
  const role = await requireRole(['admin', 'onboarding']);
  const session = await getSession();
  try {
    await anularCarga(id, { email: session?.email || '', esAdmin: role === 'admin' });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo anular la carga.' };
  }
  revalidatePath('/dashboard/backoffice');
  revalidatePath('/admin/configuracion/historial');
  return {};
}
