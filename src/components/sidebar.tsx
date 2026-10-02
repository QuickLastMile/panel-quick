'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gauge, ClipboardList, Users, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { logout } from '@/app/login/actions';
import type { Role } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Resumen', icon: Gauge, roles: ['admin', 'supervisor', 'coordinador'] },
  { href: '/dashboard/gestion', label: 'Gestión', icon: ClipboardList, roles: ['admin', 'supervisor'] },
  { href: '/dashboard/gestores', label: 'Seguimiento gestores', icon: Users, roles: ['admin', 'supervisor'] },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings, roles: ['admin'] },
] as const;

const COLLAPSE_KEY = 'quick-sidebar-collapsed';

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  const items = NAV.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-none flex-col border-r border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--text)] transition-[width] duration-200 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className={`relative flex items-center gap-2.5 px-5 pt-6 pb-5 ${collapsed ? 'justify-center px-0' : ''}`}>
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-gold text-sm font-black text-[#141008] shadow-[0_0_16px_rgba(214,164,25,0.25)]">
          Q
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight">QUICK</p>
            <p className="truncate text-[11px] leading-tight text-[var(--text-muted)]">Centro de Operaciones</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                active
                  ? 'bg-gradient-gold text-[#141008] shadow-[0_0_18px_rgba(214,164,25,0.22)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
              }`}
            >
              <Icon size={17} strokeWidth={2.2} className="flex-none transition-transform duration-150 group-hover:scale-110" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-20">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <button
          onClick={toggle}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] ${
            collapsed ? 'justify-center' : ''
          }`}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && 'Contraer'}
        </button>
      </div>

      <div className={`border-t border-[var(--border)] px-4 py-4 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed && (
          <>
            <p className="truncate text-sm font-semibold">{ROLE_LABEL[role]}</p>
            <p className="mb-3 text-xs text-[var(--text-muted)]">Sesión activa</p>
          </>
        )}
        <form action={logout}>
          <button
            type="submit"
            title={collapsed ? 'Cerrar sesión' : undefined}
            className={`flex w-full items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={14} />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </form>
      </div>
    </aside>
  );
}
