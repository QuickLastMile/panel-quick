// Tipos puros — sin googleapis — para que los componentes cliente los
// puedan importar sin arrastrar código solo-de-servidor al navegador.
import type { Role } from './auth';

export type Usuario = {
  email: string;
  nombre: string;
  rol: Role;
  activo: boolean;
  creadoEn: string;
};
