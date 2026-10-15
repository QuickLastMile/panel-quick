import { google } from 'googleapis';

// La hoja BASE es la tabla de referencia que alimenta, por VLOOKUP, las
// columnas PROYECTO/JEFATURA/GESTOR/CARGO GESTOR/TIPO ASIGNADOR de
// Datos_Actuales. Son dos bloques independientes pegados uno al lado del
// otro en la misma hoja:
//   A:D — Email del solicitante -> Proyecto / Jefatura
//   F:L — "ID-Nombre" de quién asignó -> Cargo / Colaborador / Tipo
const SHEET_NAME = 'BASE';
const PROYECTO_RANGE = `${SHEET_NAME}!A2:D`;
const COLABORADOR_RANGE = `${SHEET_NAME}!F2:L`;

export type ProyectoBaseRow = {
  // Fila 1-based dentro del bloque A:D (para poder editarla luego).
  rowNumber: number;
  email: string;
  nombre: string;
  proceso: string;
  jefatura: string;
};

export type ColaboradorBaseRow = {
  rowNumber: number;
  // "ID-Nombre" tal como aparece en "Usuario Asignación" — es la clave.
  colaboradorData: string;
  cargo: string;
  ext: string;
  colaborador: string;
  tipo: string;
};

function getReadAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON en las variables de entorno.');
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

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

export async function getProyectoBaseRows(): Promise<ProyectoBaseRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: getReadAuth() });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range: PROYECTO_RANGE });
  const values = res.data.values || [];
  return values
    .map((r, i) => ({
      rowNumber: i + 2,
      email: String(r[0] || '').trim(),
      nombre: String(r[1] || '').trim(),
      proceso: String(r[2] || '').trim(),
      jefatura: String(r[3] || '').trim(),
    }))
    .filter((r) => r.email);
}

export async function getColaboradorBaseRows(): Promise<ColaboradorBaseRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: getReadAuth() });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range: COLABORADOR_RANGE });
  const values = res.data.values || [];
  return values
    .map((r, i) => ({
      rowNumber: i + 2,
      colaboradorData: String(r[0] || '').trim(),
      cargo: String(r[1] || '').trim(),
      ext: String(r[2] || '').trim(),
      colaborador: String(r[3] || '').trim(),
      tipo: String(r[6] || '').trim(),
    }))
    .filter((r) => r.colaboradorData);
}

export async function saveProyectoBaseRow(row: {
  rowNumber?: number;
  email: string;
  nombre: string;
  proceso: string;
  jefatura: string;
}): Promise<void> {
  const email = row.email.trim();
  if (!email) throw new Error('El email es obligatorio.');
  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });
  const values = [[email, row.nombre.trim(), row.proceso.trim(), row.jefatura.trim()]];

  if (row.rowNumber) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A${row.rowNumber}:D${row.rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    return;
  }

  // Fila nueva: se agrega siempre dentro del bloque A:D, sin pisar las
  // demás columnas de la hoja (F en adelante).
  const existing = await getProyectoBaseRows();
  const nextRow = (existing.at(-1)?.rowNumber ?? 1) + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A${nextRow}:D${nextRow}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

export async function saveColaboradorBaseRow(row: {
  rowNumber?: number;
  colaboradorData: string;
  cargo: string;
  ext: string;
  colaborador: string;
  tipo: string;
}): Promise<void> {
  const colaboradorData = row.colaboradorData.trim();
  if (!colaboradorData) throw new Error('El dato de colaborador ("ID-Nombre") es obligatorio.');
  const cargo = row.cargo.trim();
  const ext = row.ext.trim();
  const colaborador = row.colaborador.trim();
  const tipo = row.tipo.trim();
  // "conca" y "MAYUS" (columnas J y K) son derivadas — las fórmulas de
  // Datos_Actuales las leen directo, así que hay que escribirlas también o
  // el cruce de CARGO GESTOR / GESTOR quedaría en blanco para filas nuevas.
  const conca = `${cargo} ${ext}`.trim();
  const mayus = colaborador.toUpperCase();

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });
  const values = [[colaboradorData, cargo, ext, colaborador, conca, mayus, tipo]];

  if (row.rowNumber) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!F${row.rowNumber}:L${row.rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    return;
  }

  const existing = await getColaboradorBaseRows();
  const nextRow = (existing.at(-1)?.rowNumber ?? 1) + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!F${nextRow}:L${nextRow}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}
