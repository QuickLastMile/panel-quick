'use client';

import { useActionState } from 'react';
import { login } from './actions';

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="admin / supervisor / coordinador"
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
      </div>
      {state?.error && (
        <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-gradient-gold px-4 py-2.5 text-sm font-bold text-[#141008] transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_18px_rgba(214,164,25,0.3)] active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
