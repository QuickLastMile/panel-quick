import { getSheetsSnapshot } from '@/lib/sheets';
import { getProyectoBaseRows, getColaboradorBaseRows } from '@/lib/base';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import ConfigTabs from '@/components/config-tabs';
import BaseClient from './base-client';

// Ver dashboard/page.tsx: getSheetsSnapshot() puede tardar 25-30s con la
// tabla actual — sin esto, Vercel corta la función y la página queda vacía.
export const maxDuration = 60;

export default async function BaseConfigPage() {
  await requireRole(['admin']);

  const [{ rows }, proyectoRows, colaboradorRows] = await Promise.all([
    getSheetsSnapshot(),
    getProyectoBaseRows(),
    getColaboradorBaseRows(),
  ]);

  // "Sin clasificar": emails y usuarios de asignación que la fórmula de
  // Datos_Actuales no encontró en BASE (cayó en el "nn"/"OTRO" por
  // defecto) — así sabes qué falta agregar sin tener que ir al Sheet.
  const emailCounts = new Map<string, number>();
  const colaboradorCounts = new Map<string, number>();
  rows.forEach((r) => {
    if (r.jefatura.trim().toLowerCase() === 'nn' && r.email.trim()) {
      const key = r.email.trim();
      emailCounts.set(key, (emailCounts.get(key) || 0) + 1);
    }
    if (r.gestor.trim().toUpperCase() === 'OTRO' && r.usuarioAsignacion.trim()) {
      const key = r.usuarioAsignacion.trim();
      colaboradorCounts.set(key, (colaboradorCounts.get(key) || 0) + 1);
    }
  });

  const emailsSinClasificar = Array.from(emailCounts.entries())
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count);
  const colaboradoresSinClasificar = Array.from(colaboradorCounts.entries())
    .map(([colaboradorData, count]) => ({ colaboradorData, count }))
    .sort((a, b) => b.count - a.count);

  // Valores ya usados — para que Jefatura/Gestor se puedan elegir de una
  // lista (evita typos y duplicados tipo "Giovanny-John" vs
  // "GIOVANNY - JOHN") sin perder la posibilidad de escribir uno nuevo.
  const jefaturasExistentes = Array.from(new Set(proyectoRows.map((r) => r.jefatura).filter(Boolean))).sort();
  const gestoresExistentes = Array.from(new Set(colaboradorRows.map((r) => r.colaborador).filter(Boolean))).sort();

  return (
    <div>
      <PageHeader eyebrow="Configuración" title="Base de" accent="cruce (PROYECTO / GESTOR)" />
      <ConfigTabs />

      <div className="mb-5 flex gap-2.5 rounded-lg bg-[var(--accent-soft)] p-3 text-xs text-[var(--accent-bright)]">
        <span>🔗</span>
        <span>
          Esta es <b>BASE</b> — lo que edites acá se refleja de inmediato en todo lo que se calcula con PROYECTO, JEFATURA,
          GESTOR, CARGO GESTOR y TIPO ASIGNADOR. Vive en la base de datos, no en Google Sheets.
        </span>
      </div>

      <BaseClient
        proyectoRows={proyectoRows}
        colaboradorRows={colaboradorRows}
        emailsSinClasificar={emailsSinClasificar}
        colaboradoresSinClasificar={colaboradoresSinClasificar}
        jefaturasExistentes={jefaturasExistentes}
        gestoresExistentes={gestoresExistentes}
      />
    </div>
  );
}
