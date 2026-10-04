'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';
import { checkCredentials } from '@/lib/usuarios';

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/dashboard');

  if (!email || !password) {
    return { error: 'Ingresa tu correo y contraseña.' };
  }

  let result;
  try {
    result = await checkCredentials(email, password);
  } catch {
    return { error: 'No se pudo validar el usuario. Intenta de nuevo.' };
  }
  if (!result) {
    return { error: 'Correo o contraseña incorrectos.' };
  }

  const token = await createSessionToken({ role: result.role, email: email.toLowerCase(), nombre: result.nombre });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  redirect(next.startsWith('/') ? next : '/dashboard');
}

export async function logout() {
  'use server';
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
