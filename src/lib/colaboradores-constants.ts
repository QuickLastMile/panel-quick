// Constantes compartidas entre el server (colaboradores.ts) y el cliente
// (formularios) — en un archivo aparte, sin depender de 'pg', para que
// importarlas desde un componente 'use client' no arrastre el driver de
// Postgres al bundle del navegador.
// Todo en mayúsculas — mismo criterio que el resto de Vinculación.
export const TIPOS_IDENTIFICACION = ['CC', 'PPT', 'CE', 'TI', 'PET', 'PA', 'DNI', 'CD'] as const;
export const TIPOS_VEHICULO = ['MOTO', 'CARRY', 'BICI', 'NHR', 'A PIE', 'AUXILIAR'] as const;
export const MEDIOS_VINCULACION = ['REFERIDO', 'TRABAJO DE CAMPO', 'REDES SOCIALES', 'APPROVAL'] as const;

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
]
  .map((c) => c.toUpperCase())
  .sort((a, b) => a.localeCompare(b, 'es'));
