// Tipos puros — sin googleapis — para que los componentes cliente los
// puedan importar sin arrastrar código solo-de-servidor al navegador.

export type RangoConfig = {
  diasAtras: number;
  diasAdelante: number;
};

export function defaultRangoConfig(): RangoConfig {
  return { diasAtras: 4, diasAdelante: 8 };
}

export const RANGO_MAX_DIAS = 30;
