export default function PageHeader({
  eyebrow,
  title,
  accent,
  asOf,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  asOf?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-slate-900">
          {title} <span className="text-blue-700">{accent}</span>
        </h1>
      </div>
      {asOf && (
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
          Datos al corte de <b className="text-slate-800">{asOf}</b>
        </span>
      )}
    </div>
  );
}
