import { getSheetsSnapshot } from '@/lib/sheets';
import { getConfiguracionRows, getRangoConfig } from '@/lib/configuracion';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import ConfigTabs from '@/components/config-tabs';
import RangoEditor from './rango-editor';

// Estas dos viven en su propia fila editable (RangoEditor) — no se
// duplican en la tabla informativa de abajo.
const HIDDEN_LABELS = new Set(['Días hacia atrás', 'Días hacia adelante']);

export default async function ConfiguracionPage() {
  const role = await requireRole(['admin']);
  const { rows, lastSyncedAt } = await getSheetsSnapshot();
  const [configRows, rango] = await Promise.all([getConfiguracionRows(), getRangoConfig()]);
  const syncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader eyebrow="Configuración" title="Parámetros de la" accent="automatización" />
      <ConfigTabs />

      <div className="panel-card max-w-xl rounded-xl p-5">
        <table className="w-full text-sm">
          <tbody>
            <RangoEditor rango={rango} canEdit={role === 'admin'} />
            {configRows
              .filter((r) => !HIDDEN_LABELS.has(r.parametro))
              .map((r) => (
                <tr key={r.parametro} className="border-b border-[var(--border)]">
                  <td className="py-2.5 text-[var(--text-secondary)]">{r.parametro}</td>
                  <td className="py-2.5 text-right font-semibold text-[var(--text)]">{r.valor}</td>
                </tr>
              ))}
            <tr className="border-b border-[var(--border)]">
              <td className="py-2.5 text-[var(--text-secondary)]">Total servicios cargados</td>
              <td className="py-2.5 text-right font-semibold text-[var(--text)]">{rows.length.toLocaleString('es-CO')}</td>
            </tr>
            <tr>
              <td className="py-2.5 text-[var(--text-secondary)]">Última sincronización real</td>
              <td className="py-2.5 text-right font-semibold text-[var(--text)]">{syncLabel}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 flex gap-2.5 rounded-lg bg-[var(--accent-soft)] p-3 text-xs text-[var(--accent-bright)]">
          <span>🔒</span>
          <span>
            El <b>rango de descarga</b> ya está conectado en vivo: lo que cambies acá lo lee la automatización en su próxima corrida
            programada (cada 30 min), directo desde la pestaña <b>Configuracion</b> del Sheet — sin necesidad de tocar código. Los demás
            parámetros de esta lista son solo informativos por ahora.
          </span>
        </div>
      </div>
    </div>
  );
}
