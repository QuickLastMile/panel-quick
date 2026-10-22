import { getSheetsSnapshot } from '@/lib/sheets';
import { getDirectorio } from '@/lib/directorio';
import { isSinClasificar, listProyectos, listCiudades } from '@/lib/aggregate';
import { formatBogotaDateTime } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DirectorioClient from './directorio-client';

const TERMINAL = new Set(['Finalizado', 'Cancelado', 'Finalizado Cancelado']);

// Ver dashboard/page.tsx: getSheetsSnapshot() puede tardar 25-30s con la
// tabla actual — sin esto, Vercel corta la función y la página queda vacía.
export const maxDuration = 60;

export default async function DirectorioPage() {
  const role = await requireRole(['admin', 'supervisor']);
  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const directorio = await getDirectorio();
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  // Nombre más reciente visto por cada Ident. Trabajador en los datos reales,
  // y moda de ciudad/tipo de vehículo — para mostrarlos en Novedades sin
  // tener que ir a buscarlos servicio por servicio.
  const seenNames = new Map<string, string>();
  const ciudadCounts = new Map<string, Map<string, number>>();
  const vehiculoCounts = new Map<string, Map<string, number>>();
  allRows.forEach((r) => {
    if (!r.identTrabajador) return;
    seenNames.set(r.identTrabajador, r.nombreTrabajador || seenNames.get(r.identTrabajador) || r.identTrabajador);
    if (r.ciudad) {
      if (!ciudadCounts.has(r.identTrabajador)) ciudadCounts.set(r.identTrabajador, new Map());
      const m = ciudadCounts.get(r.identTrabajador)!;
      m.set(r.ciudad, (m.get(r.ciudad) || 0) + 1);
    }
    if (r.tipoVehiculo) {
      if (!vehiculoCounts.has(r.identTrabajador)) vehiculoCounts.set(r.identTrabajador, new Map());
      const m = vehiculoCounts.get(r.identTrabajador)!;
      m.set(r.tipoVehiculo, (m.get(r.tipoVehiculo) || 0) + 1);
    }
  });
  function moda(counts: Map<string, number> | undefined): string {
    if (!counts) return '';
    let best = '';
    let bestCount = 0;
    for (const [k, v] of counts) {
      if (v > bestCount) {
        best = k;
        bestCount = v;
      }
    }
    return best;
  }

  // El directorio NO es un roster de todo mensajero que haya pasado por acá
  // (con tanta rotación tipo DiDi/Picap, eso sería una lista gigante e
  // inútil) — solo se listan los que tienen algo que registrar: vetados,
  // contratados fijos, o con alguna novedad anotada.
  const entries = directorio
    .filter((e) => e.vetado || e.contratadoFijo || e.notas.trim() !== '')
    .map((e) => ({
      ...e,
      nombreTrabajador: e.nombreTrabajador || seenNames.get(e.identTrabajador) || e.identTrabajador,
      // Manual (escrito en Novedades) gana sobre lo calculado del
      // historial de servicios — para los casos sin servicios recientes
      // donde no hay nada que calcular (ver conversación: solo hay
      // servicios desde septiembre 2026, varios vetados son de antes).
      ciudad: e.ciudadManual || moda(ciudadCounts.get(e.identTrabajador)),
      tipoVehiculo: e.tipoVehiculoManual || moda(vehiculoCounts.get(e.identTrabajador)),
    }))
    .sort((a, b) => a.nombreTrabajador.localeCompare(b.nombreTrabajador, 'es'));

  // Asignaciones activas (no cerradas) — para detectar mensajeros marcados
  // "contratado fijo" en un proyecto que igual aparecen trabajando en otro.
  const activeAssignments = allRows
    .filter((r) => r.identTrabajador && !isSinClasificar(r.proyecto) && !TERMINAL.has(r.estado))
    .map((r) => ({
      identTrabajador: r.identTrabajador,
      proyecto: r.proyecto,
      id: r.id,
      estado: r.estado,
      fechaHoraAsignado: r.fechaHoraAsignado,
      fechaSolicitud: r.fechaSolicitud,
    }));
  const proyectos = listProyectos(allRows);
  const ciudades = listCiudades(allRows);

  return (
    <div>
      <PageHeader
        eyebrow="Mensajeros"
        title="Novedades de"
        accent="mensajeros"
        asOf={`Última sincronización: ${syncLabel} · ${entries.length.toLocaleString('es-CO')} registrados`}
      />
      <DirectorioClient
        entries={entries}
        activeAssignments={activeAssignments}
        proyectos={proyectos}
        ciudades={ciudades}
        canEdit={role === 'admin'}
      />
    </div>
  );
}
