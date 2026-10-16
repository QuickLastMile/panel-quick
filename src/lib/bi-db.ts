// Mismo transformador que automation/lib/bi-db.mjs — se duplica acá (en
// vez de compartir el archivo entre los dos proyectos) porque panel-quick
// es un proyecto Next.js/TypeScript separado con su propio deploy; si se
// toca la lógica de mapeo, hay que actualizar ambos lados.
import { Client } from 'pg';

const DATABASE = 'bi_smart';
const TABLE = 'services_report_all';

const SHEET_HEADERS = [
  'ID Servicio', 'ID Servicio Padre', 'Valor Declarado', 'Ida y Vuelta', 'Programado',
  'Total (Km)', 'Duracion Aproximada', 'Número de orden', 'Proveedor Tarifa', 'Intermediario',
  'Ids Cotización del tercero', 'Precio Total', 'Ganancias', 'Digitalización', 'Fecha de solicitud',
  'Fecha de creación', 'ID Empresa', 'Ciudad', 'Zona', 'Servicio',
  'Tipo de Servicio', 'Nombre', 'Tipo de documento', 'N. Identificación', 'Dirección',
  'Teléfono', 'Email', 'Nombre Trabajador', 'Proveedor Quicker', 'Tipologia Trabajador',
  'Ident. Trabajador', 'Empresa', 'Centro de costos', 'Placa', 'Cantidad Paradas',
  'Estado', 'Método de Pago', 'Origen', 'Dirección de Origen', 'Periodo de Facturación',
  'Fecha Hora Asignado', 'Tiempo Asignación', 'Fecha Hora Llegada Primera Parada', 'Trayecto Primera Parada', 'Tiempo Primera Parada',
  'Fecha Hora Salida Primera Parada', 'Tiempo Salida Primera Parada', 'Fecha Hora Llegada Segunda Parada', 'Tiempo Llegada Segunda Parada', 'Fecha Hora Salida Segunda Parada',
  'Tiempo Salida Segunda Parada', 'Tiempo Llegada Tercera Parada', 'Tiempo Salida Tercera Parada', 'Fecha Hora Finalizacion Servicio', 'Tiempo Finalizacion',
  'Fecha/Hora Cancelación', 'Descripcion', 'Novedades', 'Minutos Tiempo Asignado', 'Minutos Tiempo Primera Parada',
  'Minutos Tiempo Salida Primera Parada', 'Minutos Tiempo Llegada Segunda Parada', 'Minutos Tiempo Salida Segunda Parada', 'Minutos Llegada Tercera Parada', 'Minutos Salida Tercera Parada',
  'Minutos Tiempo Finalización', 'Tiempo entrega', 'Manifiesto', 'Remesa', 'Solicitud Transporte',
  'Razon de Cancelacion', 'Descripcion de Cancelacion', 'Nombre Responsable', 'Correo Responsable', 'Perfil Responsable',
  'Factrua OCRM', 'Numero Factura', 'Business Developer Manager', 'Business Developer Manager Email', 'Key Account Manager',
  'Key Account Manager Email', 'stops_text', 'services_lines_name', 'its_paid', 'pay_number',
  'its_billed', 'bill_number', 'accomplished', 'approved', 'Invoicing status',
  'payment_date', 'paying_user', 'billing_date', 'billing_user', 'Usuario Creación',
  'Usuario Asignación', 'Usuario En_Transito', 'Usuario Finalización', 'Usuario Cancelación', 'Worker advance percentage',
  'Worker remaining percentage', 'Owner name', 'Owner document', 'Owner advance percentage', 'Owner remaining percentage',
  'Keeper name', 'Keeper document', 'Keeper advance percentage', 'Keeper remaining percentage', 'pais del servicio',
] as const;

const DB_COLUMN_BY_SHEET_HEADER: Record<string, string | null> = {
  'ID Servicio': 'ID Servicio',
  'ID Servicio Padre': 'ID Servicio Padre',
  'Valor Declarado': 'Valor Declarado',
  'Ida y Vuelta': 'Ida y Vuelta',
  'Programado': 'Programado',
  'Total (Km)': 'Total (Km)',
  'Duracion Aproximada': 'Duracion Aproximada',
  'Número de orden': 'Número de orden',
  'Proveedor Tarifa': 'Proveedor Tarifa',
  'Intermediario': 'Intermediario',
  'Ids Cotización del tercero': 'Ids Cotización del tercero',
  'Precio Total': 'Precio Total',
  'Ganancias': 'Ganancias',
  'Digitalización': 'Digitalización',
  'Fecha de solicitud': 'Fecha de solicitud',
  'Fecha de creación': 'Fecha de creación',
  'ID Empresa': 'ID Empresa',
  'Ciudad': 'Ciudad',
  'Zona': 'Zona',
  'Servicio': 'Servicio',
  'Tipo de Servicio': 'Tipo de Servicio',
  'Nombre': 'Nombre',
  'Tipo de documento': 'Tipo de documento',
  'N. Identificación': 'N. Identificación',
  'Dirección': 'Dirección',
  'Teléfono': 'Teléfono',
  'Email': 'Email',
  'Nombre Trabajador': 'Nombre Trabajador',
  'Proveedor Quicker': 'Proveedor Quicker',
  'Tipologia Trabajador': 'Tipologia Trabajador',
  'Ident. Trabajador': 'Ident. Trabajador',
  'Empresa': 'Empresa',
  'Centro de costos': 'Centro de costos',
  'Placa': 'Placa',
  'Cantidad Paradas': 'Cantidad Paradas',
  'Estado': 'Estado',
  'Método de Pago': 'Método de Pago',
  'Origen': 'Origen',
  'Dirección de Origen': 'Dirección de Origen',
  'Periodo de Facturación': 'Periodo de Facturación',
  'Fecha Hora Asignado': 'Fecha Hora Asignado',
  'Tiempo Asignación': 'Tiempo Asignación',
  'Fecha Hora Llegada Primera Parada': 'Fecha Hora Llegada Primera Parada',
  'Trayecto Primera Parada': 'Trayecto Primera Parada',
  'Tiempo Primera Parada': 'Tiempo Primera Parada',
  'Fecha Hora Salida Primera Parada': 'Fecha Hora Salida Primera Parada',
  'Tiempo Salida Primera Parada': 'Tiempo Salida Primera Parada',
  'Fecha Hora Llegada Segunda Parada': 'Fecha Hora Llegada Segunda Parada',
  'Tiempo Llegada Segunda Parada': 'Tiempo Llegada Segunda Parada',
  'Fecha Hora Salida Segunda Parada': 'Fecha Hora Salida Segunda Parada',
  'Tiempo Salida Segunda Parada': 'Tiempo Salida Segunda Parada',
  'Tiempo Llegada Tercera Parada': 'Tiempo Llegada Tercera Parada',
  'Tiempo Salida Tercera Parada': 'Tiempo Salida Tercera Parada',
  'Fecha Hora Finalizacion Servicio': 'Fecha Hora Finalizacion Servicio',
  'Tiempo Finalizacion': 'Tiempo Finalizacion',
  'Fecha/Hora Cancelación': 'Fecha/Hora Cancelación',
  'Descripcion': 'Descripcion',
  'Novedades': 'Novedades',
  'Minutos Tiempo Asignado': 'Minutos Tiempo Asignado',
  'Minutos Tiempo Primera Parada': 'Minutos Tiempo Primera Parada',
  'Minutos Tiempo Salida Primera Parada': 'Minutos Tiempo Salida Primera Parada',
  'Minutos Tiempo Llegada Segunda Parada': 'Minutos Tiempo Llegada Segunda Parada',
  'Minutos Tiempo Salida Segunda Parada': 'Minutos Tiempo Salida Segunda Parada',
  'Minutos Llegada Tercera Parada': 'Minutos Llegada Tercera Parada',
  'Minutos Salida Tercera Parada': 'Minutos Salida Tercera Parada',
  'Minutos Tiempo Finalización': 'Minutos Tiempo Finalización',
  'Tiempo entrega': 'Tiempo entrega',
  'Manifiesto': 'Manifiesto',
  'Remesa': 'Remesa',
  'Solicitud Transporte': 'Solicitud Transporte',
  'Razon de Cancelacion': 'Razon de Cancelacion',
  'Descripcion de Cancelacion': 'Descripcion de Cancelacion',
  'Nombre Responsable': 'Nombre Responsable',
  'Correo Responsable': 'Correo Responsable',
  'Perfil Responsable': 'Perfil Responsable',
  'Factrua OCRM': 'Factrua OCRM',
  'Numero Factura': 'Numero Factura',
  'Business Developer Manager': 'Business Developer Manager',
  'Business Developer Manager Email': 'Business Developer Manager Email',
  'Key Account Manager': 'Key Account Manager',
  'Key Account Manager Email': 'Key Account Manager Email',
  'stops_text': 'stops_text',
  'services_lines_name': 'services_lines_name',
  'its_paid': 'its_paid',
  'pay_number': 'pay_number',
  'its_billed': 'its_billed',
  'bill_number': 'bill_number',
  'accomplished': 'accomplished',
  'approved': 'approved',
  'Invoicing status': 'Invoicing status',
  'payment_date': 'payment_date',
  'paying_user': 'paying_user',
  'billing_date': 'billing_date',
  'billing_user': 'billing_user',
  'Usuario Creación': 'user_manages_service_1',
  'Usuario Asignación': 'user_manages_service_2',
  'Usuario En_Transito': 'user_manages_service_3',
  'Usuario Finalización': 'user_manages_service_4',
  'Usuario Cancelación': 'user_manages_service_5',
  'Worker advance percentage': null,
  'Worker remaining percentage': null,
  'Owner name': null,
  'Owner document': null,
  'Owner advance percentage': null,
  'Owner remaining percentage': null,
  'Keeper name': null,
  'Keeper document': null,
  'Keeper advance percentage': null,
  'Keeper remaining percentage': null,
  'pais del servicio': null,
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDbValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(value);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  }
  return String(value);
}

function rowToSheetArray(dbRow: Record<string, unknown>): string[] {
  return SHEET_HEADERS.map((header) => {
    const dbCol = DB_COLUMN_BY_SHEET_HEADER[header];
    if (!dbCol) return '';
    return formatDbValue(dbRow[dbCol]);
  });
}

function bogotaToday(offsetDays = 0) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  now.setDate(now.getDate() + offsetDays);
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export async function fetchServicesFromDb({
  startOffsetDays = -4,
  endOffsetDays = 4,
}: { startOffsetDays?: number; endOffsetDays?: number } = {}): Promise<string[][]> {
  const host = process.env.BI_DB_HOST;
  const port = process.env.BI_DB_PORT;
  const user = process.env.BI_DB_USER;
  const password = process.env.BI_DB_PASSWORD;
  if (!host || !port || !user || !password) throw new Error('Faltan las variables BI_DB_* en las variables de entorno.');

  const start = bogotaToday(startOffsetDays);
  const end = bogotaToday(endOffsetDays + 1);

  const client = new Client({
    host,
    port: Number(port),
    user,
    password,
    database: DATABASE,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    query_timeout: 60000,
  });

  try {
    await client.connect();
    const dbColumns = [...new Set(Object.values(DB_COLUMN_BY_SHEET_HEADER).filter((c): c is string => !!c))];
    const selectList = dbColumns.map((c) => `"${c}"`).join(', ');
    const res = await client.query(
      `SELECT ${selectList} FROM public."${TABLE}" ` +
        `WHERE "Fecha de solicitud" >= $1::date AND "Fecha de solicitud" < $2::date ` +
        `ORDER BY "ID Servicio";`,
      [
        `${start.year}-${pad2(start.month)}-${pad2(start.day)}`,
        `${end.year}-${pad2(end.month)}-${pad2(end.day)}`,
      ]
    );
    const dataRows = res.rows.map(rowToSheetArray);
    return [[...SHEET_HEADERS], ...dataRows];
  } finally {
    await client.end();
  }
}
