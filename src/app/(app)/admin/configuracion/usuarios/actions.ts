'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/session';
import { createUsuario, setUsuarioActivo } from '@/lib/usuarios';
import type { Role } from '@/lib/auth';

export async function createUsuarioAction(data: {
  email: string;
  nombre: string;
  password: string;
  rol: Role;
}): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await createUsuario(data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo crear el usuario.' };
  }
  revalidatePath('/admin/configuracion/usuarios');
  return {};
}

export async function toggleUsuarioActivoAction(email: string, activo: boolean): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await setUsuarioActivo(email, activo);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo actualizar el usuario.' };
  }
  revalidatePath('/admin/configuracion/usuarios');
  return {};
}
