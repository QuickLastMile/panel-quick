export default function RankingBarList({
  items,
  color,
}: {
  items: { key: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="grid grid-cols-[140px_1fr_42px] items-center gap-3">
          <span className="truncate text-xs font-medium text-[var(--text-secondary)]" title={item.key}>
            {item.key}
          </span>
          <div className="h-4 overflow-hidden rounded bg-[var(--surface-sunken)]">
            <div
              className={`h-full rounded transition-[filter] duration-150 hover:brightness-110 ${!color ? 'animate-grow-width bg-gradient-gold' : 'animate-grow-width'}`}
              style={{ width: `${(item.count / max) * 100}%`, background: color }}
              title={`${item.key}: ${item.count}`}
            />
          </div>
          <span className="text-right text-xs tabular-nums text-[var(--text-secondary)]">{item.count.toLocaleString('es-CO')}</span>
        </div>
      ))}
    </div>
  );
}
