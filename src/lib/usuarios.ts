import { google } from 'googleapis';
import type { Role } from './auth';
import { hashPassword, verifyPassword } from './password';
import type { Usuario } from './usuarios-types';

export type { Usuario } from './usuarios-types';

const SHEET_NAME = 'Usuarios';
const VALID_ROLES = new Set<Role>(['admin', 'supervisor', 'coordinador']);

type UsuarioRow = Usuario & { passwordHash: string };

// Igual que directorio.ts / configuracion.ts: mismo service account, con
// scope de escritura completo.
function getWriteAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON en las variables de entorno.');
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSpreadsheetId() {
  const id = process.env.MONITOREO_SHEET_ID;
  if (!id) throw new Error('Falta MONITOREO_SHEET_ID en las variables de entorno.');
  return id;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getAllUsuarios(): Promise<UsuarioRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${SHEET_NAME}!A2:F`,
  });
  return (res.data.values || [])
    .filter((r) => r[0])
    .map((r) => ({
      email: normalizeEmail(String(r[0])),
      nombre: String(r[1] || ''),
      passwordHash: String(r[2] || ''),
      rol: (VALID_ROLES.has(String(r[3]) as Role) ? String(r[3]) : 'coordinador') as Role,
      activo: String(r[4] ?? 'TRUE').toUpperCase() !== 'FALSE',
      creadoEn: String(r[5] || ''),
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

export async function createUsuario({
  email,
  nombre,
  password,
  rol,
}: {
  email: string;
  nombre: string;
  password: string;
  rol: Role;
}): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) throw new Error('Correo inválido.');
  if (!nombre.trim()) throw new Error('El nombre es obligatorio.');
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (!VALID_ROLES.has(rol)) throw new Error('Rol inválido.');

  const existing = await getAllUsuarios();
  if (existing.some((u) => u.email === normalized)) {
    throw new Error('Ya existe un usuario con ese correo.');
  }

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[normalized, nombre.trim(), hashPassword(password), rol, 'TRUE', new Date().toISOString()]],
    },
  });
}

export async function setUsuarioActivo(email: string, activo: boolean): Promise<void> {
  const normalized = normalizeEmail(email);
  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!A:A` });
  const col = (res.data.values || []).map((r) => normalizeEmail(String(r[0] ?? '')));
  const idx = col.indexOf(normalized);
  if (idx === -1) throw new Error('Usuario no encontrado.');

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!E${idx + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[activo ? 'TRUE' : 'FALSE']] },
  });
}
