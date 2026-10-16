import { google } from 'googleapis';
import { fetchServicesFromDb } from './bi-db';

// Mismo upsert que automation/lib/sheets.mjs (upsertServiceRows) — se
// duplica acá porque el botón "Actualizar ahora" del panel corre en
// Vercel, no puede invocar el script local de automation/.
const SHEET_DATA = 'Datos_Actuales';
const SHEET_HISTORY = 'Historial_Estados';
const SHEET_SUMMARY = 'Resumen';

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

export type SyncResult = { nuevos: number; actualizados: number; total: number };

export async function syncServicesFromDb({
  startOffsetDays = -4,
  endOffsetDays = 4,
}: { startOffsetDays?: number; endOffsetDays?: number } = {}): Promise<SyncResult> {
  const csvRows = await fetchServicesFromDb({ startOffsetDays, endOffsetDays });
  if (csvRows.length < 2) return { nuevos: 0, actualizados: 0, total: 0 };

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });

  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_DATA}!A:ZZ` });
  const existingValues = existing.data.values || [];
  const existingHeaders = existingValues[0] || [];
  const idColExisting = existingHeaders.indexOf('ID Servicio');
  const stateColExisting = existingHeaders.indexOf('Estado');

  const incomingHeaders = csvRows[0];
  const idColIncoming = incomingHeaders.indexOf('ID Servicio');
  const stateColIncoming = incomingHeaders.indexOf('Estado');
  if (idColIncoming < 0) throw new Error('No se encontró la columna "ID Servicio".');

  const existingById = new Map<string, { rowNumber: number; values: string[] }>();
  for (let r = 1; r < existingValues.length; r += 1) {
    const id = existingValues[r][idColExisting];
    if (id) existingById.set(String(id), { rowNumber: r + 1, values: existingValues[r] });
  }

  const now = new Date().toISOString();
  const newRows: string[][] = [];
  const updates: { rowNumber: number; values: string[] }[] = [];
  const historyRows: string[][] = [];

  for (let r = 1; r < csvRows.length; r += 1) {
    const row = csvRows[r];
    const id = row[idColIncoming];
    if (!id) continue;
    const newState = stateColIncoming >= 0 ? row[stateColIncoming] : '';
    const found = existingById.get(String(id));

    if (!found) {
      newRows.push(row);
      historyRows.push([now, id, '(nuevo)', newState, 'Panel (manual)', 'OK']);
    } else if (stateColExisting >= 0 && String(found.values[stateColExisting]) !== String(newState)) {
      updates.push({ rowNumber: found.rowNumber, values: row });
      historyRows.push([now, id, found.values[stateColExisting], newState, 'Panel (manual)', 'OK']);
    }
  }

  if (existingValues.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_DATA}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [incomingHeaders] },
    });
  }

  const UPDATE_CHUNK_SIZE = 400;
  for (let i = 0; i < updates.length; i += UPDATE_CHUNK_SIZE) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK_SIZE);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: chunk.map((u) => ({ range: `${SHEET_DATA}!A${u.rowNumber}`, values: [u.values] })),
      },
    });
  }

  if (newRows.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_DATA}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: newRows },
    });
  }

  if (historyRows.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_HISTORY}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: historyRows },
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_SUMMARY}!G1:H1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['Última sincronización real', now]] },
  });

  return { nuevos: newRows.length, actualizados: updates.length, total: csvRows.length - 1 };
}
