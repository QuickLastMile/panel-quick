'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, EyeOff, X, ShieldCheck, ShieldOff } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Usuario } from '@/lib/usuarios-types';
import { ROLE_LABEL, type Role } from '@/lib/auth';
import { createUsuarioAction, toggleUsuarioActivoAction } from './actions';

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]';
const labelCls = 'mb-1 block text-xs font-semibold text-[var(--text-secondary)]';

function NewUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rol, setRol] = useState<Role>('coordinador');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Ingresa un correo válido.');
      return;
    }
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await createUsuarioAction({ email, nombre, password, rol });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    setEmail('');
    setNombre('');
    setPassword('');
    setRol('coordinador');
    onClose();
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
          <h2 className="text-sm font-bold text-[var(--text)]">Nuevo usuario</h2>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className={labelCls}>Correo *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="nombre@quick.com.co"
            />
          </div>
          <div>
            <label className={labelCls}>Nombre *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Nombre completo" />
          </div>
          <div>
            <label className={labelCls}>Contraseña *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pr-10`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-muted)] transition-colors hover:text-[var(--accent-bright)]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Rol *</label>
            <select value={rol} onChange={(e) => setRol(e.target.value as Role)} className={inputCls}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              type="button"
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}

export default function UsuariosClient({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [togglingEmail, setTogglingEmail] = useState<string | null>(null);

  async function handleToggle(u: Usuario) {
    setTogglingEmail(u.email);
    await toggleUsuarioActivoAction(u.email, !u.activo);
    setTogglingEmail(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          {usuarios.length} usuario{usuarios.length === 1 ? '' : 's'} — el login ahora es por correo, no por rol compartido.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      <div className="panel-card overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Correo', 'Nombre', 'Rol', 'Estado', 'Creado', ''].map((h) => (
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
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)]">
                  Sin usuarios aún.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.email} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-[var(--text)]">{u.email}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{u.nombre}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{ROLE_LABEL[u.rol]}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        u.activo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">
                    {u.creadoEn ? new Date(u.creadoEn).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={togglingEmail === u.email}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-bright)] disabled:opacity-50"
                    >
                      {u.activo ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NewUserModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
