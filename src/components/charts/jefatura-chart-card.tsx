'use client';

import ChartCard from './chart-card';
import JefaturaChart from './jefatura-chart';
import type { DiaJefaturaPoint } from '@/lib/aggregate';

// Envuelve ChartCard + JefaturaChart en un solo Client Component: pasar una
// función como children de ChartCard solo es válido si quien la crea ya es
// cliente — hecho desde un Server Component (la página), React la rechaza
// ("Functions are not valid as a child of Client Components").
export default function JefaturaChartCard({
  porJefatura,
  diaJefatura,
  description,
}: {
  porJefatura: { key: string; count: number }[];
  diaJefatura: DiaJefaturaPoint[];
  description: string;
}) {
  return (
    <ChartCard title="Servicios por jefatura" description={description} className="mb-5">
      {(expanded) => <JefaturaChart porJefatura={porJefatura} diaJefatura={diaJefatura} showFilter={expanded} />}
    </ChartCard>
  );
}
