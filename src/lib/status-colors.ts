// Paleta categórica validada (6 estados, distinguible para daltonismo,
// etiquetas de texto siempre visibles) — la misma usada en el dashboard
// anterior, reutilizada aquí.
export const STATUS_ORDER = ['Asignado', 'En Espera', 'En Tránsito', 'Relanzado', 'Finalizado', 'Cancelado'] as const;

export const STATUS_COLOR: Record<string, string> = {
  'Asignado': '#2a78d6',
  'En Espera': '#eb6834',
  'En Tránsito': '#1baf7a',
  'Relanzado': '#b8860b',
  'Finalizado': '#008300',
  'Cancelado': '#e34948',
};

export const STATUS_SOFT_BG: Record<string, string> = {
  'Asignado': '#e9f1fb',
  'En Espera': '#fdeee7',
  'En Tránsito': '#e7f8f1',
  'Relanzado': '#fbf1dc',
  'Finalizado': '#e6f3e6',
  'Cancelado': '#fbe9e9',
};
