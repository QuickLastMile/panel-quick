// Constantes compartidas entre el server (colaboradores.ts) y el cliente
// (formularios) — en un archivo aparte, sin depender de 'pg', para que
// importarlas desde un componente 'use client' no arrastre el driver de
// Postgres al bundle del navegador.
export const TIPOS_IDENTIFICACION = ['CC', 'PPT', 'CE', 'TI', 'PET', 'PA', 'DNI', 'CD'] as const;
export const TIPOS_VEHICULO = ['Moto', 'Carry', 'Bici', 'NHR', 'A pie', 'Auxiliar'] as const;
export const MEDIOS_VINCULACION = ['Referido', 'trabajo de campo', 'redes sociales', 'Approval'] as const;

// Capitales de departamento + municipios grandes donde opera Quick — lista
// de sugerencia (datalist), no restrictiva: siempre se puede escribir una
// ciudad que no esté acá.
export const CIUDADES_COLOMBIA = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Soledad', 'Ibagué', 'Bucaramanga',
  'Soacha', 'Santa Marta', 'Villavicencio', 'Valledupar', 'Bello', 'Pereira', 'Montería', 'Pasto', 'Manizales',
  'Neiva', 'Palmira', 'Buenaventura', 'Itagüí', 'Armenia', 'Sincelejo', 'Popayán', 'Floridablanca', 'Envigado',
  'Tuluá', 'Dosquebradas', 'Barrancabermeja', 'Cartago', 'Tunja', 'Girón', 'Florencia', 'Apartadó', 'Turbo',
  'Magangué', 'Piedecuesta', 'Maicao', 'Quibdó', 'Ciénaga', 'Girardot', 'Yopal', 'Rionegro', 'Sogamoso',
  'Fusagasugá', 'Duitama', 'Zipaquirá', 'Chía', 'Ipiales', 'Caucasia', 'Riohacha', 'Facatativá', 'Lorica',
  'Tumaco', 'Arauca', 'Mocoa', 'San Andrés', 'Leticia', 'Puerto Carreño', 'Inírida', 'Mitú', 'San José del Guaviare',
].sort((a, b) => a.localeCompare(b, 'es'));
