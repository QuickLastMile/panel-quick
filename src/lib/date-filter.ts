import type { ServiceRow } from './sheets';

export type DateFilterMode = 'day' | 'month';

export type DateFilter = {
  mode: DateFilterMode;
  year: number;
  month: number; // 1-12
  day: number; // solo relevante en modo 'day'
};

// "Hoy" en hora de Bogotá, calculado en el servidor (Vercel corre en UTC).
export function bogotaToday(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

// FECHA SOLICITUD viene de Quick como "D/M/AAAA" (sin ceros a la izquierda).
function parseFechaSolicitud(fecha: string): { year: number; month: number; day: number } | null {
  const parts = fecha.split('/');
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  return { year, month, day };
}

// Lee el filtro desde los searchParams de la URL; por defecto, hoy (modo día).
export function parseDateFilterParams(searchParams: Record<string, string | string[] | undefined>): DateFilter {
  const today = bogotaToday();
  const mode = searchParams.mode === 'month' ? 'month' : 'day';
  const year = Number(searchParams.year) || today.year;
  const month = Number(searchParams.month) || today.month;
  const day = Number(searchParams.day) || today.day;
  return { mode, year, month, day };
}

export function isToday(filter: DateFilter): boolean {
  const today = bogotaToday();
  return filter.mode === 'day' && filter.year === today.year && filter.month === today.month && filter.day === today.day;
}

export function filterRowsByDate(rows: ServiceRow[], filter: DateFilter): ServiceRow[] {
  return rows.filter((r) => {
    const f = parseFechaSolicitud(r.fechaSolicitud);
    if (!f) return false;
    if (f.year !== filter.year || f.month !== filter.month) return false;
    if (filter.mode === 'day' && f.day !== filter.day) return false;
    return true;
  });
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function formatDateFilterLabel(filter: DateFilter): string {
  if (filter.mode === 'month') return `${MONTH_NAMES[filter.month - 1]} ${filter.year}`;
  return `${filter.day} de ${MONTH_NAMES[filter.month - 1]} de ${filter.year}`;
}
