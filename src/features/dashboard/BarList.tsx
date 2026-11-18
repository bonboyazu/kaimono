// 名前・横の棒・回数。グラフのライブラリは使わない
import type { Count } from '../../domain/dashboard.ts';

export default function BarList({ label, rows }: { label: string; rows: Count[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="card">
      <h2>{label}</h2>
      {rows.length === 0 ? (
        <p className="note">まだ記録がありません</p>
      ) : (
        <ul className="bar-list" aria-label={label}>
          {rows.map((r) => (
            <li key={r.name}>
              <span className="bar-name">{r.name}</span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar" style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className="bar-count">{r.count}回</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
