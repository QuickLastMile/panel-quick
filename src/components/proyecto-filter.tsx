'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function ProyectoFilter({ proyectos, selected }: { proyectos: string[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!proyectos.length) return null;

  function select(proyecto: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (proyecto) params.set('proyecto', proyecto);
    else params.delete('proyecto');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="mb-5 flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Proyecto</span>
      <select
        value={selected}
        onChange={(e) => select(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
      >
        <option value="">Todos los proyectos</option>
        {proyectos.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </label>
  );
}
