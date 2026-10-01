'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gauge, ClipboardList, Users, Settings, LogOut } from 'lucide-react';
import { logout } from '@/app/login/actions';
import type { Role } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Resumen', icon: Gauge, roles: ['admin', 'supervisor', 'coordinador'] },
  { href: '/dashboard/gestion', label: 'Gestión', icon: ClipboardList, roles: ['admin', 'supervisor'] },
  { href: '/dashboard/gestores', label: 'Seguimiento gestores', icon: Users, roles: ['admin', 'supervisor'] },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings, roles: ['admin'] },
] as const;

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-none flex-col bg-blue-950 text-white">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-blue-400" />
          QUICK
        </div>
        <p className="text-xs text-blue-300/80 leading-tight mt-0.5">Centro de Operaciones</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.filter((item) => (item.roles as readonly string[]).includes(role)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white text-blue-900' : 'text-blue-100 hover:bg-blue-900/60'
              }`}
            >
              <Icon size={17} strokeWidth={2.2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-blue-900 px-4 py-4">
        <p className="text-sm font-semibold">{ROLE_LABEL[role]}</p>
        <p className="text-xs text-blue-300/80 mb-3">Sesión activa</p>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg border border-blue-800 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:bg-blue-900"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
