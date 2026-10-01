import { redirect } from 'next/navigation';
import { getSessionRole } from '@/lib/session';

export default async function RootPage() {
  const role = await getSessionRole();
  redirect(role ? '/dashboard' : '/login');
}
