import { Loader2 } from 'lucide-react';

export default function PageLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
      <Loader2 size={26} className="animate-spin text-[var(--accent-bright)]" />
      <p className="text-sm font-semibold">Cargando…</p>
    </div>
  );
}
