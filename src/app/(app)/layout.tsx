import { redirect } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { getSessionRole } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole();
  if (!role) redirect('/login');

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar role={role} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-8 py-7">{children}</div>
      </main>
    </div>
  );
}
