'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/session';
import { saveProyectoBaseRow, saveColaboradorBaseRow } from '@/lib/base';

export async function saveProyecto(row: {
  rowNumber?: number;
  email: string;
  nombre: string;
  proceso: string;
  jefatura: string;
}): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await saveProyectoBaseRow(row);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
  revalidatePath('/admin/configuracion/base');
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
  try {
    await saveColaboradorBaseRow(row);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
  revalidatePath('/admin/configuracion/base');
  return {};
}
