import { STATUS_COLOR } from '@/lib/status-colors';
import { normEstado } from '@/lib/aggregate';

export default function StatusPill({ status }: { status: string }) {
  // Normaliza para buscar el color: Quick a veces manda "En Transito" (sin
  // tilde) o "Finalizado Cancelado" — sin esto el pill caía al gris default
  // en vez de mostrar el color real del estado.
  const color = STATUS_COLOR[normEstado(status)] || STATUS_COLOR[status] || '#64748b';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: `${color}2e`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}
