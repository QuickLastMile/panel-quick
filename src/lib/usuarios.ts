import { Pool } from 'pg';
import type { Role } from './auth';
import { hashPassword, verifyPassword } from './password';
import type { Usuario } from './usuarios-types';
import { logModificacion } from './modificaciones';

export type { Usuario } from './usuarios-types';

const VALID_ROLES = new Set<Role>(['admin', 'supervisor', 'coordinador', 'onboarding']);

type UsuarioRow = Usuario & { passwordHash: string };

let pool: Pool | null = null;
function getPool(): Pool {
  if (pool) return pool;
  const host = process.env.SUPA_DB_HOST;
  const port = process.env.SUPA_DB_PORT;
  const user = process.env.SUPA_DB_USER;
  const password = process.env.SUPA_DB_PASSWORD;
  if (!host || !port || !user || !password) {
    throw new Error('Faltan las variables SUPA_DB_* en las variables de entorno.');
  }
  pool = new Pool({
    host,
    port: Number(port),
    user,
    password,
    database: process.env.SUPA_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
    max: 5,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getAllUsuarios(): Promise<UsuarioRow[]> {
  const res = await getPool().query(
    `select email, nombre, password_hash, rol, activo, creado_en from public.usuarios`
  );
  return res.rows.map((r) => ({
    email: normalizeEmail(String(r.email)),
    nombre: String(r.nombre || ''),
    passwordHash: String(r.password_hash || ''),
    rol: (VALID_ROLES.has(r.rol as Role) ? r.rol : 'coordinador') as Role,
    activo: Boolean(r.activo),
    creadoEn: r.creado_en ? new Date(r.creado_en).toISOString() : '',
  }));
}

export async function getUsuarios(): Promise<Usuario[]> {
  const rows = await getAllUsuarios();
  return rows
    .map(({ passwordHash: _passwordHash, ...u }) => u)
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function checkCredentials(email: string, password: string): Promise<{ role: Role; nombre: string } | null> {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return null;
  const rows = await getAllUsuarios();
  const user = rows.find((u) => u.email === normalized);
  if (!user || !user.activo || !user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { role: user.rol, nombre: user.nombre };
}

export async function createUsuario(
  {
    email,
    nombre,
    password,
    rol,
  }: {
    email: string;
    nombre: string;
    password: string;
    rol: Role;
  },
  usuarioActor: string
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) throw new Error('Correo inválido.');
  if (!nombre.trim()) throw new Error('El nombre es obligatorio.');
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (!VALID_ROLES.has(rol)) throw new Error('Rol inválido.');

  const existing = await getAllUsuarios();
  if (existing.some((u) => u.email === normalized)) {
    throw new Error('Ya existe un usuario con ese correo.');
  }

  await getPool().query(
    `insert into public.usuarios (email, nombre, password_hash, rol, activo) values ($1,$2,$3,$4,true)`,
    [normalized, nombre.trim(), hashPassword(password), rol]
  );
  await logModificacion({ area: 'Usuarios', entidad: normalized, usuario: usuarioActor, campo: 'creación', valorNuevo: `${nombre.trim()} · ${rol}` });
}

export async function setUsuarioActivo(email: string, activo: boolean, usuarioActor: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const res = await getPool().query(`update public.usuarios set activo = $1 where email = $2`, [activo, normalized]);
  if (res.rowCount === 0) throw new Error('Usuario no encontrado.');
  await logModificacion({
    area: 'Usuarios',
    entidad: normalized,
    usuario: usuarioActor,
    campo: 'Estado',
    valorAnterior: activo ? 'Desactivado' : 'Activo',
    valorNuevo: activo ? 'Activo' : 'Desactivado',
  });
}

export async function setUsuarioRol(email: string, rol: Role, usuarioActor: string): Promise<void> {
  if (!VALID_ROLES.has(rol)) throw new Error('Rol inválido.');
  const normalized = normalizeEmail(email);
  const existing = await getAllUsuarios();
  const before = existing.find((u) => u.email === normalized);
  if (!before) throw new Error('Usuario no encontrado.');

  await getPool().query(`update public.usuarios set rol = $1 where email = $2`, [rol, normalized]);
  await logModificacion({ area: 'Usuarios', entidad: normalized, usuario: usuarioActor, campo: 'Rol', valorAnterior: before.rol, valorNuevo: rol });
}

export async function setUsuarioPassword(email: string, newPassword: string, usuarioActor: string): Promise<void> {
  if (newPassword.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const normalized = normalizeEmail(email);
  const res = await getPool().query(`update public.usuarios set password_hash = $1 where email = $2`, [hashPassword(newPassword), normalized]);
  if (res.rowCount === 0) throw new Error('Usuario no encontrado.');
  // Nunca se guarda la contraseña en el historial, solo que se cambió.
  await logModificacion({ area: 'Usuarios', entidad: normalized, usuario: usuarioActor, campo: 'Contraseña', valorNuevo: 'Se cambió la contraseña' });
}
