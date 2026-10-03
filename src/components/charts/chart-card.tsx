'use client';

import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export default function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}
      <div
        className={
          expanded
            ? 'fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-2xl md:inset-10'
            : `panel-card rounded-xl p-5 ${className || ''}`
        }
      >
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text)]">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex flex-none items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
            aria-label={expanded ? 'Cerrar vista ampliada' : 'Ampliar gráfica'}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {expanded ? 'Cerrar' : 'Ampliar'}
          </button>
        </div>
        <div className={expanded ? 'mt-3 flex-1 overflow-auto' : 'mt-3'}>{children}</div>
      </div>
    </>
  );
}
