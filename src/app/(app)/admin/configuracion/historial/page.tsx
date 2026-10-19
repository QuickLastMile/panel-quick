import { requireRole } from '@/lib/session';
import { getModificacionesHistorial } from '@/lib/modificaciones';
import { formatBogotaDate, formatBogotaTime } from '@/lib/date-filter';
import PageHeader from '@/components/page-header';
import ConfigTabs from '@/components/config-tabs';

export default async function HistorialPage() {
  await requireRole(['admin']);

  let errorMsg: string | null = null;
  let entries: Awaited<ReturnType<typeof getModificacionesHistorial>> = [];
  try {
    entries = await getModificacionesHistorial();
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'No se pudo cargar el historial.';
  }

  return (
    <div>
      <PageHeader eyebrow="Configuración" title="Historial de" accent="modificaciones" asOf={`${entries.length.toLocaleString('es-CO')} cambios recientes`} />
      <ConfigTabs />

      {errorMsg && (
        <div className="panel-card mb-5 rounded-xl p-5 text-sm text-red-300">
          No se pudo cargar el historial: {errorMsg}
        </div>
      )}

      <div className="panel-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Fecha', 'Hora', 'Área', 'Quién / Qué', 'Campo', 'Cambio', 'Usuario'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--text-muted)]">
                    Sin modificaciones registradas aún.
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const fecha = new Date(e.creadoEn);
                  return (
                    <tr key={e.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                      <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-[var(--text)]">{formatBogotaDate(fecha)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--text-secondary)]">{formatBogotaTime(fecha)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{e.area}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{e.entidad}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{e.campo}</td>
                      <td className="max-w-[320px] whitespace-normal px-4 py-2.5 text-[var(--text-secondary)]">
                        {e.valorAnterior ? (
                          <>
                            <span className="text-[var(--text-muted)] line-through">{e.valorAnterior}</span>{' '}
                            <span className="text-[var(--text)]">→ {e.valorNuevo}</span>
                          </>
                        ) : (
                          <span className="text-[var(--text)]">{e.valorNuevo}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{e.usuario}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
