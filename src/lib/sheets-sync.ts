import { google } from 'googleapis';
import { fetchServicesFromDb } from './bi-db';
import { syncIdsToSupabase } from './supabase-sync';

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

// A, B, ..., Z, AA, AB, ... — letra de columna A1 a partir de un índice 0-based.
function colLetter(index: number): string {
  let i = index + 1;
  let s = '';
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
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

  // Solo se necesitan ID Servicio y Estado de lo que ya hay — comparar
  // contra eso decide qué es nuevo/cambió; la fila que se escribe siempre
  // es la que viene de la BD completa, nunca la existente. Leer las 130
  // columnas completas de ~84k filas (como antes) es lo que hacía que la
  // función se pasara del límite de tiempo de Vercel.
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_DATA}!1:1` });
  const existingHeaders = headerRes.data.values?.[0] || [];
  const idColExisting = existingHeaders.indexOf('ID Servicio');
  const stateColExisting = existingHeaders.indexOf('Estado');

  const incomingHeaders = csvRows[0];
  const idColIncoming = incomingHeaders.indexOf('ID Servicio');
  const stateColIncoming = incomingHeaders.indexOf('Estado');
  if (idColIncoming < 0) throw new Error('No se encontró la columna "ID Servicio".');

  const existingById = new Map<string, { rowNumber: number; estado: string }>();
  let sheetIsEmpty = true;
  if (idColExisting >= 0) {
    const idLetter = colLetter(idColExisting);
    const stateLetter = stateColExisting >= 0 ? colLetter(stateColExisting) : null;
    const ranges = [`${SHEET_DATA}!${idLetter}2:${idLetter}`];
    if (stateLetter) ranges.push(`${SHEET_DATA}!${stateLetter}2:${stateLetter}`);
    const idStateRes = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
    const idRows = idStateRes.data.valueRanges?.[0]?.values || [];
    const stateRows = stateLetter ? idStateRes.data.valueRanges?.[1]?.values || [] : [];
    sheetIsEmpty = idRows.length === 0;
    for (let r = 0; r < idRows.length; r += 1) {
      const id = idRows[r]?.[0];
      if (id) existingById.set(String(id), { rowNumber: r + 2, estado: String(stateRows[r]?.[0] ?? '') });
    }
  }

  const now = new Date().toISOString();
  const newRows: string[][] = [];
  const updates: { rowNumber: number; values: string[] }[] = [];
  const historyRows: string[][] = [];
  const affectedIds: string[] = [];

  for (let r = 1; r < csvRows.length; r += 1) {
    const row = csvRows[r];
    const id = row[idColIncoming];
    if (!id) continue;
    const newState = stateColIncoming >= 0 ? row[stateColIncoming] : '';
    const found = existingById.get(String(id));

    if (!found) {
      newRows.push(row);
      historyRows.push([now, id, '(nuevo)', newState, 'Panel (manual)', 'OK']);
      affectedIds.push(String(id));
    } else if (stateColExisting >= 0 && found.estado !== String(newState)) {
      updates.push({ rowNumber: found.rowNumber, values: row });
      historyRows.push([now, id, found.estado, newState, 'Panel (manual)', 'OK']);
      affectedIds.push(String(id));
    }
  }

  if (sheetIsEmpty) {
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

  // El panel ya lee de Supabase, no del Sheet — sin este paso, el botón
  // "Actualizar ahora" escribiría en el Sheet pero no se vería ningún
  // cambio en pantalla.
  if (affectedIds.length) {
    await syncIdsToSupabase(affectedIds);
  }

  return { nuevos: newRows.length, actualizados: updates.length, total: csvRows.length - 1 };
}
