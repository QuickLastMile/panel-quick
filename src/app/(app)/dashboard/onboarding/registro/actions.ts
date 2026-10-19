'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/session';
import { getSession } from '@/lib/session';
import {
  createColaborador,
  updateColaborador,
  setColaboradorEstado,
  setColaboradorObservacion,
  getColaboradorHistorial,
  type ColaboradorInput,
  type ColaboradorHistorialEntry,
} from '@/lib/colaboradores';

const ALLOWED_ROLES = ['admin', 'supervisor', 'onboarding'] as const;

async function currentUserEmail(): Promise<string> {
  const session = await getSession();
  return session?.email || 'desconocido';
}

export async function createColaboradorAction(input: ColaboradorInput): Promise<{ error?: string }> {
  await requireRole([...ALLOWED_ROLES]);
  const usuario = await currentUserEmail();
  try {
    await createColaborador(input, usuario);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo crear el colaborador.' };
  }
  revalidatePath('/dashboard/onboarding/registro');
  revalidatePath('/dashboard/onboarding');
  return {};
}

export async function updateColaboradorAction(id: number, input: ColaboradorInput): Promise<{ error?: string }> {
  await requireRole([...ALLOWED_ROLES]);
  const usuario = await currentUserEmail();
  try {
    await updateColaborador(id, input, usuario);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo actualizar el colaborador.' };
  }
  revalidatePath('/dashboard/onboarding/registro');
  revalidatePath('/dashboard/onboarding');
  return {};
}

export async function setColaboradorEstadoAction(
  id: number,
  estado: 'ACTIVO' | 'INACTIVO',
  motivo?: string
): Promise<{ error?: string }> {
  await requireRole([...ALLOWED_ROLES]);
  const usuario = await currentUserEmail();
  try {
    await setColaboradorEstado(id, estado, usuario, motivo);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo actualizar el estado.' };
  }
  revalidatePath('/dashboard/onboarding/registro');
  revalidatePath('/dashboard/onboarding');
  return {};
}

export async function setColaboradorObservacionAction(id: number, observacion: string): Promise<{ error?: string }> {
  await requireRole([...ALLOWED_ROLES]);
  const usuario = await currentUserEmail();
  try {
    await setColaboradorObservacion(id, observacion, usuario);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar la observación.' };
  }
  revalidatePath('/dashboard/onboarding/registro');
  revalidatePath('/dashboard/onboarding');
  return {};
}

export async function getColaboradorHistorialAction(id: number): Promise<ColaboradorHistorialEntry[]> {
  await requireRole([...ALLOWED_ROLES]);
  return getColaboradorHistorial(id);
}
