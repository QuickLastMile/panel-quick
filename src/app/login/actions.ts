'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkCredentials, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') || '');
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/dashboard');

  const role = checkCredentials(username, password);
  if (!role) {
    return { error: 'Usuario o contraseña incorrectos.' };
  }

  const token = await createSessionToken(role);
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
