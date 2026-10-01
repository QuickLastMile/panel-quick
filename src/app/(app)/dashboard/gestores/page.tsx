import { getServiceRows } from '@/lib/sheets';
import { buildDashboardData } from '@/lib/aggregate';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import RankingBarList from '@/components/charts/ranking-bar-list';

export default async function GestoresPage() {
  await requireRole(['admin', 'supervisor']);
  const rows = await getServiceRows();
  const data = buildDashboardData(rows);
  const asOf = new Date(data.generadoEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div>
      <PageHeader eyebrow="Seguimiento" title="Productividad por" accent="gestor" asOf={asOf} />

      <div className="mb-5 rounded-xl bg-white p-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70">
        <h2 className="text-sm font-bold text-slate-800">Servicios por gestor</h2>
        <p className="mb-4 text-xs text-slate-400">Volumen total gestionado — todos los estados (excluye &quot;OTRO&quot;)</p>
        <RankingBarList items={data.gestorStats.map((g) => ({ key: g.gestor, count: g.total }))} color="#2563eb" />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70">
        <h2 className="text-sm font-bold text-slate-800">Productividad por gestor</h2>
        <p className="mb-4 text-xs text-slate-400">% cumplimiento = finalizados / total de servicios del gestor</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr>
                {['Gestor', 'Cargo', 'Total', 'Finalizado', 'Cancelado', 'En proceso', 'Cumplimiento'].map((h) => (
                  <th key={h} className="border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.gestorStats.map((g) => (
                <tr key={g.gestor} className="border-b border-slate-50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-800">{g.gestor}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{g.cargo || '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-500">{g.total.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-500">{g.finalizado.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-500">{g.cancelado.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-500">{g.enProceso.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-green-600" style={{ width: `${Math.min(g.cumplimientoPct, 100)}%` }} />
                      </div>
                      <span className="tabular-nums text-slate-600">{g.cumplimientoPct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
