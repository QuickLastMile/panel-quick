import { redirect } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import GlobalSearch from '@/components/global-search';
import { getSession } from '@/lib/session';

// GlobalSearch (abajo) llama searchServicios() (search-actions.ts), que usa
// getSheetsSnapshot() — puede tardar 25-30s con la tabla actual. Se declara
// acá (el layout compartido de todas las páginas) para que la búsqueda no
// se corte sin importar en qué página se dispare.
export const maxDuration = 60;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar role={session.role} nombre={session.nombre} email={session.email} />
      <main className="flex-1 overflow-x-hidden">
        <GlobalSearch />
        <div className="mx-auto max-w-7xl px-8 py-7 animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}
