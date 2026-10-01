import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken, type Role } from './auth';

export async function getSessionRole(): Promise<Role | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// Segunda capa de control de acceso (además del proxy): cada página
// restringida la llama para no depender solo del proxy ante un error de
// configuración futuro.
export async function requireRole(allowed: Role[]): Promise<Role> {
  const role = await getSessionRole();
  if (!role) redirect('/login');
  if (!allowed.includes(role)) redirect('/dashboard');
  return role;
}
