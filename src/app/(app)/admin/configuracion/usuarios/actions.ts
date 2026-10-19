'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, getSession } from '@/lib/session';
import { createUsuario, setUsuarioActivo, setUsuarioPassword, setUsuarioRol } from '@/lib/usuarios';
import type { Role } from '@/lib/auth';

async function actorEmail(): Promise<string> {
  const session = await getSession();
  return session?.email || 'desconocido';
}

export async function createUsuarioAction(data: {
  email: string;
  nombre: string;
  password: string;
  rol: Role;
}): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await createUsuario(data, await actorEmail());
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo crear el usuario.' };
  }
  revalidatePath('/admin/configuracion/usuarios');
  revalidatePath('/admin/configuracion/historial');
  return {};
}

export async function toggleUsuarioActivoAction(email: string, activo: boolean): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await setUsuarioActivo(email, activo, await actorEmail());
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo actualizar el usuario.' };
  }
  revalidatePath('/admin/configuracion/usuarios');
  revalidatePath('/admin/configuracion/historial');
  return {};
}

export async function setUsuarioRolAction(email: string, rol: Role): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await setUsuarioRol(email, rol, await actorEmail());
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo cambiar el rol.' };
  }
  revalidatePath('/admin/configuracion/usuarios');
  revalidatePath('/admin/configuracion/historial');
  return {};
}

export async function setUsuarioPasswordAction(email: string, newPassword: string): Promise<{ error?: string }> {
  await requireRole(['admin']);
  try {
    await setUsuarioPassword(email, newPassword, await actorEmail());
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.' };
  }
  revalidatePath('/admin/configuracion/usuarios');
  revalidatePath('/admin/configuracion/historial');
  return {};
}
