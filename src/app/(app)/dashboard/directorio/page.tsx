import { getSheetsSnapshot } from '@/lib/sheets';
import { getDirectorio, emptyDirectorioEntry } from '@/lib/directorio';
import { isSinClasificar } from '@/lib/aggregate';
import { formatBogotaDateTime } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DirectorioClient from './directorio-client';

const TERMINAL = new Set(['Finalizado', 'Cancelado', 'Finalizado Cancelado']);

export default async function DirectorioPage() {
  const role = await requireRole(['admin', 'supervisor']);
  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const directorio = await getDirectorio();
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  // Nombre más reciente visto por cada Ident. Trabajador en los datos reales.
  const seenNames = new Map<string, string>();
  allRows.forEach((r) => {
    if (r.identTrabajador) seenNames.set(r.identTrabajador, r.nombreTrabajador || seenNames.get(r.identTrabajador) || r.identTrabajador);
  });

  const dirMap = new Map(directorio.map((d) => [d.identTrabajador, d]));
  const allIds = new Set<string>([...seenNames.keys(), ...dirMap.keys()]);

  const entries = Array.from(allIds)
    .map((id) => {
      const existing = dirMap.get(id);
      if (existing) return { ...existing, nombreTrabajador: existing.nombreTrabajador || seenNames.get(id) || id };
      return emptyDirectorioEntry(id, seenNames.get(id) || id);
    })
    .sort((a, b) => a.nombreTrabajador.localeCompare(b.nombreTrabajador, 'es'));

  // Asignaciones activas (no cerradas) — para detectar mensajeros marcados
  // "contratado fijo" en un proyecto que igual aparecen trabajando en otro.
  const activeAssignments = allRows
    .filter((r) => r.identTrabajador && !isSinClasificar(r.proyecto) && !TERMINAL.has(r.estado))
    .map((r) => ({ identTrabajador: r.identTrabajador, proyecto: r.proyecto, id: r.id, estado: r.estado }));

  return (
    <div>
      <PageHeader
        eyebrow="Mensajeros"
        title="Directorio de"
        accent="trabajadores"
        asOf={`Última sincronización: ${syncLabel} · ${entries.length.toLocaleString('es-CO')} mensajeros`}
      />
      <DirectorioClient entries={entries} activeAssignments={activeAssignments} canEdit={role === 'admin'} />
    </div>
  );
}
