import { getSheetsSnapshot } from '@/lib/sheets';
import { getRangoConfig } from '@/lib/configuracion';
import { requireRole } from '@/lib/session';
import { formatBogotaDateTime } from '@/lib/date-filter';
import PageHeader from '@/components/page-header';
import ConfigTabs from '@/components/config-tabs';
import RangoEditor from './rango-editor';
import RefreshButton from './refresh-button';

// El botón "Actualizar ahora" consulta bi_smart y sube el resultado a
// Supabase — con el límite por defecto (10s en plan Hobby) Vercel corta la
// función a medias y el botón se queda pegado en "Actualizando...".
export const maxDuration = 60;

export default async function ConfiguracionPage() {
  const role = await requireRole(['admin']);
  const { rows, lastSyncedAt } = await getSheetsSnapshot();
  const rango = await getRangoConfig();
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader eyebrow="Configuración" title="Parámetros de la" accent="automatización" />
        <div className="mb-6">
          <RefreshButton />
        </div>
      </div>
      <ConfigTabs />

      <div className="panel-card max-w-xl rounded-xl p-5">
        <table className="w-full text-sm">
          <tbody>
            <RangoEditor rango={rango} canEdit={role === 'admin'} />
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
            programada (cada 10 min), directo desde la base de datos — sin necesidad de tocar código ni abrir Google Sheets.
          </span>
        </div>
      </div>
    </div>
  );
}
