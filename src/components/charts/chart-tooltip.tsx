'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type TooltipState = { x: number; y: number; lines: string[] } | null;

export function useChartTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const show = useCallback((e: { clientX: number; clientY: number }, lines: string[]) => {
    setTooltip({ x: e.clientX, y: e.clientY, lines });
  }, []);

  const hide = useCallback(() => setTooltip(null), []);

  return { tooltip, show, hide };
}

// Portal a document.body: un tooltip "fixed" normal queda mal posicionado en
// cuanto CUALQUIER ancestro tiene transform/filter (ej. el hover-lift de
// .panel-card, o un bar con hover:brightness) — eso cambia su "containing
// block" y deja de ser relativo al viewport. El portal lo saca por completo
// del árbol de ancestros del gráfico, así siempre queda pegado al cursor.
export function ChartTooltip({ tooltip }: { tooltip: TooltipState }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!tooltip || !mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[70] max-w-[220px] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-[11px] font-semibold shadow-xl"
      style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
    >
      {tooltip.lines.map((l, i) => (
        <div key={i} className={i === 0 ? 'mb-0.5 text-[var(--accent-bright)]' : 'text-[var(--text)]'}>
          {l}
        </div>
      ))}
    </div>,
    document.body
  );
}
