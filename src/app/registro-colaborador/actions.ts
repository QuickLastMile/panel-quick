'use server';

import { createColaborador, type ColaboradorInput } from '@/lib/colaboradores';

// Público, sin login — lo diligencia el colaborador desde el link que le
// comparte el agilizador. Queda marcado como origen "formulario" para que
// el equipo lo revise.
export async function registrarColaboradorPublico(input: ColaboradorInput): Promise<{ error?: string; ok?: boolean }> {
  try {
    await createColaborador(input, 'formulario', 'formulario');
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo registrar. Intenta de nuevo.' };
  }
  return { ok: true };
}
