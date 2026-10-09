import type { ServiceRow } from './sheets';

export type DateFilterMode = 'day' | 'month' | 'range';

export type DateFilter = {
  mode: DateFilterMode;
  year: number;
  month: number; // 1-12
  day: number; // 'day': el día exacto. 'range': inicio del rango.
  // Solo relevantes en modo 'range' — fin del rango (inclusive).
  endYear?: number;
  endMonth?: number;
  endDay?: number;
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
export function parseFechaSolicitud(fecha: string): { year: number; month: number; day: number } | null {
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
  const modeParam = searchParams.mode;
  const mode: DateFilterMode = modeParam === 'month' ? 'month' : modeParam === 'range' ? 'range' : 'day';
  const year = Number(searchParams.year) || today.year;
  const month = Number(searchParams.month) || today.month;
  const day = Number(searchParams.day) || today.day;
  if (mode === 'range') {
    const endYear = Number(searchParams.endYear) || year;
    const endMonth = Number(searchParams.endMonth) || month;
    const endDay = Number(searchParams.endDay) || day;
    return { mode, year, month, day, endYear, endMonth, endDay };
  }
  return { mode, year, month, day };
}

export type SimpleDate = { year: number; month: number; day: number };

// Para comparar fechas simples (sin hora) de forma segura con aritmética de
// calendario UTC — evita sorpresas de huso horario al restar directamente.
export function daysBetween(a: SimpleDate, b: SimpleDate): number {
  const da = Date.UTC(a.year, a.month - 1, a.day);
  const db = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((db - da) / 86400000);
}

// Entero comparable "AAAAMMDD" — suficiente para ordenar/comparar un rango
// sin pasar por Date (evita cualquier lío de huso horario).
function dateKey(d: SimpleDate): number {
  return d.year * 10000 + d.month * 100 + d.day;
}

export function isToday(filter: DateFilter): boolean {
  const today = bogotaToday();
  return filter.mode === 'day' && filter.year === today.year && filter.month === today.month && filter.day === today.day;
}

export function filterRowsByDate(rows: ServiceRow[], filter: DateFilter): ServiceRow[] {
  if (filter.mode === 'range') {
    const startKey = dateKey({ year: filter.year, month: filter.month, day: filter.day });
    const endKey = dateKey({
      year: filter.endYear ?? filter.year,
      month: filter.endMonth ?? filter.month,
      day: filter.endDay ?? filter.day,
    });
    const lo = Math.min(startKey, endKey);
    const hi = Math.max(startKey, endKey);
    return rows.filter((r) => {
      const f = parseFechaSolicitud(r.fechaSolicitud);
      if (!f) return false;
      const k = dateKey(f);
      return k >= lo && k <= hi;
    });
  }
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
  if (filter.mode === 'range') {
    const endYear = filter.endYear ?? filter.year;
    const endMonth = filter.endMonth ?? filter.month;
    const endDay = filter.endDay ?? filter.day;
    if (filter.year === endYear && filter.month === endMonth) {
      return `${filter.day} al ${endDay} de ${MONTH_NAMES[filter.month - 1]} de ${filter.year}`;
    }
    return `${filter.day}/${filter.month}/${filter.year} al ${endDay}/${endMonth}/${endYear}`;
  }
  return `${filter.day} de ${MONTH_NAMES[filter.month - 1]} de ${filter.year}`;
}

// Vercel corre el servidor en UTC: sin forzar timeZone, toLocaleString muestra
// la hora UTC cruda (5 horas adelante de Bogotá) en vez de la hora local real.
export function formatBogotaDateTime(date: Date | string | number): string {
  return new Date(date).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  });
}

export function formatBogotaDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
}

export function formatBogotaTime(date: Date | string | number): string {
  return new Date(date).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });
}
