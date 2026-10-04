import { MapPin } from 'lucide-react';
import LoginForm from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg)] px-4">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
      />
      <div className="relative w-full max-w-sm animate-fade-in-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-black/40">
        <div className="mb-6 flex flex-col items-center gap-1.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-lg font-black text-[#141008] shadow-[0_0_22px_rgba(214,164,25,0.3)]">
            Q
          </span>
          <div className="mt-1 flex items-center text-3xl font-black tracking-tight text-[var(--text)]">
            <span>G</span>
            <MapPin size={26} strokeWidth={2.5} className="text-[var(--accent-bright)]" fill="var(--accent-soft)" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Centro de Operaciones</p>
        </div>
        <LoginForm next={next ?? '/dashboard'} />
      </div>
    </main>
  );
}
