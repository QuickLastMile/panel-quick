'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/configuracion', label: 'General' },
  { href: '/admin/configuracion/historial', label: 'Historial de automatización' },
  { href: '/admin/configuracion/usuarios', label: 'Usuarios' },
];

export default function ConfigTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-150 ${
              active
                ? 'border-[var(--accent)] bg-gradient-gold text-[#141008] shadow-[0_0_14px_rgba(214,164,25,0.22)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
