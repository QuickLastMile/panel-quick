'use client';

import { useMemo } from 'react';
import MultiBarTrendChart from './multi-bar-trend-chart';
import type { MesTipoPoint } from '@/lib/aggregate';

// Mismas 5 categorías de CARGO que BASE (ver panel-quick/src/lib/base.ts) —
// todas en mayúscula, tal cual vienen de ahí, sin re-etiquetar (antes
// "Agilizador" salía en minúscula/mixto mientras el resto quedaba en
// mayúscula, por tener solo esta categoría mapeada a una label distinta).
const TIPO_COLOR: Record<string, string> = {
  AGILIZADOR: '#f3c94f',
  ADMINISTRATIVO: '#4f9df5',
  SUPERVISOR: '#9b6fe0',
  VACACIONES: '#3ab795',
  'AGILIZADOR NO ASIGNADO': '#8a8a8a',
};
const TIPO_ORDER = ['AGILIZADOR', 'ADMINISTRATIVO', 'SUPERVISOR', 'VACACIONES', 'AGILIZADOR NO ASIGNADO'];

export default function AsignadorMesChart({ mesTipo }: { mesTipo: MesTipoPoint[] }) {
  const series = useMemo(() => {
    const meses = Array.from(new Set(mesTipo.map((p) => p.mes))).sort();
    const mesLabels = new Map(mesTipo.map((p) => [p.mes, p.mesLabel]));
    const tiposPresentes = TIPO_ORDER.filter((tipo) => mesTipo.some((p) => p.tipo === tipo));
    return tiposPresentes.map((tipo) => {
      const byMes: Record<string, number> = {};
      mesTipo.forEach((p) => {
        if (p.tipo === tipo) byMes[p.mes] = (byMes[p.mes] || 0) + p.count;
      });
      return {
        key: tipo,
        label: tipo,
        color: TIPO_COLOR[tipo] || '#8a8a8a',
        points: meses.map((m) => ({ label: mesLabels.get(m) || m, value: byMes[m] || 0 })),
      };
    });
  }, [mesTipo]);

  return <MultiBarTrendChart series={series} emptyMessage="Aún no hay histórico suficiente para mostrar tendencia mensual." />;
}
