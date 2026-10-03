'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    // Se bloquean html Y body: según el layout, el scroll real puede estar
    // en cualquiera de los dos — bloquear solo uno dejaba la página de
    // fondo desplazarse igual mientras el modal (fixed) quedaba quieto,
    // dando la sensación de "todo negro" al perder de vista su contenido.
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [expanded]);

  function Header({ inModal }: { inModal: boolean }) {
    return (
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-none items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
          aria-label={inModal ? 'Cerrar vista ampliada' : 'Ampliar gráfica'}
        >
          {inModal ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          {inModal ? 'Cerrar' : 'Ampliar'}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`panel-card rounded-xl p-5 ${className || ''}`}>
        <Header inModal={false} />
        <div className="mt-3">{children}</div>
      </div>

      {expanded &&
        mounted &&
        createPortal(
          <>
            {/* Portal a document.body: igual que el tooltip, "fixed" deja de
                ser relativo al viewport en cuanto cualquier ancestro (ej.
                hover-lift de .panel-card) tiene transform — por eso el modal
                "Ampliar" se veía negro/roto al hacer scroll. */}
            <div
              className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />
            <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-2xl md:inset-10">
              <Header inModal />
              <div className="mt-3 flex-1 overflow-auto">{children}</div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
