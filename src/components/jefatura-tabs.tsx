'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function JefaturaTabs({ jefaturas, selected }: { jefaturas: string[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!jefaturas.length) return null;

  function select(jefatura: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (jefatura) params.set('jefatura', jefatura);
    else params.delete('jefatura');
    router.push(`${pathname}?${params.toString()}`);
  }

  const options = ['', ...jefaturas];

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {options.map((j) => (
        <button
          key={j || '__todas__'}
          onClick={() => select(j)}
          className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-150 ${
            selected === j
              ? 'border-[var(--accent)] bg-gradient-gold text-[#141008] shadow-[0_0_14px_rgba(214,164,25,0.22)]'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
          }`}
        >
          {j || 'Todas las jefaturas'}
        </button>
      ))}
    </div>
  );
}
