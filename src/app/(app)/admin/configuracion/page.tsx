import { getSheetsSnapshot } from '@/lib/sheets';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';

const ROWS: [string, string][] = [
  ['Tipo de reporte', 'Servicios'],
  ['Línea de negocio', 'Logística Última Milla'],
  ['País', 'Todos'],
  ['Estado', 'Todos'],
  ['Usuario', 'Todos'],
  ['Rango móvil', 'Hoy y mañana'],
  ['Frecuencia objetivo', '30 minutos'],
];

export default async function ConfiguracionPage() {
  await requireRole(['admin']);
  const { rows, lastSyncedAt } = await getSheetsSnapshot();
  const syncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader eyebrow="Configuración" title="Parámetros de la" accent="automatización" />

      <div className="max-w-xl rounded-xl bg-white p-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70">
        <table className="w-full text-sm">
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-100">
                <td className="py-2.5 text-slate-500">{k}</td>
                <td className="py-2.5 text-right font-semibold text-slate-800">{v}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2.5 text-slate-500">Total servicios cargados</td>
              <td className="py-2.5 text-right font-semibold text-slate-800">{rows.length.toLocaleString('es-CO')}</td>
            </tr>
            <tr>
              <td className="py-2.5 text-slate-500">Última sincronización real</td>
              <td className="py-2.5 text-right font-semibold text-slate-800">{syncLabel}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 flex gap-2.5 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
          <span>🔒</span>
          <span>
            Esta página es visible solo para el perfil Administrador. La edición de parámetros en vivo aún no está
            conectada desde este panel — por ahora refleja los valores de la pestaña <b>Configuracion</b> de la hoja
            de monitoreo; los cambios reales se hacen allí.
          </span>
        </div>
      </div>
    </div>
  );
}
