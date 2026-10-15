'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Plus, X, AlertTriangle } from 'lucide-react';
import type { ProyectoBaseRow, ColaboradorBaseRow } from '@/lib/base';
import { saveProyecto, saveColaborador } from './actions';

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]';
const labelCls = 'mb-1 block text-xs font-semibold text-[var(--text-secondary)]';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
          <h2 className="text-sm font-bold text-[var(--text)]">{title}</h2>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body
  );
}

function ProyectoForm({ initial, onClose }: { initial: Partial<ProyectoBaseRow>; onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState(initial.email || '');
  const [nombre, setNombre] = useState(initial.nombre || '');
  const [proceso, setProceso] = useState(initial.proceso || '');
  const [jefatura, setJefatura] = useState(initial.jefatura || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Ingresa un correo válido.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await saveProyecto({ rowNumber: initial.rowNumber, email, nombre, proceso, jefatura });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div>
        <label className={labelCls}>Email del solicitante *</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="nombre@cliente.com" />
      </div>
      <div>
        <label className={labelCls}>Nombre (proyecto, visible)</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Ej. Cafam Bogota" />
      </div>
      <div>
        <label className={labelCls}>Proyecto (PROCESO)</label>
        <input value={proceso} onChange={(e) => setProceso(e.target.value)} className={inputCls} placeholder="Ej. CAFAM COMERCIAL BOGOTA" />
      </div>
      <div>
        <label className={labelCls}>Jefatura</label>
        <input value={jefatura} onChange={(e) => setJefatura(e.target.value)} className={inputCls} placeholder="Ej. GIOVANNY - JOHN" />
      </div>
      {error && <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onClose} type="button" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

function ColaboradorForm({ initial, onClose }: { initial: Partial<ColaboradorBaseRow>; onClose: () => void }) {
  const router = useRouter();
  const [colaboradorData, setColaboradorData] = useState(initial.colaboradorData || '');
  const [cargo, setCargo] = useState(initial.cargo || '');
  const [ext, setExt] = useState(initial.ext || '');
  const [colaborador, setColaborador] = useState(initial.colaborador || '');
  const [tipo, setTipo] = useState(initial.tipo || 'AGILIZADOR');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!colaboradorData.trim()) {
      setError('El dato de colaborador ("ID-Nombre") es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await saveColaborador({ rowNumber: initial.rowNumber, colaboradorData, cargo, ext, colaborador, tipo });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div>
        <label className={labelCls}>Colaborador (ID-Nombre) *</label>
        <input
          value={colaboradorData}
          onChange={(e) => setColaboradorData(e.target.value)}
          className={inputCls}
          placeholder="Ej. 455892-Miguel Angel Pirateque Lozano"
          disabled={!!initial.rowNumber}
        />
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          Tal cual aparece en "Usuario Asignación" — cópialo de la lista de "Sin clasificar" para no equivocarte.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Cargo</label>
          <input value={cargo} onChange={(e) => setCargo(e.target.value)} className={inputCls} placeholder="Ej. AGILIZADOR" />
        </div>
        <div>
          <label className={labelCls}>Extensión</label>
          <input value={ext} onChange={(e) => setExt(e.target.value)} className={inputCls} placeholder="Ej. 3033" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Nombre del colaborador</label>
        <input value={colaborador} onChange={(e) => setColaborador(e.target.value)} className={inputCls} placeholder="Nombre completo" />
      </div>
      <div>
        <label className={labelCls}>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
          <option value="AGILIZADOR">AGILIZADOR</option>
          <option value="OTRO">OTRO</option>
        </select>
      </div>
      {error && <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onClose} type="button" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

export default function BaseClient({
  proyectoRows,
  colaboradorRows,
  emailsSinClasificar,
  colaboradoresSinClasificar,
}: {
  proyectoRows: ProyectoBaseRow[];
  colaboradorRows: ColaboradorBaseRow[];
  emailsSinClasificar: { email: string; count: number }[];
  colaboradoresSinClasificar: { colaboradorData: string; count: number }[];
}) {
  const [tab, setTab] = useState<'proyecto' | 'colaborador'>('proyecto');
  const [search, setSearch] = useState('');
  const [proyectoModal, setProyectoModal] = useState<Partial<ProyectoBaseRow> | null>(null);
  const [colaboradorModal, setColaboradorModal] = useState<Partial<ColaboradorBaseRow> | null>(null);

  const filteredProyectos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return proyectoRows;
    return proyectoRows.filter((r) => `${r.email} ${r.nombre} ${r.proceso} ${r.jefatura}`.toLowerCase().includes(q));
  }, [proyectoRows, search]);

  const filteredColaboradores = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colaboradorRows;
    return colaboradorRows.filter((r) => `${r.colaboradorData} ${r.cargo} ${r.colaborador} ${r.tipo}`.toLowerCase().includes(q));
  }, [colaboradorRows, search]);

  return (
    <div>
      <div className="mb-5 flex items-center gap-1 rounded-lg bg-[var(--surface-sunken)] p-1 w-fit">
        <button
          onClick={() => setTab('proyecto')}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
            tab === 'proyecto' ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Proyecto / Jefatura (por Email)
        </button>
        <button
          onClick={() => setTab('colaborador')}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
            tab === 'colaborador' ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Gestor / Cargo (por Usuario Asignación)
        </button>
      </div>

      {tab === 'proyecto' && (
        <>
          {emailsSinClasificar.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <AlertTriangle size={14} /> {emailsSinClasificar.length} correo{emailsSinClasificar.length === 1 ? '' : 's'} sin clasificar
                (cayeron en "nn")
              </p>
              <div className="flex flex-wrap gap-1.5">
                {emailsSinClasificar.map((e) => (
                  <button
                    key={e.email}
                    onClick={() => setProyectoModal({ email: e.email })}
                    className="rounded-full border border-amber-700/40 bg-amber-950/30 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition-colors hover:border-amber-500"
                  >
                    {e.email} ({e.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between gap-2.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email, proyecto, jefatura…"
              className="w-72 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            />
            <button
              onClick={() => setProyectoModal({})}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus size={14} /> Nuevo
            </button>
          </div>

          <div className="panel-card overflow-hidden rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Email', 'Nombre', 'Proyecto', 'Jefatura', ''].map((h) => (
                    <th key={h} className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProyectos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[var(--text-muted)]">Sin resultados.</td>
                  </tr>
                ) : (
                  filteredProyectos.map((r) => (
                    <tr key={r.rowNumber} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                      <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-[var(--text)]">{r.email}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{r.nombre}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{r.proceso}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{r.jefatura}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <button onClick={() => setProyectoModal(r)} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'colaborador' && (
        <>
          {colaboradoresSinClasificar.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <AlertTriangle size={14} /> {colaboradoresSinClasificar.length} colaborador{colaboradoresSinClasificar.length === 1 ? '' : 'es'} sin
                clasificar (cayeron en "OTRO")
              </p>
              <div className="flex flex-wrap gap-1.5">
                {colaboradoresSinClasificar.map((c) => (
                  <button
                    key={c.colaboradorData}
                    onClick={() => setColaboradorModal({ colaboradorData: c.colaboradorData })}
                    className="rounded-full border border-amber-700/40 bg-amber-950/30 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition-colors hover:border-amber-500"
                  >
                    {c.colaboradorData} ({c.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between gap-2.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por colaborador, cargo, tipo…"
              className="w-72 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            />
            <button
              onClick={() => setColaboradorModal({})}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus size={14} /> Nuevo
            </button>
          </div>

          <div className="panel-card overflow-hidden rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Colaborador (ID-Nombre)', 'Cargo', 'Ext.', 'Nombre', 'Tipo', ''].map((h) => (
                    <th key={h} className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredColaboradores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)]">Sin resultados.</td>
                  </tr>
                ) : (
                  filteredColaboradores.map((r) => (
                    <tr key={r.rowNumber} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                      <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-[var(--text)]">{r.colaboradorData}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{r.cargo}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{r.ext}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{r.colaborador}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{r.tipo}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <button onClick={() => setColaboradorModal(r)} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {proyectoModal && (
        <Modal title={proyectoModal.rowNumber ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={() => setProyectoModal(null)}>
          <ProyectoForm initial={proyectoModal} onClose={() => setProyectoModal(null)} />
        </Modal>
      )}
      {colaboradorModal && (
        <Modal title={colaboradorModal.rowNumber ? 'Editar colaborador' : 'Nuevo colaborador'} onClose={() => setColaboradorModal(null)}>
          <ColaboradorForm initial={colaboradorModal} onClose={() => setColaboradorModal(null)} />
        </Modal>
      )}
    </div>
  );
}
