import { google } from 'googleapis';
import { unstable_cache } from 'next/cache';

const SHEET_RANGE = 'Datos_Actuales!A:DY';

export type ServiceRow = {
  id: string;
  proyecto: string;
  gestor: string;
  cargoGestor: string;
  estado: string;
  ciudad: string;
  direccion: string;
  nombreTrabajador: string;
  identTrabajador: string;
  placa: string;
  razonCancelacion: string;
  descCancelacion: string;
  diaSolicitud: number | null;
  anioSolicitud: number | null;
  mesSolicitud: string;
  fechaSolicitud: string;
  horaServicio: string;
  fechaCreacion: string;
  horaCreacion: string;
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

export type SheetsSnapshot = {
  rows: ServiceRow[];
  // Hora real de la última sincronización exitosa con Quick (la escribe la
  // automatización en Resumen!B1) — distinta de "cuándo se renderizó esta
  // página". Null si nunca ha corrido o la celda está vacía.
  lastSyncedAt: string | null;
};

async function fetchSnapshotUncached(): Promise<SheetsSnapshot> {
  const spreadsheetId = process.env.MONITOREO_SHEET_ID;
  if (!spreadsheetId) throw new Error('Falta MONITOREO_SHEET_ID en las variables de entorno.');

  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    // H1 (no B1: esa es parte de la celda combinada del título y nunca se
    // puede leer de vuelta) — ver automation/lib/sheets.mjs.
    ranges: [SHEET_RANGE, 'Resumen!H1'],
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const [dataRange, syncRange] = res.data.valueRanges || [];
  const lastSyncedAt = String(syncRange?.values?.[0]?.[0] || '') || null;

  const values = dataRange?.values || [];
  if (values.length < 2) return { rows: [], lastSyncedAt };
  const headers = values[0] as string[];
  const idx = (name: string) => headers.indexOf(name);

  const COLS = {
    id: idx('ID Servicio'),
    proyecto: idx('PROYECTO'),
    gestor: idx('GESTOR'),
    cargoGestor: idx('CARGO GESTOR'),
    estado: idx('Estado'),
    ciudad: idx('Ciudad'),
    direccion: idx('Dirección de Origen'),
    nombreTrabajador: idx('Nombre Trabajador'),
    identTrabajador: idx('Ident. Trabajador'),
    placa: idx('Placa'),
    razonCancelacion: idx('Razon de Cancelacion'),
    descCancelacion: idx('Descripcion de Cancelacion'),
    diaSolicitud: idx('DÍA SOLICITUD'),
    anioSolicitud: idx('AÑO SOLICITUD'),
    mesSolicitud: idx('MES SOLICITUD'),
    fechaSolicitud: idx('FECHA SOLICITUD'),
    horaServicio: idx('HORA DE SERVICIO'),
    fechaCreacion: idx('FECHA CREACIÓN'),
    horaCreacion: idx('HORA DE CREACIÓN'),
  };

  const get = (row: unknown[], i: number) => (i >= 0 && i < row.length ? row[i] : '');

  const rows = (values.slice(1) as unknown[][])
    .map((row) => ({
      id: String(get(row, COLS.id)),
      proyecto: String(get(row, COLS.proyecto) || 'SIN PROYECTO'),
      gestor: String(get(row, COLS.gestor) || 'SIN GESTOR'),
      cargoGestor: String(get(row, COLS.cargoGestor) || ''),
      estado: String(get(row, COLS.estado) || 'Sin estado'),
      ciudad: String(get(row, COLS.ciudad) || 'SIN CIUDAD'),
      direccion: String(get(row, COLS.direccion) || ''),
      nombreTrabajador: String(get(row, COLS.nombreTrabajador) || '').trim(),
      identTrabajador: String(get(row, COLS.identTrabajador) || '').trim(),
      placa: String(get(row, COLS.placa) || '').trim(),
      razonCancelacion: String(get(row, COLS.razonCancelacion) || ''),
      descCancelacion: String(get(row, COLS.descCancelacion) || ''),
      diaSolicitud: Number(get(row, COLS.diaSolicitud)) || null,
      anioSolicitud: Number(get(row, COLS.anioSolicitud)) || null,
      mesSolicitud: String(get(row, COLS.mesSolicitud) || ''),
      fechaSolicitud: String(get(row, COLS.fechaSolicitud) || ''),
      horaServicio: String(get(row, COLS.horaServicio) || ''),
      fechaCreacion: String(get(row, COLS.fechaCreacion) || ''),
      horaCreacion: String(get(row, COLS.horaCreacion) || ''),
    }))
    .filter((r) => r.id);

  return { rows, lastSyncedAt };
}

// Se refresca sola cada 90s: cualquiera que abra el panel ve datos frescos
// sin necesidad de un botón de "actualizar", y sin golpear la API de
// Sheets en cada carga de página.
export const getSheetsSnapshot = unstable_cache(fetchSnapshotUncached, ['service-rows'], {
  revalidate: 90,
});
