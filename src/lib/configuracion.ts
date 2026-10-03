import { google } from 'googleapis';
import { defaultRangoConfig, RANGO_MAX_DIAS, type RangoConfig } from './configuracion-types';

export type { RangoConfig } from './configuracion-types';
export { defaultRangoConfig } from './configuracion-types';

const SHEET_NAME = 'Configuracion';
const LABEL_ATRAS = 'Días hacia atrás';
const LABEL_ADELANTE = 'Días hacia adelante';

export type ConfigRow = { parametro: string; valor: string };

// Igual que directorio.ts: mismo service account, pero con scope de
// escritura completo en vez del readonly que usa sheets.ts.
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

export async function getConfiguracionRows(): Promise<ConfigRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${SHEET_NAME}!A2:B`,
  });
  return (res.data.values || [])
    .filter((r) => r[0])
    .map((r) => ({ parametro: String(r[0]), valor: String(r[1] ?? '') }));
}

export async function getRangoConfig(): Promise<RangoConfig> {
  const rows = await getConfiguracionRows();
  const find = (label: string) => {
    const row = rows.find((r) => r.parametro === label);
    const n = row ? Number(row.valor) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const def = defaultRangoConfig();
  const atras = find(LABEL_ATRAS);
  const adelante = find(LABEL_ADELANTE);
  return {
    diasAtras: atras !== null && atras >= 0 && atras <= RANGO_MAX_DIAS ? atras : def.diasAtras,
    diasAdelante: adelante !== null && adelante >= 0 && adelante <= RANGO_MAX_DIAS ? adelante : def.diasAdelante,
  };
}

export async function saveRangoConfig(rango: RangoConfig): Promise<void> {
  if (rango.diasAtras < 0 || rango.diasAtras > RANGO_MAX_DIAS) throw new Error(`"Días hacia atrás" debe estar entre 0 y ${RANGO_MAX_DIAS}.`);
  if (rango.diasAdelante < 0 || rango.diasAdelante > RANGO_MAX_DIAS)
    throw new Error(`"Días hacia adelante" debe estar entre 0 y ${RANGO_MAX_DIAS}.`);

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth: getWriteAuth() });

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!A:A` });
  const col = (res.data.values || []).map((r) => String(r[0] ?? ''));

  async function setRow(label: string, value: number) {
    const idx = col.indexOf(label);
    if (idx === -1) {
      // No debería pasar (las filas ya existen), pero por seguridad se
      // agrega al final en vez de fallar silenciosamente.
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [[label, value]] },
      });
      col.push(label);
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!B${idx + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[value]] },
      });
    }
  }

  await setRow(LABEL_ATRAS, rango.diasAtras);
  await setRow(LABEL_ADELANTE, rango.diasAdelante);
}
