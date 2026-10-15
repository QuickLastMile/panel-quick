import { google } from 'googleapis';

// La pestaña ONBOARDING ahora vive en el mismo Sheet de monitoreo (antes era
// un archivo aparte) — una sola conexión, un solo service account. Ampliado
// de A:V a A:Z para cubrir las columnas de observación/motivo de
// inactivación que se agregaron después.
const SHEET_RANGE = 'ONBOARDING!A:Z';

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
  // Columnas con fórmulas de cruce contra Datos_Actuales, agregadas por la
  // supervisora — resumen rápido sin tener que ir a buscar el detalle.
  ultimoServicio: string;
  cantFinalizados: number;
  cantFinalizadosNovedad: number;
  totalGestiones: number;
  ultimoEstado: string;
  // Columna "gestión": "SIN GESTIÓN" / "PRIMER SERVICIO NO EFECTIVO" / "GESTIONANDO".
  gestionStatus: string;
  // El agilizador la llena manualmente para los vinculados ACTIVOS que
  // después de vinculados no han prestado ningún servicio.
  observacionNoPrestacion: string;
  // Solo aplica a vinculados en un estado distinto de activo.
  motivoInactivacion: string;
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
  const spreadsheetId = process.env.MONITOREO_SHEET_ID;
  if (!spreadsheetId) throw new Error('Falta MONITOREO_SHEET_ID en las variables de entorno.');

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
  // ya limpia) — se usa la última ocurrencia, que es la versión limpia.
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
    agilizador: lastIdx('AGILIZADOR'),
    ultimoServicio: idx('ULTIMO SERVICIO'),
    cantFinalizados: idx('CANT FINALIZADOS'),
    cantFinalizadosNovedad: idx('CANT FINALIZADOS NOVEDAD'),
    totalGestiones: idx('TOTAL GESTIONES'),
    ultimoEstado: idx('ULTIMO ESTADO'),
    gestionStatus: lastIdx('gestión'),
    observacionNoPrestacion: idx('OBSERVACIÓN DE NO PRESTACIÓN DE SERVICIO'),
    motivoInactivacion: idx('MOTIVO DE INACTIVACIÓN'),
  };

  const get = (row: unknown[], i: number) => (i >= 0 && i < row.length ? row[i] : '');
  const getNum = (row: unknown[], i: number) => {
    const n = Number(get(row, i));
    return Number.isFinite(n) ? n : 0;
  };

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
      ultimoServicio: String(get(row, COLS.ultimoServicio) || ''),
      cantFinalizados: getNum(row, COLS.cantFinalizados),
      cantFinalizadosNovedad: getNum(row, COLS.cantFinalizadosNovedad),
      totalGestiones: getNum(row, COLS.totalGestiones),
      ultimoEstado: String(get(row, COLS.ultimoEstado) || ''),
      gestionStatus: String(get(row, COLS.gestionStatus) || 'SIN GESTIÓN').trim(),
      observacionNoPrestacion: fixMojibake(String(get(row, COLS.observacionNoPrestacion) || '').trim()),
      motivoInactivacion: fixMojibake(String(get(row, COLS.motivoInactivacion) || '').trim()),
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
