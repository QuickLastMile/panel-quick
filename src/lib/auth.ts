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
  admin: [
    '/dashboard',
    '/dashboard/gestion',
    '/dashboard/gestores',
    '/dashboard/mensajeros',
    '/dashboard/directorio',
    '/admin/configuracion',
    '/admin/configuracion/historial',
    '/admin/configuracion/usuarios',
  ],
  supervisor: ['/dashboard', '/dashboard/gestion', '/dashboard/gestores', '/dashboard/mensajeros', '/dashboard/directorio'],
  coordinador: ['/dashboard'],
};

const COOKIE_NAME = 'quick_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 horas

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Falta AUTH_SECRET en las variables de entorno.');
  return new TextEncoder().encode(secret);
}

export type SessionData = { role: Role; email: string; nombre: string };

export async function createSessionToken(data: SessionData): Promise<string> {
  return new SignJWT({ role: data.role, email: data.email, nombre: data.nombre })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = payload.role;
    if (role !== 'admin' && role !== 'supervisor' && role !== 'coordinador') return null;
    return { role, email: String(payload.email || ''), nombre: String(payload.nombre || '') };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
