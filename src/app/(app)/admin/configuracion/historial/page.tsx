import { ExternalLink, CheckCircle2, XCircle, CircleDashed, Loader2 } from 'lucide-react';
import { requireRole } from '@/lib/session';
import { getRunsSnapshot, normalizeStatus } from '@/lib/github-runs';
import PageHeader from '@/components/page-header';
import ConfigTabs from '@/components/config-tabs';

const EVENT_LABEL: Record<string, string> = {
  schedule: 'Programada',
  workflow_dispatch: 'Manual',
};

const STATUS_META = {
  success: { label: 'Exitosa', color: '#1baf7a', icon: CheckCircle2 },
  failure: { label: 'Fallida', color: '#e34948', icon: XCircle },
  cancelled: { label: 'Cancelada', color: '#8a8a8a', icon: CircleDashed },
  in_progress: { label: 'En curso', color: '#f3c94f', icon: Loader2 },
  other: { label: 'Desconocida', color: '#8a8a8a', icon: CircleDashed },
} as const;

export default async function HistorialPage() {
  await requireRole(['admin']);

  let errorMsg: string | null = null;
  let snapshot: Awaited<ReturnType<typeof getRunsSnapshot>> | null = null;
  try {
    snapshot = await getRunsSnapshot();
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'No se pudo cargar el historial.';
  }

  return (
    <div>
      <PageHeader eyebrow="Configuración" title="Historial de" accent="automatización" />
      <ConfigTabs />

      {errorMsg && (
        <div className="panel-card mb-5 rounded-xl p-5 text-sm text-red-300">
          No se pudo cargar el historial de corridas: {errorMsg}
        </div>
      )}

      {snapshot && (
        <>
          <div
            className={`mb-5 flex items-center gap-3 rounded-xl p-4 text-sm font-semibold ${
              snapshot.consecutiveFailures > 0
                ? 'border border-red-900/40 bg-red-950/30 text-red-300'
                : 'border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent-bright)]'
            }`}
          >
            {snapshot.consecutiveFailures > 0 ? (
              <>
                <XCircle size={18} className="flex-none" />
                <span>
                  Fallando desde{' '}
                  <b>
                    {snapshot.failingSince
                      ? new Date(snapshot.failingSince).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </b>{' '}
                  — {snapshot.consecutiveFailures} corrida{snapshot.consecutiveFailures === 1 ? '' : 's'} seguida
                  {snapshot.consecutiveFailures === 1 ? '' : 's'} sin éxito. Puede que la sesión de Quick haya expirado
                  — repite <code>export-session.mjs</code>.
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} className="flex-none" />
                <span>Funcionando bien — la corrida más reciente fue exitosa.</span>
              </>
            )}
          </div>

          <div className="panel-card overflow-hidden rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Fecha', 'Hora', 'Disparador', 'Resultado', ''].map((h) => (
                    <th
                      key={h}
                      className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[var(--text-muted)]">
                      Sin corridas registradas aún.
                    </td>
                  </tr>
                ) : (
                  snapshot.runs.map((run) => {
                    const st = normalizeStatus(run);
                    const meta = STATUS_META[st];
                    const Icon = meta.icon;
                    const created = new Date(run.createdAt);
                    return (
                      <tr key={run.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                        <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-[var(--text)]">
                          {created.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--text-secondary)]">
                          {created.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">
                          {EVENT_LABEL[run.event] || run.event}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{ background: `${meta.color}2e`, color: meta.color }}
                          >
                            <Icon size={12} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <a
                            href={run.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-bright)] hover:underline"
                          >
                            Ver log <ExternalLink size={12} />
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
