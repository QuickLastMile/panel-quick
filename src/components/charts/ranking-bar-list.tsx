export default function RankingBarList({
  items,
  color = '#2a78d6',
}: {
  items: { key: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="grid grid-cols-[140px_1fr_42px] items-center gap-3">
          <span className="truncate text-xs font-medium text-slate-600" title={item.key}>
            {item.key}
          </span>
          <div className="h-4 overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded"
              style={{ width: `${(item.count / max) * 100}%`, background: color }}
              title={`${item.key}: ${item.count}`}
            />
          </div>
          <span className="text-right text-xs tabular-nums text-slate-500">{item.count.toLocaleString('es-CO')}</span>
        </div>
      ))}
    </div>
  );
}
