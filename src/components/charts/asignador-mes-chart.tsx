'use client';

import { useMemo } from 'react';
import MultiBarTrendChart from './multi-bar-trend-chart';
import type { MesTipoPoint } from '@/lib/aggregate';

const TIPO_COLOR: Record<string, string> = {
  AGILIZADOR: '#f3c94f',
  COORDINADOR: '#4f9df5',
  OTRO: '#8a8a8a',
};
const TIPO_LABEL: Record<string, string> = {
  AGILIZADOR: 'Agilizador',
  COORDINADOR: 'Administrativo',
  OTRO: 'Otro / externo',
};
const TIPO_ORDER = ['AGILIZADOR', 'COORDINADOR', 'OTRO'];

export default function AsignadorMesChart({ mesTipo }: { mesTipo: MesTipoPoint[] }) {
  const series = useMemo(() => {
    const meses = Array.from(new Set(mesTipo.map((p) => p.mes))).sort();
    const mesLabels = new Map(mesTipo.map((p) => [p.mes, p.mesLabel]));
    return TIPO_ORDER.map((tipo) => {
      const byMes: Record<string, number> = {};
      mesTipo.forEach((p) => {
        if (p.tipo === tipo) byMes[p.mes] = (byMes[p.mes] || 0) + p.count;
      });
      return {
        key: tipo,
        label: TIPO_LABEL[tipo] || tipo,
        color: TIPO_COLOR[tipo] || '#8a8a8a',
        points: meses.map((m) => ({ label: mesLabels.get(m) || m, value: byMes[m] || 0 })),
      };
    });
  }, [mesTipo]);

  return <MultiBarTrendChart series={series} emptyMessage="Aún no hay histórico suficiente para mostrar tendencia mensual." />;
}
