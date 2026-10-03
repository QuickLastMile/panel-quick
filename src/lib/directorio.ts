import { google } from 'googleapis';
import type { DirectorioEntry } from './directorio-types';

export type { DirectorioEntry } from './directorio-types';
export { emptyDirectorioEntry } from './directorio-types';

const SHEET_NAME = 'Directorio_Mensajeros';

// A diferencia de sheets.ts (solo lectura), este módulo necesita escribir —
// usa el mismo service account pero con el scope completo en vez de
// spreadsheets.readonly.
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

function rowToEntry(r: unknown[]): DirectorioEntry {
  const s = (i: number) => String(r[i] ?? '').trim();
  const b = (i: number) => s(i).toUpperCase() === 'TRUE';
  return {
    identTrabajador: s(0),
    nombreTrabajador: s(1),
    telefono: s(2),
    estado: s(3) === 'Inactivo' ? 'Inactivo' : 'Activo',
    vetado: b(4),
    vetadoProyecto: s(5),
    vetadoMotivo: s(6),
    contratadoFijo: b(7),
    contratadoFijoProyecto: s(8),
    notas: s(9),
    actualizadoEn: s(10),
  };
}

function entryToRow(e: DirectorioEntry): (string | boolean)[] {
  return [
    e.identTrabajador,
    e.nombreTrabajador,
    e.telefono,
    e.estado,
    e.vetado ? 'TRUE' : 'FALSE',
    e.vetadoProyecto,
    e.vetadoMotivo,
    e.contratadoFijo ? 'TRUE' : 'FALSE',
    e.contratadoFijoProyecto,
    e.notas,
    new Date().toISOString(),
  ];
}

async function fetchDirectorioUncached(): Promise<DirectorioEntry[]> {
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${SHEET_NAME}!A2:K`,
  });
  return (res.data.values || []).filter((r) => r[0]).map(rowToEntry);
}

// Caché corta: a diferencia del snapshot principal, esto se invalida de
// inmediato tras cada escritura (ver invalidateDirectorioCache) para que el
// admin vea su propio cambio sin esperar.
let cached: { data: DirectorioEntry[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getDirectorio(): Promise<DirectorioEntry[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await fetchDirectorioUncached();
  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export async function saveDirectorioEntry(entry: DirectorioEntry): Promise<void> {
  if (!entry.identTrabajador.trim()) throw new Error('Falta la identificación del trabajador.');
  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A:A`,
  });
  const ids = (existing.data.values || []).map((r) => String(r[0] ?? '').trim());
  const rowIdx = ids.indexOf(entry.identTrabajador.trim());
  const values = [entryToRow(entry)];

  if (rowIdx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A${rowIdx + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
  cached = null;
}
