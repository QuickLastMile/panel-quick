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
    <div className="panel-card mb-5 flex flex-wrap items-center gap-2 rounded-xl p-2.5">
      <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-sunken)] p-1">
        <button
          onClick={() => push({ mode: 'day' })}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
            filter.mode === 'day'
              ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Día
        </button>
        <button
          onClick={() => push({ mode: 'month' })}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
            filter.mode === 'month'
              ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Mes
        </button>
      </div>

      {filter.mode === 'day' ? (
        <>
          <button
            onClick={() => push(addDays(filter, -1))}
            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            aria-label="Día anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <label className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)]">
            <CalendarDays size={14} className="text-[var(--accent-bright)]" />
            <input
              type="date"
              value={dayValue}
              onChange={(e) => {
                const [y, m, d] = e.target.value.split('-').map(Number);
                if (y && m && d) push({ year: y, month: m, day: d, mode: 'day' });
              }}
              className="bg-transparent outline-none [color-scheme:dark]"
            />
          </label>
          <button
            onClick={() => push(addDays(filter, 1))}
            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            aria-label="Día siguiente"
          >
            <ChevronRight size={15} />
          </button>
        </>
      ) : (
        <label className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)]">
          <CalendarDays size={14} className="text-[var(--accent-bright)]" />
          <input
            type="month"
            value={monthValue}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              if (y && m) push({ year: y, month: m, mode: 'month' });
            }}
            className="bg-transparent outline-none [color-scheme:dark]"
          />
        </label>
      )}

      {!isToday(filter) && (
        <button
          onClick={() => {
            const t = bogotaToday();
            push({ mode: 'day', ...t });
          }}
          className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent-bright)] transition-colors hover:bg-[var(--accent-soft)]/80"
        >
          Volver a hoy
        </button>
      )}
    </div>
  );
}
