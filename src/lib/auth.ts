import { SignJWT, jwtVerify } from 'jose';

export type Role = 'admin' | 'supervisor' | 'coordinador';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  coordinador: 'Coordinador / General',
};

// Qué rutas puede ver cada rol — coincidencia EXACTA (no por prefijo).
// Importante: '/dashboard' no debe autorizar '/dashboard/gestion' solo por
// compartir el prefijo; cada ruta protegida se lista explícitamente.
export const ROLE_ALLOWED_PATHS: Record<Role, string[]> = {
  admin: ['/dashboard', '/dashboard/gestion', '/dashboard/gestores', '/admin/configuracion', '/admin/configuracion/historial'],
  supervisor: ['/dashboard', '/dashboard/gestion', '/dashboard/gestores'],
  coordinador: ['/dashboard'],
};

const COOKIE_NAME = 'quick_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 horas

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Falta AUTH_SECRET en las variables de entorno.');
  return new TextEncoder().encode(secret);
}

export function checkCredentials(username: string, password: string): Role | null {
  const normalized = username.trim().toLowerCase();
  const map: Record<string, { password: string | undefined; role: Role }> = {
    admin: { password: process.env.ADMIN_PASSWORD, role: 'admin' },
    supervisor: { password: process.env.SUPERVISOR_PASSWORD, role: 'supervisor' },
    coordinador: { password: process.env.COORDINADOR_PASSWORD, role: 'coordinador' },
  };
  const entry = map[normalized];
  if (!entry || !entry.password) return null;
  if (password !== entry.password) return null;
  return entry.role;
}

export async function createSessionToken(role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<Role | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = payload.role;
    if (role === 'admin' || role === 'supervisor' || role === 'coordinador') return role;
    return null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
