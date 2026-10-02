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
        <p className="text-xs font-bold tracking-wide text-[var(--accent-bright)] uppercase">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-[var(--text)]">
          {title} <span className="text-gradient-gold">{accent}</span>
        </h1>
      </div>
      {asOf && (
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
          Datos al corte de <b className="text-[var(--text)]">{asOf}</b>
        </span>
      )}
    </div>
  );
}
