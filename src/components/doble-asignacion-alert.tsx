'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import type { DobleAsignacion } from '@/lib/aggregate';
import ServiceDetailPanel from './service-detail-panel';

export default function DobleAsignacionAlert({ items }: { items: DobleAsignacion[] }) {
  const [selectedRow, setSelectedRow] = useState<ServiceRow | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-red-900/40 bg-red-950/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-red-300">
        <AlertTriangle size={16} className="flex-none" />
        {items.length} mensajero{items.length === 1 ? '' : 's'} con asignación el mismo día en 2+ proyectos a la vez — un mensajero solo
        puede hacer un turno diario (salvo medios turnos). Revisar y validar ya.
      </div>
      <ul className="space-y-1.5 text-xs text-red-300/90">
        {items.map((d) => (
          <li key={`${d.identTrabajador}|${d.fechaSolicitud}`}>
            <b>{d.nombreTrabajador}</b> — {d.fechaSolicitud} — {d.proyectos.join(' + ')}:{' '}
            {d.rows.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ', '}
                <button onClick={() => setSelectedRow(r)} className="font-semibold underline hover:text-red-200">
                  #{r.id}
                </button>
              </span>
            ))}
          </li>
        ))}
      </ul>
      <ServiceDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}
