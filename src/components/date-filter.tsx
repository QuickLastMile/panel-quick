'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { bogotaToday, isToday, type DateFilter } from '@/lib/date-filter';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

// Suma/resta días en aritmética de calendario pura (UTC), para no
// arrastrar sorpresas de huso horario al cruzar de mes/año.
function addDays(filter: DateFilter, delta: number) {
  const d = new Date(Date.UTC(filter.year, filter.month - 1, filter.day));
  d.setUTCDate(d.getUTCDate() + delta);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export default function DateFilterBar({ filter }: { filter: DateFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(next: Partial<DateFilter>) {
    const merged = { ...filter, ...next };
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', merged.mode);
    params.set('year', String(merged.year));
    params.set('month', String(merged.month));
    params.set('day', String(merged.day));
    router.push(`${pathname}?${params.toString()}`);
  }

  const dayValue = `${filter.year}-${pad2(filter.month)}-${pad2(filter.day)}`;
  const monthValue = `${filter.year}-${pad2(filter.month)}`;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-1">
        <button
          onClick={() => push({ mode: 'day' })}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
            filter.mode === 'day' ? 'bg-blue-700 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Día
        </button>
        <button
          onClick={() => push({ mode: 'month' })}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
            filter.mode === 'month' ? 'bg-blue-700 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Mes
        </button>
      </div>

      {filter.mode === 'day' ? (
        <>
          <button
            onClick={() => push(addDays(filter, -1))}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
            aria-label="Día anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <CalendarDays size={14} className="text-slate-400" />
            <input
              type="date"
              value={dayValue}
              onChange={(e) => {
                const [y, m, d] = e.target.value.split('-').map(Number);
                if (y && m && d) push({ year: y, month: m, day: d, mode: 'day' });
              }}
              className="bg-transparent outline-none"
            />
          </label>
          <button
            onClick={() => push(addDays(filter, 1))}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
            aria-label="Día siguiente"
          >
            <ChevronRight size={15} />
          </button>
        </>
      ) : (
        <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
          <CalendarDays size={14} className="text-slate-400" />
          <input
            type="month"
            value={monthValue}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              if (y && m) push({ year: y, month: m, mode: 'month' });
            }}
            className="bg-transparent outline-none"
          />
        </label>
      )}

      {!isToday(filter) && (
        <button
          onClick={() => {
            const t = bogotaToday();
            push({ mode: 'day', ...t });
          }}
          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
        >
          Volver a hoy
        </button>
      )}
    </div>
  );
}
