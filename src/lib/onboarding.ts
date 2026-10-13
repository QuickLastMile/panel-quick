import { google } from 'googleapis';

const SHEET_RANGE = 'DATA!A:S';

export type VinculacionRow = {
  workerId: string;
  nombreCompleto: string;
  // "D/M/AAAA", igual formato que FECHA SOLICITUD en el Sheet de monitoreo.
  fechaVinculacion: string;
  identificacion: string;
  tipoIdentificacion: string;
  telefono: string;
  fechaNacimiento: string;
  estadoWorker: string;
  ciudad: string;
  vehiculo: string;
  // Supervisor que hizo la vinculación (columna "AGILIZADOR" del Sheet).
  agilizador: string;
};

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON en las variables de entorno.');
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

// El Sheet de Onboarding guarda algunos nombres con tildes como UTF-8
// reinterpretado por error como Latin-1 (ej. "PeÃ±a" en vez de "Peña") —
// típico de un pegado/import con la codificación equivocada. Se revierte
// solo si se detecta el patrón ("Ã"/"Â"), así nunca toca texto que ya esté
// bien escrito.
function fixMojibake(value: string): string {
  if (!value || (!value.includes('Ã') && !value.includes('Â'))) return value;
  try {
    const fixed = Buffer.from(value, 'latin1').toString('utf8');
    return fixed.includes('�') ? value : fixed;
  } catch {
    return value;
  }
}

export type OnboardingSnapshot = {
  rows: VinculacionRow[];
};

async function fetchOnboardingUncached(): Promise<OnboardingSnapshot> {
  const spreadsheetId = process.env.ONBOARDING_SHEET_ID;
  if (!spreadsheetId) throw new Error('Falta ONBOARDING_SHEET_ID en las variables de entorno.');

  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGE,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const values = res.data.values || [];
  if (values.length < 2) return { rows: [] };
  const headers = values[0] as string[];
  const idx = (name: string) => headers.indexOf(name);
  // "CIUDAD" y "VEHICULO" aparecen dos veces (una con código numérico, otra
  // ya limpia) — se usa la última ocurrencia, que es la versión limpia (Q/R).
  const lastIdx = (name: string) => headers.lastIndexOf(name);

  const COLS = {
    workerId: idx('WORKER ID'),
    nombreCompleto: idx('NOMBRE COMPLETO'),
    fechaVinculacion: idx('FECHA VINCULACION'),
    identificacion: idx('IDENTIFICACIÓN'),
    tipoIdentificacion: idx('TIPO IDENTIFICACIÓN'),
    telefono: idx('NUMERO DE TELEFONO'),
    fechaNacimiento: idx('FECHA DE NACIMIENTO'),
    estadoWorker: idx('ESTADO DEL WORKER'),
    ciudad: lastIdx('CIUDAD'),
    vehiculo: lastIdx('VEHICULO'),
    agilizador: idx('AGILIZADOR'),
  };

  const get = (row: unknown[], i: number) => (i >= 0 && i < row.length ? row[i] : '');

  const rows = (values.slice(1) as unknown[][])
    .map((row) => ({
      workerId: String(get(row, COLS.workerId) || ''),
      nombreCompleto: fixMojibake(String(get(row, COLS.nombreCompleto) || '').trim()),
      fechaVinculacion: String(get(row, COLS.fechaVinculacion) || ''),
      identificacion: String(get(row, COLS.identificacion) || ''),
      tipoIdentificacion: String(get(row, COLS.tipoIdentificacion) || ''),
      telefono: String(get(row, COLS.telefono) || ''),
      fechaNacimiento: String(get(row, COLS.fechaNacimiento) || ''),
      estadoWorker: String(get(row, COLS.estadoWorker) || ''),
      ciudad: fixMojibake(String(get(row, COLS.ciudad) || '').trim()),
      vehiculo: fixMojibake(String(get(row, COLS.vehiculo) || '').trim()),
      agilizador: fixMojibake(String(get(row, COLS.agilizador) || '').trim()),
    }))
    .filter((r) => r.workerId || r.nombreCompleto);

  return { rows };
}

// Mismo patrón de cache en memoria del proceso que sheets.ts — la
// supervisora actualiza este Sheet a diario, no hace falta releerlo en
// cada request.
let cached: { data: OnboardingSnapshot; expiresAt: number } | null = null;
const CACHE_TTL_MS = 180_000;

export async function getOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await fetchOnboardingUncached();
  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
