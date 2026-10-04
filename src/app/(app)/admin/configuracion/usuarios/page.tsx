import { getUsuarios } from '@/lib/usuarios';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import ConfigTabs from '@/components/config-tabs';
import UsuariosClient from './usuarios-client';

export default async function UsuariosPage() {
  await requireRole(['admin']);
  const usuarios = await getUsuarios();

  return (
    <div>
      <PageHeader eyebrow="Configuración" title="Cuentas de" accent="usuario" />
      <ConfigTabs />
      <UsuariosClient usuarios={usuarios} />
    </div>
  );
}
