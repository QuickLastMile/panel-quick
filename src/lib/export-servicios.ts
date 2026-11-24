import type { ServiceRow } from './sheets';
import { parseFechaSolicitud } from './date-filter';

type ExportCol = { label: string; width: number; get: (r: ServiceRow) => string | number | Date | null; numFmt?: string };

// Fechas de Quick vienen "D/M/AAAA": se pasan a fecha real para que en
// Excel se puedan ordenar/filtrar como fecha. Si no se puede leer, se deja
// el texto tal cual en vez de perder el dato.
function asDate(v: string): Date | string {
  const f = parseFechaSolicitud(v);
  return f ? new Date(Date.UTC(f.year, f.month - 1, f.day)) : v;
}

// Igual que formatCell en la tabla: "DESCARTAR" es marca interna, no dato.
const txt = (v: string): string => (v === 'DESCARTAR' ? '' : v);

const COLS: ExportCol[] = [
  { label: 'Estado', width: 14, get: (r) => r.estado },
  { label: 'ID servicio', width: 12, get: (r) => r.id },
  { label: 'Proyecto', width: 28, get: (r) => r.proyecto },
  { label: 'Jefatura', width: 18, get: (r) => r.jefatura },
  { label: 'Fecha servicio', width: 13, get: (r) => asDate(r.fechaSolicitud), numFmt: 'dd/mm/yyyy' },
  { label: 'Hora servicio', width: 11, get: (r) => r.horaServicio },
  { label: 'Fecha creación', width: 13, get: (r) => asDate(r.fechaCreacion), numFmt: 'dd/mm/yyyy' },
  { label: 'Hora creación', width: 11, get: (r) => r.horaCreacion },
  { label: 'Ciudad', width: 14, get: (r) => r.ciudad },
  { label: 'Zona', width: 14, get: (r) => r.zona },
  { label: 'Dirección', width: 36, get: (r) => r.direccion },
  { label: 'Servicio', width: 18, get: (r) => r.servicio },
  { label: 'Tipo de servicio', width: 18, get: (r) => r.tipoServicio },
  { label: 'Tipo de vehículo', width: 14, get: (r) => r.tipoVehiculo },
  { label: 'Gestor', width: 26, get: (r) => r.nombreAsignador },
  { label: 'Tipo', width: 20, get: (r) => txt(r.tipoAsignador) },
  { label: 'Fecha/hora asignado', width: 19, get: (r) => r.fechaHoraAsignado },
  { label: 'Minutos asignación', width: 12, get: (r) => r.minutosAsignacion },
  { label: 'Trabajador', width: 26, get: (r) => r.nombreTrabajador },
  { label: 'Ident. trabajador', width: 15, get: (r) => r.identTrabajador },
  { label: 'Placa', width: 9, get: (r) => r.placa },
  { label: 'Motivo cancelación', width: 24, get: (r) => r.razonCancelacion },
  { label: 'Descripción cancelación', width: 30, get: (r) => r.descCancelacion },
  { label: 'Canceló', width: 26, get: (r) => r.nombreCancelador },
  { label: 'Cargo de quien canceló', width: 20, get: (r) => r.tipoCancelacion },
  { label: 'Valor declarado', width: 14, get: (r) => r.valorDeclarado, numFmt: '"$"#,##0' },
  { label: 'Precio total', width: 13, get: (r) => r.precioTotal, numFmt: '"$"#,##0' },
  { label: 'Ganancias', width: 13, get: (r) => r.ganancias, numFmt: '"$"#,##0' },
  { label: 'Email solicitante', width: 26, get: (r) => r.email },
  { label: 'Descripción', width: 36, get: (r) => r.descripcion },
];

// Se importa exceljs solo al hacer clic (pesa ~1 MB) para no cargarlo en
// cada visita a la página.
export async function downloadServiciosExcel(rows: ServiceRow[], fileName: string): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Servicios', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = COLS.map((c) => ({ header: c.label, width: c.width, style: c.numFmt ? { numFmt: c.numFmt } : {} }));
  rows.forEach((r) => ws.addRow(COLS.map((c) => c.get(r) ?? '')));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
