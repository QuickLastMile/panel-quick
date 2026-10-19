'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, getSession } from '@/lib/session';
import { saveProyectoBaseRow, saveColaboradorBaseRow } from '@/lib/base';

export async function saveProyecto(row: {
  rowNumber?: number;
  email: string;
  nombre: string;
  proceso: string;
  jefatura: string;
}): Promise<{ error?: string }> {
  await requireRole(['admin']);
  const session = await getSession();
  try {
    await saveProyectoBaseRow(row, session?.email || 'desconocido');
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
  revalidatePath('/admin/configuracion/base');
  revalidatePath('/admin/configuracion/historial');
  return {};
}

export async function saveColaborador(row: {
  rowNumber?: number;
  colaboradorData: string;
  cargo: string;
  ext: string;
  colaborador: string;
  tipo: string;
}): Promise<{ error?: string }> {
  await requireRole(['admin']);
  const session = await getSession();
  try {
    await saveColaboradorBaseRow(row, session?.email || 'desconocido');
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
  revalidatePath('/admin/configuracion/base');
  revalidatePath('/admin/configuracion/historial');
  return {};
}
